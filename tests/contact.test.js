"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const contact = require("../lib/contact");
const handleContact = require("../api/contact");

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

async function postContact(body, headers) {
  const req = {
    method: "POST",
    headers: headers || {},
    body: body
  };
  const res = fakeRes();
  await handleContact(req, res);
  const json = res.body && res.headers["Content-Type"] && res.headers["Content-Type"].includes("json")
    ? JSON.parse(res.body)
    : null;
  return { res: res, json: json };
}

test("buildRecord keeps message, optional name and email", function () {
  const built = contact.buildRecord({
    name: "  Weekend visitor  ",
    email: "Visitor@Example.com",
    message: "  The water total looks high.  ",
    href: "https://motorhometools.co.uk/contact.html"
  });
  assert.equal(built.ok, true);
  assert.equal(built.record.type, "contact");
  assert.equal(built.record.name, "Weekend visitor");
  assert.equal(built.record.email, "visitor@example.com");
  assert.equal(built.record.message, "The water total looks high.");
  assert.equal(built.record.href, "https://motorhometools.co.uk/contact.html");
  assert.equal(built.record.source, "motorhometools-contact");
  assert.match(built.record.receivedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("buildRecord allows a message with no name or email", function () {
  const built = contact.buildRecord({ message: "Hello", name: "   ", email: "" });
  assert.equal(built.ok, true);
  assert.equal(built.record.name, null);
  assert.equal(built.record.email, null);
});

test("buildRecord ignores honeypot", function () {
  const built = contact.buildRecord({
    message: "spam",
    email: "bot@example.com",
    website: "http://spam.test"
  });
  assert.deepEqual(built, { ok: true, ignored: true });
});

test("buildRecord treats a blank website as an empty honeypot", function () {
  const built = contact.buildRecord({ message: "hello", website: "   " });
  assert.equal(built.ok, true);
  assert.equal(built.record.message, "hello");
});

test("buildRecord rejects an empty message and a bad email", function () {
  const empty = contact.buildRecord({ message: "   " });
  assert.equal(empty.ok, false);
  assert.equal(empty.error, "empty");
  const email = contact.buildRecord({ message: "hello", email: "not-an-email" });
  assert.equal(email.ok, false);
  assert.equal(email.error, "email");
  const long = contact.buildRecord({ message: "x".repeat(contact.MAX.message + 1) });
  assert.equal(long.ok, false);
  assert.equal(long.error, "too_long");
});

test("persistRecord writes one JSON line", function () {
  const lines = [];
  const files = [];
  const record = contact.buildRecord({ message: "Where is the contact form?" }).record;
  const result = contact.persistRecord(record, {
    log: function (line) { lines.push(line); },
    logPath: "/tmp/contacts-test.jsonl",
    mkdir: function () {},
    writeFile: function (dest, data) { files.push({ dest: dest, data: data }); }
  });
  assert.equal(result.logged, true);
  assert.equal(result.saved, true);
  assert.match(lines[0], /^\[contact\] /);
  const parsed = JSON.parse(lines[0].slice("[contact] ".length));
  assert.equal(parsed.type, "contact");
  assert.equal(parsed.message, "Where is the contact form?");
  assert.equal(files[0].dest, "/tmp/contacts-test.jsonl");
  assert.equal(files[0].data, JSON.stringify(record) + "\n");
});

test("contact rate limit allows 5 posts per key in 10 minutes", function () {
  contact.resetRateLimit();
  assert.equal(contact.RATE_MAX, 5);
  assert.equal(contact.RATE_WINDOW_MS, 10 * 60 * 1000);
  const start = 2_000_000;
  for (let i = 0; i < contact.RATE_MAX; i += 1) {
    assert.equal(contact.allowSubmit("198.51.100.8", start), true);
  }
  assert.equal(contact.allowSubmit("198.51.100.8", start + 1), false);
  assert.equal(contact.allowSubmit("198.51.100.9", start), true);
  assert.equal(contact.allowSubmit("198.51.100.8", start + contact.RATE_WINDOW_MS), true);
  contact.resetRateLimit();
});

test("POST /api/contact saves and returns ok", async function () {
  contact.resetRateLimit();
  const { res, json } = await postContact({
    message: "The solar page is unclear.",
    email: "visitor@example.com"
  });
  assert.equal(res.statusCode, 200);
  assert.equal(json.ok, true);
  assert.equal(json.saved, true);
  assert.equal(json.mailto, undefined);
  contact.resetRateLimit();
});

test("POST /api/contact ignores honeypot without logging", async function () {
  contact.resetRateLimit();
  const lines = [];
  const originalLog = console.log;
  console.log = function (line) { lines.push(String(line)); };
  try {
    const { res, json } = await postContact({
      message: "hello",
      website: "https://bots.test"
    }, { "x-forwarded-for": "203.0.113.50" });
    assert.equal(res.statusCode, 200);
    assert.equal(json.ok, true);
    assert.equal(json.ignored, true);
    assert.equal(json.saved, undefined);
    assert.equal(lines.some(function (line) { return line.indexOf("[contact]") === 0; }), false);
  } finally {
    console.log = originalLog;
    contact.resetRateLimit();
  }
});

test("POST /api/contact rate limit is 5 per IP", async function () {
  contact.resetRateLimit();
  const headers = { "x-forwarded-for": "203.0.113.60" };
  for (let i = 0; i < 5; i += 1) {
    const saved = await postContact({ message: "note " + i }, headers);
    assert.equal(saved.res.statusCode, 200, "post " + i);
    assert.equal(saved.json.saved, true);
  }
  const blocked = await postContact({ message: "one more" }, headers);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.json.error, "rate");
  const other = await postContact(
    { message: "different visitor" },
    { "x-forwarded-for": "203.0.113.61" }
  );
  assert.equal(other.json.saved, true);
  contact.resetRateLimit();
});

test("cross-site contact POST does not log or use a rate-limit slot", async function () {
  contact.resetRateLimit();
  const lines = [];
  const originalLog = console.log;
  console.log = function (line) { lines.push(String(line)); };
  try {
    for (let i = 0; i < 6; i += 1) {
      const blocked = await postContact(
        { message: "from another site " + i },
        { "sec-fetch-site": "cross-site", "x-forwarded-for": "203.0.113.70" }
      );
      assert.equal(blocked.res.statusCode, 403);
      assert.equal(blocked.json.error, "origin");
    }
    assert.equal(lines.some(function (line) { return line.indexOf("[contact]") === 0; }), false);
  } finally {
    console.log = originalLog;
  }
  const saved = await postContact(
    { message: "same visitor on the site" },
    { "sec-fetch-site": "same-origin", "x-forwarded-for": "203.0.113.70" }
  );
  assert.equal(saved.json.saved, true);
  contact.resetRateLimit();
});

test("GET /api/contact reports capture and does not publish an address", async function () {
  const res = fakeRes();
  await handleContact({ method: "GET", headers: {} }, res);
  const json = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(json.ok, true);
  assert.equal(json.capture, true);
  assert.equal(JSON.stringify(json).includes("@"), false);
});

test("a browser form POST returns an HTML result and logs the message", async function () {
  contact.resetRateLimit();
  const server = http.createServer(function (req, res) {
    Promise.resolve(handleContact(req, res)).catch(function (err) {
      res.statusCode = 500;
      res.end(String(err));
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
    const response = await fetch("http://127.0.0.1:" + port + "/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html"
      },
      body: new URLSearchParams({
        name: "Weekend visitor",
        message: "The contact form works.",
        website: ""
      })
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(html, /Message received/);
    assert.match(html, /Motorhome Tools will read it/);
    assert.doesNotMatch(html, /@/);
    const line = logs.find(function (item) { return item.indexOf("[contact]") === 0; });
    assert.ok(line);
    const parsed = JSON.parse(line.slice("[contact] ".length));
    assert.equal(parsed.message, "The contact form works.");
    assert.equal(parsed.name, "Weekend visitor");
    assert.equal(parsed.email, null);

    const bad = await fetch("http://127.0.0.1:" + port + "/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html"
      },
      body: new URLSearchParams({ message: "   " })
    });
    const badHtml = await bad.text();
    assert.equal(bad.status, 400);
    assert.match(badHtml, /Write a message/);
  } finally {
    console.log = originalLog;
    contact.resetRateLimit();
    await new Promise(function (resolve) { server.close(resolve); });
  }
});
