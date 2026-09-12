/**
 * Unmatched Ask-box intake. Logs one JSON line so the site owner can
 * see the question. Never invents a tyre pressure, weight or legal answer.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const MAX = {
  question: 280,
  email: 200,
  href: 400,
  website: 80
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;

function clip(value, max) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeEmail(value) {
  const email = clip(value, MAX.email).toLowerCase();
  if (!email) return "";
  return EMAIL_RE.test(email) ? email : "";
}

function buildRecord(body) {
  const raw = body && typeof body === "object" ? body : {};
  if (clip(raw.website, MAX.website)) {
    return { ok: true, ignored: true };
  }

  const question = clip(raw.question, MAX.question);
  if (!question) {
    return { ok: false, error: "empty", message: "Missing question." };
  }

  const record = {
    type: "ask",
    receivedAt: new Date().toISOString(),
    question: question,
    email: sanitizeEmail(raw.email) || null,
    href: clip(raw.href, MAX.href) || null,
    source: "motorhometools-ask"
  };

  return { ok: true, record: record };
}

function formatMailtoBody(record) {
  const lines = [
    "Unmatched Ask from motorhometools.co.uk.",
    "Do not invent a tyre pressure, weight or legal answer.",
    "",
    "Question: " + (record && record.question ? record.question : ""),
    "Visitor email: " + (record && record.email ? record.email : "(not given)"),
    "Page: " + (record && record.href ? record.href : "(not given)"),
    "Received: " + (record && record.receivedAt ? record.receivedAt : "")
  ];
  return lines.join("\n");
}

function mailtoHref(record, to) {
  const subject = "Ask: " + clip(record && record.question, 80);
  const addr = clip(to, MAX.email);
  return "mailto:" + addr +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(formatMailtoBody(record || {}));
}

function notifyEmail() {
  return clip(process.env.ASK_NOTIFY_EMAIL, MAX.email);
}

function logPath() {
  const configured = clip(process.env.ASK_LOG_PATH, 240);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "";
  return path.join(__dirname, "..", "data", "asks.jsonl");
}

function persistRecord(record, deps) {
  const log = (deps && deps.log) || console.log;
  const line = JSON.stringify(record);
  log("[ask] " + line);

  const dest = (deps && deps.logPath !== undefined) ? deps.logPath : logPath();
  if (!dest) return { logged: true, saved: false };

  const writeFile = (deps && deps.writeFile) || fs.writeFileSync;
  const mkdir = (deps && deps.mkdir) || fs.mkdirSync;
  mkdir(path.dirname(dest), { recursive: true });
  writeFile(dest, line + "\n", { flag: "a" });
  return { logged: true, saved: true, path: dest };
}

const buckets = new Map();

function allowSubmit(key, nowMs) {
  const now = nowMs || Date.now();
  const stamp = key || "anon";
  const list = (buckets.get(stamp) || []).filter(function (t) {
    return now - t < RATE_WINDOW_MS;
  });
  if (list.length >= RATE_MAX) return false;
  list.push(now);
  buckets.set(stamp, list);
  return true;
}

function resetRateLimit() {
  buckets.clear();
}

module.exports = {
  MAX: MAX,
  RATE_MAX: RATE_MAX,
  RATE_WINDOW_MS: RATE_WINDOW_MS,
  buildRecord: buildRecord,
  formatMailtoBody: formatMailtoBody,
  mailtoHref: mailtoHref,
  notifyEmail: notifyEmail,
  logPath: logPath,
  persistRecord: persistRecord,
  allowSubmit: allowSubmit,
  resetRateLimit: resetRateLimit,
  sanitizeEmail: sanitizeEmail
};
