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

test("serves the where-you-put-it diagram asset", function () {
  const filePath = resolvePublicFile("/guides/assets/where-you-put-it-diagram.png");
  assert.equal(
    filePath,
    path.join(__dirname, "..", "guides", "assets", "where-you-put-it-diagram.png")
  );
  assert.equal(fs.existsSync(filePath), true);
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
    assert.match(placementHtml, /where-you-put-it-diagram\.png/);
    assert.match(placementHtml, /guide-figure--diagram/);
    assert.match(placementHtml, /front axle 1,550 kg/);
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

    const home = await fetch("http://127.0.0.1:" + port + "/");
    const homeHtml = await home.text();
    assert.equal(home.status, 200);
    assert.match(homeHtml, /<link rel="canonical" href="https:\/\/motorhometools\.co\.uk\/">/);
    assert.match(homeHtml, /<meta property="og:url" content="https:\/\/motorhometools\.co\.uk\/">/);
    assert.match(homeHtml, /<meta property="og:image" content="https:\/\/motorhometools\.co\.uk\/assets\/icon-512\.png">/);
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
});

function walkHtmlFiles(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkHtmlFiles(full, files);
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

test("public HTML home links use / and guide descriptions stay under 160 chars", function () {
  const root = path.join(__dirname, "..");
  const htmlFiles = walkHtmlFiles(root, []);
  assert.ok(htmlFiles.length >= 14);
  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    assert.doesNotMatch(html, /href="[^"]*index\.html"/, filePath);
    const desc = html.match(/<meta name="description" content="([^"]*)"/);
    if (desc && filePath.includes(`${path.sep}guides${path.sep}`)) {
      assert.ok(
        desc[1].length <= 160,
        `${path.relative(root, filePath)} description is ${desc[1].length} chars`
      );
    }
  }
});

function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = re.exec(html))) {
    blocks.push(JSON.parse(match[1]));
  }
  return blocks;
}

function crumbLabels(html) {
  const nav = html.match(/<nav aria-label="Breadcrumb">([\s\S]*?)<\/nav>/);
  assert.ok(nav, "visible breadcrumb nav missing");
  return [...nav[1].matchAll(/<li[^>]*>(?:<a[^>]*>)?([^<]+)/g)].map(function (m) {
    return m[1].trim();
  });
}

test("homepage JSON-LD is an honest WebSite hub and Wave B OG tags stay", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/motorhometools\.co\.uk\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/motorhometools\.co\.uk\/">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/motorhometools\.co\.uk\/assets\/icon-512\.png">/);

  const blocks = jsonLdBlocks(html);
  assert.equal(blocks.length, 1);
  const data = blocks[0];
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "WebSite");
  assert.equal(data.name, "Motorhome Tools");
  assert.equal(data.url, "https://motorhometools.co.uk/");
  assert.match(data.description, /hub of free UK calculators/);
  assert.match(data.description, /payload, power and water/);
  assert.equal(data.inLanguage, "en-GB");
  assert.equal(data.isAccessibleForFree, true);
  assert.equal(data.author && data.author.name, "Wayne Robinson");
  assert.equal(data.aggregateRating, undefined);
  assert.equal(data.review, undefined);
  assert.equal(data.offers, undefined);
});

test("guide pages have BreadcrumbList that matches the visible crumbs", function () {
  const guidesDir = path.join(__dirname, "..", "guides");
  const files = fs.readdirSync(guidesDir).filter(function (name) {
    return name.endsWith(".html");
  });
  assert.ok(files.length >= 11);

  for (const name of files) {
    const html = fs.readFileSync(path.join(guidesDir, name), "utf8");
    const labels = crumbLabels(html);
    const blocks = jsonLdBlocks(html);
    assert.equal(blocks.length, 1, name);
    const data = blocks[0];
    assert.equal(data["@type"], "BreadcrumbList", name);
    const items = data.itemListElement;
    assert.equal(items.length, labels.length, name);
    assert.equal(items[0].name, "Home");
    assert.equal(items[0].item, "https://motorhometools.co.uk/");
    assert.equal(items[1].name, "Guides");
    assert.equal(items[1].item, "https://motorhometools.co.uk/guides/");
    items.forEach(function (item, index) {
      assert.equal(item["@type"], "ListItem");
      assert.equal(item.position, index + 1);
      assert.equal(item.name, labels[index], name + " crumb " + item.position);
      assert.match(item.item, /^https:\/\/motorhometools\.co\.uk\//);
    });
    if (name !== "index.html") {
      assert.equal(items.length, 3, name);
      assert.equal(items[2].item, "https://motorhometools.co.uk/guides/" + name);
    }
    assert.doesNotMatch(html, /aggregateRating|reviewCount|ratingValue/);
  }
});
