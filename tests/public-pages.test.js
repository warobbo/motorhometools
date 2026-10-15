"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function walkHtml(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function pngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("favicon.ico is a real icon file", function () {
  const buf = fs.readFileSync(path.join(root, "favicon.ico"));
  assert.equal(buf.readUInt16LE(0), 0);
  assert.equal(buf.readUInt16LE(2), 1);
  assert.ok(buf.readUInt16LE(4) >= 1);
  assert.ok(buf.length > 22);
});

test("the share image is 1200 by 630 and every Open Graph page uses it", function () {
  assert.deepEqual(pngSize(path.join(root, "assets", "og-image.png")), { width: 1200, height: 630 });
  const files = walkHtml(root, []);
  assert.ok(files.length >= 30);
  for (const filePath of files) {
    const html = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(root, filePath);
    assert.match(html, /contact\.html/, rel + " missing contact link");
    assert.match(html, /accessibility\.html/, rel + " missing accessibility link");
    if (!/property="og:(?:title|url|site_name)"/.test(html)) continue;
    assert.match(html, /<meta property="og:image" content="https:\/\/motorhometools\.co\.uk\/assets\/og-image\.png">/, rel);
    assert.match(html, /<meta property="og:image:width" content="1200">/, rel);
    assert.match(html, /<meta property="og:image:height" content="630">/, rel);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, rel);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/motorhometools\.co\.uk\/assets\/og-image\.png">/, rel);
    assert.doesNotMatch(html, /property="og:image" content="[^"]*icon-512/, rel);
  }
});

