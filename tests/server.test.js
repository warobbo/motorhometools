"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const server = require("../server");
const { resolvePublicFile } = server;

test("serves /guides/ as guides/index.html", function () {
  const filePath = resolvePublicFile("/guides/");
  assert.equal(filePath, path.join(__dirname, "..", "guides", "index.html"));
});

test("serves /guides as guides/index.html", function () {
  const filePath = resolvePublicFile("/guides");
  assert.equal(filePath, path.join(__dirname, "..", "guides", "index.html"));
});

test("does not expose server internals", function () {
  assert.equal(resolvePublicFile("/server.js"), null);
  assert.equal(resolvePublicFile("/lib/ask.js"), null);
  assert.equal(resolvePublicFile("/api/ask.js"), null);
});

test("GET /guides/ returns the Wave 1 index", async function () {
  await new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  try {
    const response = await fetch("http://127.0.0.1:" + port + "/guides/");
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /How to weigh a motorhome/);
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
});
