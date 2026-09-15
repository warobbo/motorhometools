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

const WAVE2_GUIDES = [
  "/guides/daily-power-budget.html",
  "/guides/battery-size-plain-english.html",
  "/guides/solar-reality-check.html",
  "/guides/fresh-waste-tanks.html",
  "/guides/gas-lpg-basics.html",
  "/guides/cassette-toilet-empty.html"
];

test("GET /guides/ and Wave 2 pages return Payload, Power and Water", async function () {
  await new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  try {
    const index = await fetch("http://127.0.0.1:" + port + "/guides/");
    const indexHtml = await index.text();
    assert.equal(index.status, 200);
    assert.match(indexHtml, /How to weigh a motorhome/);
    assert.match(indexHtml, /Daily power budget/);
    assert.match(indexHtml, /Cassette toilet empty/);
    assert.match(indexHtml, /id="power-guides-title"/);
    assert.match(indexHtml, /id="water-guides-title"/);
    assert.doesNotMatch(indexHtml, /Motorhome payload guides/);

    for (const pathName of WAVE2_GUIDES) {
      const response = await fetch("http://127.0.0.1:" + port + pathName);
      const html = await response.text();
      assert.equal(response.status, 200, pathName);
      assert.match(html, /We don.t invent|we don.t invent|do not invent/);
      assert.doesNotMatch(html, /campsite finder|venue directory of/i);
    }
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
});
