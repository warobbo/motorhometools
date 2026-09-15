"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
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

test("retired where-you-put-it diagram PNG is not in the tree", function () {
  assert.equal(
    fs.existsSync(path.join(__dirname, "..", "guides", "assets", "where-you-put-it-diagram.png")),
    false
  );
});

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
    assert.match(indexHtml, /where-you-put-it.html/);
    assert.match(indexHtml, /It’s not just total weight — where you put it/);
    assert.match(indexHtml, /Daily power budget/);
    assert.match(indexHtml, /Cassette toilet empty/);
    assert.match(indexHtml, /id="power-guides-title"/);
    assert.match(indexHtml, /id="water-guides-title"/);
    assert.doesNotMatch(indexHtml, /Motorhome payload guides/);

    const placement = await fetch("http://127.0.0.1:" + port + "/guides/where-you-put-it.html");
    const placementHtml = await placement.text();
    assert.equal(placement.status, 200);
    assert.match(placementHtml, /<title>Motorhome rear axle overload: under MAM, over on one axle<\/title>/);
    assert.match(placementHtml, /It’s not just the total weight — it’s where you put it/);
    assert.match(indexHtml, /Rear axle overload: under MAM but over on one axle/);
    assert.match(placementHtml, /Example figures only/);
    assert.match(placementHtml, /Three example loads/);
    assert.match(placementHtml, /class="load-scenes"/);
    assert.doesNotMatch(placementHtml, /where-you-put-it-diagram\.png/);
    assert.match(placementHtml, /1,550/);
    assert.match(placementHtml, /2,100/);
    assert.match(placementHtml, /Within limits/);
    assert.match(placementHtml, /Still OK/);
    assert.match(placementHtml, /Rear axle overloaded/);
    assert.match(placementHtml, /OVERLOAD/);
    assert.match(placementHtml, /motorhomepayload\.co\.uk/);
    assert.match(placementHtml, /We do not invent axle splits/);
    assert.doesNotMatch(placementHtml, /best campsite|campsites near|directory of sites/i);

    for (const pathName of WAVE2_GUIDES) {
      const response = await fetch("http://127.0.0.1:" + port + pathName);
      const html = await response.text();
      assert.equal(response.status, 200, pathName);
      assert.match(html, /We don.t invent|we don.t invent|do not invent/);
      assert.doesNotMatch(html, /best campsite|campsites near|directory of sites/i);
    }
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
});
