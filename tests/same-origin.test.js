"use strict";

/**
 * Power and Water now live on this origin.
 * Payload stays on motorhomepayload.co.uk.
 * Old satellite domains are not linked from the hub.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const server = require("../server");
const { routeAsk } = require("../assets/router");
const copilot = require("../lib/copilot");

const ROOT = path.join(__dirname, "..");
const OLD_DOMAIN = /motorhomepower\.co\.uk|motorhomewater\.co\.uk/;

const POWER_PAGES = [
  ["/", "https://motorhometools.co.uk/power/"],
  ["/battery.html", "https://motorhometools.co.uk/power/battery.html"],
  ["/solar.html", "https://motorhometools.co.uk/power/solar.html"],
  ["/inverter.html", "https://motorhometools.co.uk/power/inverter.html"],
  ["/wire.html", "https://motorhometools.co.uk/power/wire.html"]
];

const WATER_PAGES = [
  ["/", "https://motorhometools.co.uk/water/"],
  ["/gas.html", "https://motorhometools.co.uk/water/gas.html"],
  ["/tanks.html", "https://motorhometools.co.uk/water/tanks.html"],
  ["/cassette.html", "https://motorhometools.co.uk/water/cassette.html"],
  ["/bottles.html", null],
  ["/hotwater.html", null],
  ["/winterising.html", null],
  ["/topup.html", null]
];

function walkHtml(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function hrefs(html) {
  return [...html.matchAll(/\shref="([^"]*)"/g)].map(function (match) {
    return match[1];
  });
}

test("hub HTML does not link Power or Water to the old satellite domains", function () {
  const files = walkHtml(ROOT, []);
  assert.ok(files.length >= 20);
  for (const filePath of files) {
    const html = fs.readFileSync(filePath, "utf8");
    for (const href of hrefs(html)) {
      assert.doesNotMatch(href, OLD_DOMAIN, path.relative(ROOT, filePath) + " → " + href);
    }
  }
});

test("homepage Power and Water tiles stay on this origin", function () {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.match(html, /<a class="support-card" href="\/power\/">/);
  assert.match(html, /<a class="support-card" href="\/water\/">/);
  assert.doesNotMatch(html, /href="\/power\/"[^>]*target="_blank"/);
  assert.doesNotMatch(html, /href="\/water\/"[^>]*target="_blank"/);
  assert.match(html, /href="https:\/\/motorhomepayload\.co\.uk\/"/);
  assert.match(html, /href="https:\/\/motorhomepayload\.co\.uk\/tyres\.html"/);
});

test("Ask routes Power and Water to hub paths", function () {
  assert.equal(routeAsk("fridge").href, "/power/");
  assert.equal(routeAsk("leisure battery size").href, "/power/battery.html");
  assert.equal(routeAsk("how many watts of solar do I need").href, "/power/solar.html");
  assert.equal(routeAsk("inverter for a kettle").href, "/power/inverter.html");
  assert.equal(routeAsk("electrical cable").href, "/power/wire.html");
  assert.equal(routeAsk("fresh water").href, "/water/");
  assert.equal(routeAsk("bbq").href, "/water/gas.html");
  assert.equal(routeAsk("holding tanks").href, "/water/tanks.html");
  assert.equal(routeAsk("toilet").href, "/water/cassette.html");
  assert.equal(routeAsk("payload left").href, "https://motorhomepayload.co.uk/");
  assert.equal(copilot.POWER_HREF, "/power/");
  assert.equal(copilot.GAS_HREF, "/water/gas.html");
  assert.equal(copilot.CASSETTE_HREF, "/water/cassette.html");
  assert.equal(
    copilot.buildPowerPrefillHref({ wave3: 1, hours: 4 }),
    "/power/?wave3=1&hours=4#wave3"
  );
});

test("sitemap lists same-origin Power and Water pages and not the old domains", function () {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  for (const page of POWER_PAGES.concat(WATER_PAGES)) {
    if (!page[1]) {
      assert.doesNotMatch(xml, new RegExp(page[0].replace(".", "\\.")), page[0]);
      continue;
    }
    assert.match(xml, new RegExp("<loc>" + page[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</loc>"));
  }
  assert.doesNotMatch(xml, OLD_DOMAIN);
  assert.match(fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8"), /Sitemap: https:\/\/motorhometools\.co\.uk\/sitemap\.xml/);
});

test("slash-less /power and /water redirect so relative assets resolve", async function () {
  await new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  const base = "http://127.0.0.1:" + port;
  try {
    const powerRedirect = await fetch(base + "/power?wave3=1", { redirect: "manual" });
    assert.equal(powerRedirect.status, 301);
    assert.equal(powerRedirect.headers.get("location"), "/power/?wave3=1");

    const waterRedirect = await fetch(base + "/water", { redirect: "manual" });
    assert.equal(waterRedirect.status, 301);
    assert.equal(waterRedirect.headers.get("location"), "/water/");

    const indexRedirect = await fetch(base + "/power/index.html?wave3=1&hours=4", { redirect: "manual" });
    assert.equal(indexRedirect.status, 301);
    assert.equal(indexRedirect.headers.get("location"), "/power/?wave3=1&hours=4");

    for (const page of POWER_PAGES) {
      const response = await fetch(base + "/power" + (page[0] === "/" ? "/" : page[0]));
      const html = await response.text();
      assert.equal(response.status, 200, page[0]);
      assert.match(html, new RegExp('rel="canonical" href="' + page[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
      assert.doesNotMatch(html, OLD_DOMAIN);
      assert.match(html, /assets\/styles\.css\?v=/);
    }

    for (const page of WATER_PAGES) {
      const response = await fetch(base + "/water" + (page[0] === "/" ? "/" : page[0]));
      const html = await response.text();
      assert.equal(response.status, 200, page[0]);
      assert.doesNotMatch(html, OLD_DOMAIN);
      if (page[1]) {
        assert.match(html, new RegExp('rel="canonical" href="' + page[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
        assert.match(html, /name="robots" content="index,follow"/);
      } else {
        assert.match(html, /name="robots" content="noindex,follow"/);
      }
    }

    const powerCss = await fetch(base + "/power/assets/styles.css");
    const waterCss = await fetch(base + "/water/assets/styles.css");
    const hubCss = await fetch(base + "/assets/styles.css");
    assert.equal(powerCss.status, 200);
    assert.equal(waterCss.status, 200);
    assert.equal(hubCss.status, 200);
    const powerBody = await powerCss.text();
    const waterBody = await waterCss.text();
    const hubBody = await hubCss.text();
    assert.notEqual(powerBody, waterBody);
    assert.notEqual(powerBody, hubBody);
    assert.match(await (await fetch(base + "/power/?wave3=1&hours=4")).text(), /assets\/app\.js\?v=/);
    assert.match(await (await fetch(base + "/water/gas.html?cookingStyle=heavy&mealsPerDay=2")).text(), /gas-app\.js\?v=/);
    assert.match(await (await fetch(base + "/water/cassette.html?adults=2&blackTankLitres=18")).text(), /cassette-app\.js\?v=/);
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
});
