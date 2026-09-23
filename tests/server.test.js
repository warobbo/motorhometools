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

test("serves /ask/ as ask/index.html", function () {
  const filePath = resolvePublicFile("/ask/");
  assert.equal(filePath, path.join(__dirname, "..", "ask", "index.html"));
});

test("serves /ask as ask/index.html", function () {
  const filePath = resolvePublicFile("/ask");
  assert.equal(filePath, path.join(__dirname, "..", "ask", "index.html"));
});

test("does not expose server internals", function () {
  assert.equal(resolvePublicFile("/server.js"), null);
  assert.equal(resolvePublicFile("/lib/ask.js"), null);
  assert.equal(resolvePublicFile("/lib/copilot.js"), null);
  assert.equal(resolvePublicFile("/api/ask.js"), null);
  assert.equal(resolvePublicFile("/COPILOT-ASK.md"), null);
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
    assert.match(indexHtml, /When and where to empty a cassette toilet/);
    assert.match(indexHtml, /Solar panel sizing/);
    assert.match(indexHtml, /Gas \/ LPG bottles and safety/);
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
    assert.match(placementHtml, /where-you-put-it-diagram\.png\?v=20260915ai/);
    assert.match(placementHtml, /guide-figure--diagram/);
    assert.match(placementHtml, /front axle 1,550 kg/);
    assert.match(placementHtml, /1,550/);
    assert.match(placementHtml, /2,100/);
    assert.match(placementHtml, /OVERLOAD/);
    assert.match(placementHtml, /Example numbers table \(from the diagram — not your van\)/);
    assert.match(placementHtml, /guide-table--example/);
    assert.doesNotMatch(placementHtml, /<caption>Example numbers from the diagram/);
    assert.doesNotMatch(placementHtml, /class="load-scenes"/);
    assert.doesNotMatch(placementHtml, /class="load-scene"/);
    assert.doesNotMatch(placementHtml, /id="load-empty-title"/);
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

    const solar = await fetch("http://127.0.0.1:" + port + "/guides/solar-reality-check.html");
    const solarHtml = await solar.text();
    assert.match(solarHtml, /<title>Motorhome solar panel sizing: daily Wh reality<\/title>/);
    assert.match(solarHtml, /<h1>Motorhome solar panel sizing \(daily Wh reality\)<\/h1>/);

    const gas = await fetch("http://127.0.0.1:" + port + "/guides/gas-lpg-basics.html");
    const gasHtml = await gas.text();
    assert.match(gasHtml, /<title>Motorhome gas \/ LPG: bottles and safety in plain English<\/title>/);
    assert.match(gasHtml, /<h1>Motorhome gas \/ LPG bottles and safety<\/h1>/);

    const cassette = await fetch("http://127.0.0.1:" + port + "/guides/cassette-toilet-empty.html");
    const cassetteHtml = await cassette.text();
    assert.match(cassetteHtml, /<title>When and where to empty a motorhome cassette toilet<\/title>/);
    assert.match(cassetteHtml, /<h1>When and where to empty a motorhome cassette toilet<\/h1>/);

    const home = await fetch("http://127.0.0.1:" + port + "/");
    const homeHtml = await home.text();
    assert.equal(home.status, 200);
    assert.match(homeHtml, /<link rel="canonical" href="https:\/\/motorhometools\.co\.uk\/">/);
    assert.match(homeHtml, /<meta property="og:url" content="https:\/\/motorhometools\.co\.uk\/">/);
    assert.match(homeHtml, /<meta property="og:image" content="https:\/\/motorhometools\.co\.uk\/assets\/icon-512\.png">/);
    assert.match(homeHtml, /href="\/ask\/">shareable Ask page</);
    assert.match(homeHtml, /<h2 id="ask-title">Not sure\? Ask in plain English<\/h2>/);
    assert.match(homeHtml, /id="ask-answer"/);
    assert.match(homeHtml, /assets\/copilot\.js\?v=20260923hub/);
    assert.match(homeHtml, /assets\/app\.js\?v=20260923hub/);
    assert.match(homeHtml, /href="\/power\/"/);
    assert.match(homeHtml, /href="\/water\/"/);
    assert.doesNotMatch(homeHtml, /motorhomepower\.co\.uk|motorhomewater\.co\.uk/);
    assert.match(homeHtml, /motorhomepayload\.co\.uk/);

    const askPage = await fetch("http://127.0.0.1:" + port + "/ask/");
    const askHtml = await askPage.text();
    assert.equal(askPage.status, 200);
    assert.match(askHtml, /<title>Ask in plain English \| Motorhome Tools<\/title>/);
    assert.match(askHtml, /<link rel="canonical" href="https:\/\/motorhometools\.co\.uk\/ask\/">/);
    assert.match(askHtml, /<meta property="og:url" content="https:\/\/motorhometools\.co\.uk\/ask\/">/);
    assert.match(askHtml, /id="ask-form"/);
    assert.match(askHtml, /id="ask-question"/);
    assert.match(askHtml, /assets\/router\.js/);
    assert.match(askHtml, /assets\/copilot\.js\?v=20260923hub/);
    assert.match(askHtml, /assets\/app\.js\?v=20260923hub/);
    assert.doesNotMatch(askHtml, /motorhomepower\.co\.uk|motorhomewater\.co\.uk/);
    assert.match(askHtml, /id="ask-answer"/);
    assert.doesNotMatch(askHtml, /best campsite|campsites near|directory of sites/i);

    const sitemap = await fetch("http://127.0.0.1:" + port + "/sitemap.xml");
    const sitemapXml = await sitemap.text();
    assert.equal(sitemap.status, 200);
    assert.match(sitemapXml, /<loc>https:\/\/motorhometools\.co\.uk\/ask\/<\/loc>/);
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

function pngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("family logos and favicons ship pine marks with a sitewide cache-bust", function () {
  const root = path.join(__dirname, "..");
  const assets = path.join(root, "assets");
  const icon32 = pngSize(path.join(assets, "favicon-32.png"));
  const apple = pngSize(path.join(assets, "apple-touch-icon.png"));
  const icon512 = pngSize(path.join(assets, "icon-512.png"));
  assert.deepEqual(icon32, { width: 32, height: 32 });
  assert.deepEqual(apple, { width: 180, height: 180 });
  assert.deepEqual(icon512, { width: 512, height: 512 });

  for (const name of ["logo.svg", "favicon.svg", "payload.svg", "tyres.svg", "power.svg", "water.svg"]) {
    const svg = fs.readFileSync(path.join(assets, name), "utf8");
    assert.match(svg, /#1e4f43/, name);
  }

  const htmlFiles = walkHtmlFiles(root, []).filter(function (filePath) {
    const rel = path.relative(root, filePath);
    return !rel.startsWith("power" + path.sep) && !rel.startsWith("water" + path.sep);
  });
  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, "utf8");
    const iconRefs = html.match(
      /(?:favicon\.svg|favicon-32\.png|apple-touch-icon\.png|icon-512\.png|logo\.svg)\?v=[^"']+/g
    ) || [];
    assert.ok(iconRefs.length > 0, path.relative(root, filePath) + " missing icon/logo refs");
    for (const ref of iconRefs) {
      assert.match(ref, /\?v=20260915logo$/, path.relative(root, filePath) + " " + ref);
    }
  }

  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(home, /assets\/payload\.svg\?v=20260915logo/);
  assert.match(home, /assets\/tyres\.svg\?v=20260915logo/);
  assert.match(home, /assets\/power\.svg\?v=20260915logo/);
  assert.match(home, /assets\/water\.svg\?v=20260915logo/);
});

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
    const title = html.match(/<title>([^<]*)<\/title>/);
    if (title && /solar-reality-check|gas-lpg-basics|cassette-toilet-empty/.test(filePath)) {
      assert.ok(
        title[1].length <= 60,
        `${path.relative(root, filePath)} title is ${title[1].length} chars`
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
