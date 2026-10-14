"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const ask = require("../lib/ask");
const handleAsk = require("../api/ask");

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader: function (key, value) {
      this.headers[key] = value;
    },
    end: function (chunk) {
      this.body = chunk == null ? "" : String(chunk);
    }
  };
}

async function postAsk(body, headers) {
  const req = {
    method: "POST",
    headers: headers || {},
    body: body
  };
  const res = fakeRes();
  await handleAsk(req, res);
  return { res: res, json: res.body ? JSON.parse(res.body) : null };
}

test("buildRecord keeps question, optional email and timestamp", function () {
  const built = ask.buildRecord({
    question: "  best campsite near York  ",
    email: "Visitor@Example.com",
    href: "https://motorhometools.co.uk/"
  });
  assert.equal(built.ok, true);
  assert.equal(built.record.type, "ask");
  assert.equal(built.record.question, "best campsite near York");
  assert.equal(built.record.email, "visitor@example.com");
  assert.equal(built.record.href, "https://motorhometools.co.uk/");
  assert.equal(built.record.source, "motorhometools-ask");
  assert.match(built.record.receivedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("buildRecord allows a question with no email", function () {
  const built = ask.buildRecord({ question: "plan a route to Cornwall" });
  assert.equal(built.ok, true);
  assert.equal(built.record.email, null);
});

test("buildRecord ignores honeypot", function () {
  const built = ask.buildRecord({
    question: "spam",
    email: "bot@example.com",
    website: "http://spam.test"
  });
  assert.deepEqual(built, { ok: true, ignored: true });
});

test("buildRecord treats a blank website as an empty honeypot", function () {
  const built = ask.buildRecord({ question: "hello", website: "   " });
  assert.equal(built.ok, true);
  assert.equal(built.record.question, "hello");
});

test("buildRecord rejects an empty question", function () {
  const built = ask.buildRecord({ question: "   " });
  assert.equal(built.ok, false);
  assert.equal(built.error, "empty");
});

test("sanitizeEmail drops junk", function () {
  assert.equal(ask.sanitizeEmail("not-an-email"), "");
  assert.equal(ask.sanitizeEmail("ok@van.test"), "ok@van.test");
});

test("persistRecord writes one JSON line with email", function () {
  const lines = [];
  const files = [];
  const record = ask.buildRecord({
    question: "how much should I spend on a new van",
    email: "wayne-visitor@example.com"
  }).record;
  const result = ask.persistRecord(record, {
    log: function (line) { lines.push(line); },
    logPath: "/tmp/asks-test.jsonl",
    mkdir: function () {},
    writeFile: function (dest, data) { files.push({ dest: dest, data: data }); }
  });
  assert.equal(result.logged, true);
  assert.equal(result.saved, true);
  assert.match(lines[0], /^\[ask\] /);
  const parsed = JSON.parse(lines[0].slice(6));
  assert.equal(parsed.type, "ask");
  assert.equal(parsed.question, "how much should I spend on a new van");
  assert.equal(parsed.email, "wayne-visitor@example.com");
  assert.equal(files[0].dest, "/tmp/asks-test.jsonl");
  assert.equal(files[0].data, JSON.stringify(record) + "\n");
});

test("rate limit allows 5 posts per IP in 10 minutes", function () {
  ask.resetRateLimit();
  assert.equal(ask.RATE_MAX, 5);
  assert.equal(ask.RATE_WINDOW_MS, 10 * 60 * 1000);
  const start = 1_000_000;
  for (let i = 0; i < ask.RATE_MAX; i += 1) {
    assert.equal(ask.allowSubmit("1.2.3.4", start), true);
  }
  assert.equal(ask.allowSubmit("1.2.3.4", start + ask.RATE_WINDOW_MS - 1), false);
  assert.equal(ask.allowSubmit("9.9.9.9", start), true);
  assert.equal(ask.allowSubmit("1.2.3.4", start + ask.RATE_WINDOW_MS), true);
  ask.resetRateLimit();
});

test("rate limit drops idle addresses and does not grow without bound", function () {
  ask.resetRateLimit();
  const start = 5_000_000;
  assert.equal(ask.allowSubmit("198.51.100.10", start), true);
  assert.equal(ask.allowSubmit("198.51.100.11", start), true);
  assert.equal(ask.rateLimitSize(), 2);
  assert.equal(ask.allowSubmit("198.51.100.12", start + ask.RATE_WINDOW_MS), true);
  assert.equal(ask.rateLimitSize(), 1);

  const now = start + ask.RATE_WINDOW_MS * 2;
  const victim = "192.0.2.10";
  for (let n = 0; n < ask.RATE_MAX; n += 1) {
    assert.equal(ask.allowSubmit(victim, now), true);
  }
  for (let i = 1; i < ask.RATE_BUCKET_MAX; i += 1) {
    const key = "10." + ((i >> 16) & 255) + "." + ((i >> 8) & 255) + "." + (i & 255);
    assert.equal(ask.allowSubmit(key, now), true);
  }
  assert.equal(ask.rateLimitSize(), ask.RATE_BUCKET_MAX);
  assert.equal(ask.allowSubmit(victim, now), false);
  assert.equal(ask.allowSubmit("203.0.113.77", now), true);
  assert.equal(ask.rateLimitSize(), ask.RATE_BUCKET_MAX);
  assert.equal(ask.allowSubmit("203.0.113.77", now + ask.RATE_WINDOW_MS), true);
  assert.equal(ask.rateLimitSize(), 1);
  ask.resetRateLimit();
});

test("POST /api/ask saves and returns ok", async function () {
  ask.resetRateLimit();
  const { res, json } = await postAsk({
    question: "camping in the Lakes",
    email: "visitor@example.com"
  });
  assert.equal(res.statusCode, 200);
  assert.equal(json.ok, true);
  assert.equal(json.saved, true);
});

test("POST /api/ask ignores honeypot without logging a real note", async function () {
  ask.resetRateLimit();
  const lines = [];
  const originalLog = console.log;
  console.log = function (line) { lines.push(String(line)); };
  try {
    const { res, json } = await postAsk({
      question: "hello",
      website: "https://bots.test"
    }, { "x-forwarded-for": "203.0.113.8" });
    assert.equal(res.statusCode, 200);
    assert.equal(json.ok, true);
    assert.equal(json.ignored, true);
    assert.equal(json.saved, undefined);
    assert.equal(lines.some(function (line) { return line.indexOf("[ask]") === 0; }), false);
  } finally {
    console.log = originalLog;
  }
});

test("POST /api/ask rate limit is 5 per IP and honeypot stays silent", async function () {
  ask.resetRateLimit();
  const headers = { "x-forwarded-for": "203.0.113.10, 10.0.0.1" };
  for (let i = 0; i < 5; i += 1) {
    const saved = await postAsk({ question: "campsite question " + i }, headers);
    assert.equal(saved.res.statusCode, 200, "post " + i);
    assert.equal(saved.json.saved, true);
  }
  const blocked = await postAsk({ question: "one more campsite" }, headers);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.json.ok, false);
  assert.equal(blocked.json.error, "rate");

  const lines = [];
  const originalLog = console.log;
  console.log = function (line) { lines.push(String(line)); };
  try {
    const honeypot = await postAsk({
      question: "spam after the limit",
      website: "https://bots.test"
    }, headers);
    assert.equal(honeypot.res.statusCode, 200);
    assert.equal(honeypot.json.ok, true);
    assert.equal(honeypot.json.ignored, true);
    assert.equal(lines.some(function (line) { return line.indexOf("[ask]") === 0; }), false);
  } finally {
    console.log = originalLog;
  }

  const other = await postAsk(
    { question: "different visitor" },
    { "x-forwarded-for": "203.0.113.11" }
  );
  assert.equal(other.res.statusCode, 200);
  assert.equal(other.json.saved, true);
  ask.resetRateLimit();
});

test("POST /api/ask keys Cloudflare visitors by CF-Connecting-IP", async function () {
  ask.resetRateLimit();
  const headers = {
    "cf-connecting-ip": "203.0.113.20",
    "x-forwarded-for": "198.51.100.20, 10.0.0.1"
  };
  for (let i = 0; i < 5; i += 1) {
    const saved = await postAsk({ question: "cf visitor " + i }, headers);
    assert.equal(saved.res.statusCode, 200, "post " + i);
    assert.equal(saved.json.saved, true);
  }
  const blocked = await postAsk({ question: "cf visitor again" }, headers);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.json.error, "rate");

  const spoofOnly = await postAsk(
    { question: "forwarded header alone" },
    { "x-forwarded-for": "198.51.100.20" }
  );
  assert.equal(spoofOnly.res.statusCode, 200);
  assert.equal(spoofOnly.json.saved, true);

  const other = await postAsk(
    { question: "other cloudflare visitor" },
    { "cf-connecting-ip": "203.0.113.21", "x-forwarded-for": "198.51.100.20" }
  );
  assert.equal(other.res.statusCode, 200);
  assert.equal(other.json.saved, true);
  ask.resetRateLimit();
});

test("a non-IP forwarded header shares one bucket", async function () {
  ask.resetRateLimit();
  for (let i = 0; i < 5; i += 1) {
    const saved = await postAsk(
      { question: "junk header " + i },
      { "x-forwarded-for": "not-an-ip-" + i + "-" + "x".repeat(80) }
    );
    assert.equal(saved.res.statusCode, 200, "post " + i);
    assert.equal(saved.json.saved, true);
  }
  const blocked = await postAsk(
    { question: "another junk header" },
    { "x-forwarded-for": "also-not-an-ip" }
  );
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.json.error, "rate");
  assert.equal(ask.rateLimitSize(), 1);
  ask.resetRateLimit();
});

