"use strict";

/**
 * POST /api/contact — contact-form messages.
 * Same capture as Ask: one JSON line, honeypot discarded, short rate limit.
 */

const net = require("net");
const contact = require("../lib/contact");

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendHtml(res, status, title, message) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const page = [
    "<!DOCTYPE html>",
    "<html lang=\"en-GB\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<meta name=\"robots\" content=\"noindex\">",
    "<title>" + safeTitle + " | Motorhome Tools</title>",
    "<link rel=\"stylesheet\" href=\"/assets/styles.css\">",
    "</head>",
    "<body>",
    "<header class=\"site-header wrap\">",
    "<a class=\"site-brand\" href=\"/\">",
    "<img class=\"site-logo\" src=\"/assets/logo.svg\" width=\"44\" height=\"44\" alt=\"Motorhome Tools\">",
    "<span class=\"eyebrow\">Motorhome Tools</span>",
    "</a>",
    "<h1>" + safeTitle + "</h1>",
    "</header>",
    "<main class=\"site-main wrap legal\">",
    "<p>" + safeMessage + "</p>",
    "<p><a href=\"/contact.html\">Back to the contact form</a></p>",
    "</main>",
    "</body>",
    "</html>"
  ].join("\n");
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(page);
}

function send(req, res, status, body) {
  if (responseFormat(req) === "html") {
    const title = body.ok ? "Message received" : "Message not sent";
    sendHtml(res, status, title, body.message || (body.ok
      ? "We’ve got your message. Motorhome Tools will read it. A reply is not automatic."
      : "That message did not reach us. Please try again in a moment."));
    return;
  }
  sendJson(res, status, body);
}

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

function responseFormat(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return "json";
  const type = String((req.headers && req.headers["content-type"]) || "").toLowerCase();
  if (type.includes("application/json")) return "json";
  if (type.includes("application/x-www-form-urlencoded")) return "html";
  const accept = String((req.headers && req.headers.accept) || "").toLowerCase();
  if (accept.includes("text/html") && !accept.includes("application/json")) return "html";
  return "json";
}

function rejectIfLimited(req, res) {
  if (contact.allowSubmit(clientKey(req))) return false;
  send(req, res, 429, {
    ok: false,
    error: "rate",
    message: "Please wait before sending another message."
  });
  return true;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) {
      const err = new Error("too_large");
      err.code = "too_large";
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const type = String((req.headers && req.headers["content-type"]) || "").toLowerCase();
  if (!raw) return {};
  if (type.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return JSON.parse(raw);
}

async function handleContact(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, { ok: true, capture: true });
    return;
  }

  if (req.method !== "POST") {
    send(req, res, 405, { ok: false, error: "method", message: "Use POST to send a message." });
    return;
  }

  let body = {};
  try {
    body = await readBody(req);
  } catch (err) {
    if (crossSitePost(req)) {
      send(req, res, 403, { ok: false, error: "origin", message: "Send that from the site." });
      return;
    }
    if (rejectIfLimited(req, res)) return;
    send(req, res, err && err.code === "too_large" ? 413 : 400, {
      ok: false,
      error: err && err.code === "too_large" ? "too_large" : "invalid_json",
      message: err && err.code === "too_large" ? "That message is too long." : "That message could not be read."
    });
    return;
  }

  const built = contact.buildRecord(body);
  if (built.ignored) {
    send(req, res, 200, {
      ok: true,
      ignored: true,
      message: "We’ve got your message. Motorhome Tools will read it. A reply is not automatic."
    });
    return;
  }

  if (crossSitePost(req)) {
    send(req, res, 403, { ok: false, error: "origin", message: "Send that from the site." });
    return;
  }

  if (rejectIfLimited(req, res)) return;

  if (!built.ok) {
    send(req, res, 400, { ok: false, error: built.error, message: built.message });
    return;
  }

  contact.persistRecord(built.record);
  send(req, res, 200, {
    ok: true,
    saved: true,
    message: "We’ve got your message. Motorhome Tools will read it. A reply is not automatic."
  });
}

module.exports = handleContact;
