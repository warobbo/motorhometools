"use strict";

/**
 * POST /api/ask — unmatched Ask-box notes.
 * Same honesty pattern as warobbo/motorhome-payload-calculator
 * `POST /api/missing-size`: one JSON line to stdout (Render logs).
 * Do not invent a tyre pressure, weight or legal answer here.
 */

const ask = require("../lib/ask");

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.end(JSON.stringify(body));
}

function clientKey(req) {
  const forwarded = String(req.headers && req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || (req.socket && req.socket.remoteAddress) || "anon";
}

async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) {
      const err = new Error("too_large");
      err.code = "too_large";
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleAsk(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  if (req.method === "GET") {
    const email = ask.notifyEmail();
    send(res, 200, {
      ok: true,
      mailto: email || null,
      capture: true
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "method", message: "Use POST to note a question." });
    return;
  }

  if (!ask.allowSubmit(clientKey(req))) {
    send(res, 429, { ok: false, error: "rate", message: "Please wait before sending another question." });
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (err) {
    send(res, err && err.code === "too_large" ? 413 : 400, {
      ok: false,
      error: err && err.code === "too_large" ? "too_large" : "invalid_json",
      message: err && err.code === "too_large" ? "That note is too long." : "Invalid JSON body."
    });
    return;
  }

  const built = ask.buildRecord(body);
  if (!built.ok) {
    send(res, 400, { ok: false, error: built.error, message: built.message });
    return;
  }
  if (built.ignored) {
    send(res, 200, { ok: true, ignored: true });
    return;
  }

  ask.persistRecord(built.record);
  send(res, 200, {
    ok: true,
    saved: true,
    mailto: ask.notifyEmail() || null
  });
}

module.exports = handleAsk;