test("cross-site POST does not log or use a rate-limit slot", async function () {
  ask.resetRateLimit();
  const lines = [];
  const originalLog = console.log;
  console.log = function (line) { lines.push(String(line)); };
  try {
    const honeypot = await postAsk(
      { question: "cross-site spam", website: "https://bots.test" },
      { "sec-fetch-site": "cross-site", "x-forwarded-for": "203.0.113.40" }
    );
    assert.equal(honeypot.res.statusCode, 200);
    assert.equal(honeypot.json.ok, true);
    assert.equal(honeypot.json.ignored, true);

    for (let i = 0; i < 6; i += 1) {
      const blocked = await postAsk(
        { question: "from another site " + i },
        { "sec-fetch-site": "cross-site", "x-forwarded-for": "203.0.113.40" }
      );
      assert.equal(blocked.res.statusCode, 403);
      assert.equal(blocked.json.ok, false);
      assert.equal(blocked.json.error, "origin");
    }
    assert.equal(lines.some(function (line) { return line.indexOf("[ask]") === 0; }), false);
  } finally {
    console.log = originalLog;
  }
  const saved = await postAsk(
    { question: "same visitor on the site" },
    { "sec-fetch-site": "same-origin", "x-forwarded-for": "203.0.113.40" }
  );
  assert.equal(saved.res.statusCode, 200);
  assert.equal(saved.json.saved, true);
  ask.resetRateLimit();
});

