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

test("rate limit blocks a burst from one client", function () {
  ask.resetRateLimit();
  for (let i = 0; i < ask.RATE_MAX; i += 1) {
    assert.equal(ask.allowSubmit("1.2.3.4", 1000), true);
  }
  assert.equal(ask.allowSubmit("1.2.3.4", 1000), false);
  assert.equal(ask.allowSubmit("9.9.9.9", 1000), true);
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
  const { res, json } = await postAsk({
    question: "hello",
    website: "https://bots.test"
  });
  assert.equal(res.statusCode, 200);
  assert.equal(json.ok, true);
  assert.equal(json.ignored, true);
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
