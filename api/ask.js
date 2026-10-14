"use strict";

/**
 * POST /api/ask — unmatched Ask-box notes.
 * Same honesty pattern as warobbo/motorhome-payload-calculator
 * `POST /api/missing-size`: one JSON line to stdout (Render logs).
 * Do not invent a tyre pressure, weight or legal answer here.
 */

const net = require("net");
const ask = require("../lib/ask");
const copilot = require("../lib/copilot");

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.end(JSON.stringify(body));
}

// Cloudflare overwrites CF-Connecting-IP with the visitor address. The first
// X-Forwarded-For token is whatever the caller sent, so it is only a fallback.
// Anything that is not one IP shares the socket address, or "anon", instead
// of becoming its own bucket.
function ipToken(value) {
  const first = String(value || "").split(",")[0].trim();
  if (!first || first.length > 64) return "";
  return net.isIP(first) ? first : "";
}

function clientKey(req) {
  const headers = (req && req.headers) || {};
  const cloudflare = ipToken(headers["cf-connecting-ip"]);
  if (cloudflare) return cloudflare;
  const forwarded = ipToken(headers["x-forwarded-for"]);
  if (forwarded) return forwarded;
  const remote = req && req.socket && req.socket.remoteAddress;
  return ipToken(remote) || "anon";
}

function crossSitePost(req) {
  const site = String(req.headers && req.headers["sec-fetch-site"] || "").trim().toLowerCase();
  return site === "cross-site";
}

function rejectIfLimited(req, res) {
  if (ask.allowSubmit(clientKey(req))) return false;
  send(res, 429, {
    ok: false,
    error: "rate",
    message: "Please wait before sending another question."
  });
  return true;
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
    send(res, 200, {
      ok: true,
      mailto: ask.publicNotifyEmail() || null,
      capture: true,
      copilot: "payload"
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "method", message: "Use POST to note a question." });
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (err) {
    if (crossSitePost(req)) {
      send(res, 403, { ok: false, error: "origin", message: "Send that from the site." });
      return;
    }
    if (rejectIfLimited(req, res)) return;
    send(res, err && err.code === "too_large" ? 413 : 400, {
      ok: false,
      error: err && err.code === "too_large" ? "too_large" : "invalid_json",
      message: err && err.code === "too_large" ? "That note is too long." : "Invalid JSON body."
    });
    return;
  }

  const built = ask.buildRecord(body);
  // A filled honeypot is discarded: HTTP 200, no log line, no rate-limit slot.
  if (built.ignored) {
    send(res, 200, { ok: true, ignored: true });
    return;
  }

  // A browser on another site can otherwise spend this visitor's 5 posts.
  // Sec-Fetch-Site is set by the browser. A same-origin Ask post is not cross-site.
  if (crossSitePost(req)) {
    send(res, 403, { ok: false, error: "origin", message: "Send that from the site." });
    return;
  }

  if (rejectIfLimited(req, res)) return;

  if (!built.ok) {
    send(res, 400, { ok: false, error: built.error, message: built.message });
    return;
  }

  const copilotResult = copilot.handleAsk(built.record.question);
  if (copilotResult.handled) {
    send(res, 200, {
      ok: true,
      saved: false,
      copilot: copilot.publicResult(copilotResult)
    });
    return;
  }

  ask.persistRecord(built.record);
  send(res, 200, {
    ok: true,
    saved: true,
    mailto: ask.publicNotifyEmail() || null
  });
}

module.exports = handleAsk;
