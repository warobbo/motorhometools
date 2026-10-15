/**
 * Contact-form intake. One JSON line, the same store shape as an Ask note.
 * Does not publish an address and does not invent a reply.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const ask = require("./ask");
const { createLimiter } = require("./rate-limit");

const MAX = {
  name: 80,
  email: 200,
  message: 2000,
  href: 400,
  website: 80
};

const limiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  bucketMax: 4096
});

function clip(value, max) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function buildRecord(body) {
  const raw = body && typeof body === "object" ? body : {};
  if (clip(raw.website, MAX.website)) {
    return { ok: true, ignored: true };
  }

  const message = String(raw.message == null ? "" : raw.message).replace(/\s+/g, " ").trim();
  if (!message) {
    return { ok: false, error: "empty", message: "Write a message so we know what you need." };
  }
  if (message.length > MAX.message) {
    return { ok: false, error: "too_long", message: "That message is too long." };
  }

  const nameRaw = String(raw.name == null ? "" : raw.name).replace(/\s+/g, " ").trim();
  if (nameRaw.length > MAX.name) {
    return { ok: false, error: "name", message: "That name is too long." };
  }

  const emailRaw = String(raw.email == null ? "" : raw.email).replace(/\s+/g, " ").trim();
  if (emailRaw.length > MAX.email) {
    return { ok: false, error: "email", message: "That email does not look usable. Leave it blank, or type the address again." };
  }
  if (emailRaw && !ask.sanitizeEmail(emailRaw)) {
    return { ok: false, error: "email", message: "That email does not look usable. Leave it blank, or type the address again." };
  }

  const record = {
    type: "contact",
    receivedAt: new Date().toISOString(),
    name: nameRaw || null,
    email: emailRaw ? ask.sanitizeEmail(emailRaw) : null,
    message: message,
    href: clip(raw.href, MAX.href) || null,
    source: "motorhometools-contact"
  };

  return { ok: true, record: record };
}

function logPath() {
  const configured = clip(process.env.CONTACT_LOG_PATH, 240);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "";
  return path.join(__dirname, "..", "data", "contacts.jsonl");
}

function persistRecord(record, deps) {
  const log = (deps && deps.log) || console.log;
  const line = JSON.stringify(record);
  log("[contact] " + line);

  const dest = (deps && deps.logPath !== undefined) ? deps.logPath : logPath();
  if (!dest) return { logged: true, saved: false };

  const writeFile = (deps && deps.writeFile) || fs.writeFileSync;
  const mkdir = (deps && deps.mkdir) || fs.mkdirSync;
  mkdir(path.dirname(dest), { recursive: true });
  writeFile(dest, line + "\n", { flag: "a" });
  return { logged: true, saved: true, path: dest };
}

module.exports = {
  MAX: MAX,
  RATE_MAX: limiter.max,
  RATE_WINDOW_MS: limiter.windowMs,
  buildRecord: buildRecord,
  logPath: logPath,
  persistRecord: persistRecord,
  allowSubmit: limiter.allow,
  resetRateLimit: limiter.reset,
  rateLimitSize: limiter.size
};