test("GET /api/ask does not publish an owner address", async function () {
  const previous = process.env.ASK_NOTIFY_EMAIL;
  process.env.ASK_NOTIFY_EMAIL = "owner.wayne.robinson@motorhometools.co.uk";
  try {
    const res = fakeRes();
    await handleAsk({ method: "GET", headers: {} }, res);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);
    assert.equal(json.mailto, null);
    ask.resetRateLimit();
    const posted = await postAsk({ question: "best campsite near York" });
    assert.equal(posted.res.statusCode, 200);
    assert.equal(posted.json.saved, true);
    assert.equal(posted.json.mailto, null);
  } finally {
    if (previous == null) delete process.env.ASK_NOTIFY_EMAIL;
    else process.env.ASK_NOTIFY_EMAIL = previous;
  }
});

test("GET /api/ask reports capture without a hardcoded address", async function () {
  const req = { method: "GET", headers: {} };
  const res = fakeRes();
  await handleAsk(req, res);
  const json = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(json.ok, true);
  assert.equal(json.capture, true);
  assert.equal(json.mailto, null);
});

test("live server POST /api/ask returns ok and logs JSON", async function () {
  ask.resetRateLimit();
  const server = http.createServer(function (req, res) {
    Promise.resolve(handleAsk(req, res)).catch(function (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    });
  });
  await new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  const logs = [];
  const originalLog = console.log;
  console.log = function (line) { logs.push(String(line)); };

  try {
    const response = await fetch("http://127.0.0.1:" + port + "/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "best campsite near York",
        email: "visitor@example.com"
      })
    });
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.saved, true);
    const askLine = logs.find(function (line) { return line.indexOf("[ask]") === 0; });
    assert.ok(askLine, "expected an [ask] JSON log line");
    const parsed = JSON.parse(askLine.slice(6));
    assert.equal(parsed.type, "ask");
    assert.equal(parsed.question, "best campsite near York");
    assert.equal(parsed.email, "visitor@example.com");
  } finally {
    console.log = originalLog;
    await new Promise(function (resolve) { server.close(resolve); });
  }
});