test("privacy is a UK GDPR notice for Motorhome Tools and shows no email address", function () {
  const html = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
  assert.match(html, /<h1>Privacy<\/h1>/);
  assert.match(html, /Motorhome Tools is the controller/);
  assert.match(html, /href="contact\.html"/);
  assert.match(html, /Ask questions/);
  assert.match(html, /Contact form messages/);
  assert.match(html, /legitimate interests/);
  assert.match(html, /consent/);
  assert.match(html, /12 months/);
  assert.match(html, /access/);
  assert.match(html, /rectification/);
  assert.match(html, /erasure/);
  assert.match(html, /objection/);
  assert.match(html, /https:\/\/ico\.org\.uk\/make-a-complaint\//);
  assert.match(html, /Information Commissioner/);
  assert.match(html, /Render \(hosting, USA region\)/);
  assert.match(html, /Stores the log line so Motorhome Tools can read it/);
  assert.match(html, /Cloudflare \(Workers\/CDN, if used\)/);
  assert.match(html, /May see the connection, including an IP address, in order to deliver the page/);
  assert.doesNotMatch(html, /automated inbox/i);
  assert.doesNotMatch(html, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(html, /wayne|robinson|warobbo/i);
});

test("accessibility statement names WCAG 2.2 AA, the contact form and a date", function () {
  const html = fs.readFileSync(path.join(root, "accessibility.html"), "utf8");
  assert.match(html, /<h1>Accessibility<\/h1>/);
  assert.match(html, /WCAG<\/abbr> 2\.2 level AA/);
  assert.match(html, /href="contact\.html"/);
  assert.match(html, /datetime="2026-10-15"/);
  assert.match(html, /Known issues/);
  assert.doesNotMatch(html, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("contact form posts to /api/contact with one label per field and a honeypot", function () {
  const html = fs.readFileSync(path.join(root, "contact.html"), "utf8");
  assert.match(html, /action="\/api\/contact"/);
  assert.match(html, /id="contact-status"/);
  assert.match(html, /assets\/contact\.js/);
  const honeypot = html.match(/<div class="hp"[^>]*>[\s\S]*?<\/div>/);
  assert.ok(honeypot);
  assert.match(honeypot[0], /\binert\b/);
  assert.match(honeypot[0], /name="website"/);
  assert.doesNotMatch(honeypot[0], /aria-hidden/);
  for (const id of ["contact-name", "contact-email", "contact-message", "contact-website"]) {
    const labels = html.match(new RegExp("<label\\b[^>]*\\bfor=\"" + id + "\"", "g")) || [];
    assert.equal(labels.length, 1, id);
  }
  assert.doesNotMatch(html, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

function labelCounts(html) {
  const labels = [...html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)];
  const counts = new Map();
  for (const match of labels) {
    const attrs = match[1];
    const inner = match[2];
    const explicit = (attrs.match(/\bfor="([^"]+)"/) || [])[1];
    const inputs = [...inner.matchAll(/<(?:input|textarea|select)\b[^>]*\bid="([^"]+)"/g)].map(function (item) {
      return item[1];
    });
    if (explicit && inputs.indexOf(explicit) !== -1) {
      counts.set(explicit, (counts.get(explicit) || 0) + 2);
      continue;
    }
    const ids = new Set(inputs);
    if (explicit) ids.add(explicit);
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

test("Power and Water fields each have one label", function () {
  const pages = {
    "water/index.html": [
      "adults",
      "children",
      "tripDays",
      "freshTankLitres",
      "showersPerPersonPerDay",
      "showerMinutes",
      "showerLitres",
      "washUpLitresPerDay",
      "drinkCookLitresPerPersonPerDay",
      "laundryEnabled",
      "laundryLoadsPerTrip",
      "laundryLitresPerLoad",
      "cassetteEnabled",
      "cassetteFlushesPerPersonPerDay",
      "cassetteLitresPerFlush"
    ],
    "water/gas.html": [
      "adults",
      "children",
      "tripDays",
      "mealsPerDay",
      "heatingHours",
      "fridgeGasEnabled",
      "fridgeHoursPerDay",
      "boilerEnabled",
      "boilerHours",
      "bottleKg"
    ],
    "water/tanks.html": [
      "freshTankLitres",
      "greyTankLitres",
      "blackTankLitres",
      "tripDays",
      "freshStartPercent",
      "greyStartPercent",
      "blackStartPercent"
    ],
    "water/cassette.html": [
      "adults",
      "children",
      "tripDays",
      "blackTankLitres",
      "startPercent",
      "flushesPerPersonPerDay",
      "litresPerFlush"
    ]
  };

  for (const [rel, ids] of Object.entries(pages)) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(html, /<label class="field" for=/, rel);
    const counts = labelCounts(html);
    for (const id of ids) assert.equal(counts.get(id), 1, rel + " " + id);
  }

  const choiceLabels = {
    "water/gas.html": [
      "season-label",
      "cooking-style-label",
      "heating-level-label",
      "boiler-level-label",
      "gas-type-label",
      "bottle-size-label"
    ],
    "water/tanks.html": ["black-kind-label"],
    "water/cassette.html": ["black-kind-label"]
  };
  for (const [rel, ids] of Object.entries(choiceLabels)) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    for (const id of ids) {
      const group = html.match(new RegExp("<div\\b[^>]*\\baria-labelledby=\"" + id + "\"[^>]*>"));
      assert.ok(group, rel + " " + id);
      assert.doesNotMatch(group[0], /\baria-label=/, rel + " " + id);
      assert.equal((html.match(new RegExp("\\bid=\"" + id + "\"", "g")) || []).length, 1, rel + " " + id);
    }
  }

  const water = fs.readFileSync(path.join(root, "water", "index.html"), "utf8");
  assert.match(water, /id="shower-length-label"/);
  assert.match(water, /aria-labelledby="shower-length-label"/);
  assert.doesNotMatch(water, /id="shower-styles"[^>]*aria-label=/);

  const power = fs.readFileSync(path.join(root, "power", "assets", "app.js"), "utf8");
  const field = power.slice(power.indexOf("function field("), power.indexOf("function renderAppliances"));
  assert.match(field, /'<label class="field">'/);
  assert.doesNotMatch(field, /for="/);
});

test("Water pages use the site theme colour", function () {
  const waterDir = path.join(root, "water");
  const files = fs.readdirSync(waterDir).filter(function (name) { return name.endsWith(".html"); });
  assert.ok(files.indexOf("index.html") !== -1);
  for (const name of files) {
    const html = fs.readFileSync(path.join(waterDir, name), "utf8");
    assert.match(html, /<meta name="theme-color" content="#1e4f43">/, name);
    assert.doesNotMatch(html, /name="theme-color" content="#1e5f74"/, name);
  }
});

test("homepage states the tyre-pressure disclaimer once, in the footer", function () {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const normalized = html.replace(/\u2019/g, "'").replace(/&rsquo;|&#8217;/gi, "'");
  const hits = normalized.match(/invent tyre pressures/gi) || [];
  assert.equal(
    hits.length,
    1,
    "invent tyre pressures appears " + hits.length + " times in index.html"
  );
  const headEnd = normalized.indexOf("</head>");
  assert.ok(headEnd !== -1);
  const head = normalized.slice(0, headEnd);
  assert.equal((head.match(/invent tyre pressures/gi) || []).length, 0);
  const footerStart = normalized.indexOf("<footer");
  const footerEnd = normalized.indexOf("</footer>");
  assert.ok(footerStart !== -1 && footerEnd > footerStart);
  const footer = normalized.slice(footerStart, footerEnd);
  assert.equal((footer.match(/invent tyre pressures/gi) || []).length, 1);
  assert.match(
    footer,
    /Planning estimates only\. We don't invent tyre pressures, weights or legal advice\./
  );
  const body = normalized.slice(headEnd, footerStart);
  assert.equal((body.match(/invent tyre pressures/gi) || []).length, 0);
});

test("sitemap lists contact and accessibility and dates this release", function () {
  const xml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.match(xml, /<loc>https:\/\/motorhometools\.co\.uk\/contact\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/motorhometools\.co\.uk\/accessibility\.html<\/loc>/);
  const dates = xml.match(/<lastmod>([^<]+)<\/lastmod>/g);
  assert.ok(dates && dates.length > 10);
  for (const date of dates) assert.equal(date, "<lastmod>2026-10-15</lastmod>");
});
