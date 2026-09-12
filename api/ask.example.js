"use strict";

/**
 * Example only — not used by the static Render site.
 *
 * The front door POSTs unanswered Ask-box questions to /api/ask.
 * On a static site that path 404s; the browser still stores the note
 * in localStorage and shows “We’ve noted your question.”
 *
 * If you later attach a Node web service (same pattern as
 * warobbo/motorhome-payload-calculator `POST /api/missing-size`),
 * drop this handler in and log one JSON line to stdout (Render logs).
 * Do not invent a tyre pressure, weight or legal answer here.
 */

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readJson(req) {
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
    res.end();
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
    send(res, err && err.code === "too_large" ? 413 : 400, {
      ok: false,
      error: err && err.code === "too_large" ? "too_large" : "invalid_json"
    });
    return;
  }

  const question = String(body.question || "").trim().slice(0, 280);
  if (!question) {
    send(res, 400, { ok: false, error: "empty", message: "Missing question." });
    return;
  }

  const record = {
    at: new Date().toISOString(),
    question: question,
    email: body.email ? String(body.email).slice(0, 200) : null,
    source: "motorhometools-ask"
  };

  console.log(JSON.stringify({ type: "ask", ...record }));
  send(res, 200, { ok: true, saved: true });
}

module.exports = handleAsk;
