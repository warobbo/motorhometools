#!/usr/bin/env node
"use strict";

/**
 * Drive Motorhome Tools in system Chrome the way a visitor would.
 *
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
 *     (once, inside .cursor/skills/verify-motorhometools)
 *
 *   node .cursor/skills/verify-motorhometools/scripts/drive.js \
 *     --base http://127.0.0.1:4173 \
 *     --evidence /tmp/motorhometools-verify-evidence/$RUN_ID \
 *     --log /tmp/motorhometools-verify-run/$RUN_ID/server.log
 *
 * Uses a fresh browser context per calculator so localStorage from a
 * previous tool cannot change the defaults. Writes screenshots and
 * results.json under --evidence and does not delete that directory.
 */

const fs = require("fs");
const path = require("path");

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/local/bin/google-chrome"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (err) {
    console.error("drive fail: playwright is not installed for this skill.");
    console.error("From the repo root:");
    console.error("  cd .cursor/skills/verify-motorhometools");
    console.error("  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install");
    console.error("Then re-run this script. It uses system Chrome (CHROME_PATH or /usr/bin/google-chrome), not a downloaded browser.");
    process.exit(1);
  }
}

async function text(page, selector) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "attached", timeout: 10000 });
  return (await locator.innerText()).trim();
}

async function settleNumber(page, selector) {
  await page.waitForFunction(function (sel) {
    const el = document.querySelector(sel);
    if (!el) return false;
    const value = (el.textContent || "").trim();
    return value !== "" && value !== "0";
  }, selector, { timeout: 10000 });
  return text(page, selector);
}

function check(results, name, actual, expected) {
  const pass = actual === expected;
  results.checks.push({ name: name, actual: actual, expected: expected, pass: pass });
  console.log((pass ? "ok  " : "FAIL") + "  " + name + " = " + JSON.stringify(actual) + (pass ? "" : " expected " + JSON.stringify(expected)));
  return pass;
}

async function shot(page, evidence, name) {
  const file = path.join(evidence, name + ".png");
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function fresh(browser, viewport) {
  return browser.newContext({
    viewport: viewport || { width: 1280, height: 900 },
    locale: "en-GB",
    reducedMotion: "reduce"
  });
}

async function open(page, base, urlPath) {
  await page.goto(base.replace(/\/$/, "") + urlPath, { waitUntil: "domcontentloaded" });
}

async function onlyFridge(page) {
  const cards = page.locator("#appliance-list article.appliance-card");
  const count = await cards.count();
  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    const id = await card.getAttribute("data-id");
    if (id === "fridge") continue;
    const box = card.locator('input[data-field="enabled"]');
    if (await box.isChecked()) await box.click();
  }
}

async function main() {
  const base = arg("--base", "http://127.0.0.1:4173");
  const evidence = arg("--evidence", "/tmp/motorhometools-verify-evidence/manual");
  const logPath = arg("--log", "");
  fs.mkdirSync(evidence, { recursive: true });

  const executablePath = chromePath();
  if (!executablePath) {
    console.error("drive fail: no system Chrome. Set CHROME_PATH to the google-chrome binary.");
    process.exit(1);
  }

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    executablePath: executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const results = {
    base: base,
    chrome: executablePath,
    checks: [],
    screenshots: []
  };
  const report = path.join(evidence, "results.json");

  try {
    await drivePower(browser, base, evidence, results);
    await drivePowerHoursLimit(browser, base, evidence, results);
    await driveBatteryDefault(browser, base, evidence, results);
    await driveSolar(browser, base, evidence, results);
    await driveInverter(browser, base, evidence, results);
    await driveWire(browser, base, evidence, results);
    await driveWater(browser, base, evidence, results);
    await driveGas(browser, base, evidence, results);
    await driveTanks(browser, base, evidence, results);
    await driveCassette(browser, base, evidence, results);
    await driveAsk(browser, base, evidence, results, logPath);
    await driveMobile(browser, base, evidence, results);
  } catch (err) {
    results.error = err && err.stack ? err.stack : String(err);
    throw err;
  } finally {
    await browser.close();
    fs.writeFileSync(report, JSON.stringify(results, null, 2));
    console.log("drive evidence " + report);
  }

  const failed = results.checks.filter(function (item) { return !item.pass; });
  console.log("drive screenshots " + results.screenshots.length);
  if (failed.length) {
    console.error("drive fail: " + failed.length + " check(s)");
    process.exit(1);
  }
  console.log("drive ok " + results.checks.length + " checks");
}

async function drivePower(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/power/");
  let value = await settleNumber(page, "#total-wh");
  check(results, "power default Wh/day", value, "917");
  check(results, "power default Ah 12V", await text(page, "#total-ah12"), "76.4");
  check(results, "power default Ah 24V", await text(page, "#total-ah24"), "38.2");

  await onlyFridge(page);
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-wh");
    return el && el.textContent.trim() === "450";
  }, null, { timeout: 10000 });
  check(results, "power fridge-only Wh/day", await text(page, "#total-wh"), "450");
  check(results, "power fridge-only Ah 12V", await text(page, "#total-ah12"), "37.5");
  check(results, "power fridge-only Ah 24V", await text(page, "#total-ah24"), "18.8");

  await page.locator("#inverter-loss").check();
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-wh");
    return el && el.textContent.trim() === "504";
  }, null, { timeout: 10000 });
  check(results, "power fridge+12% Wh/day", await text(page, "#total-wh"), "504");
  check(results, "power fridge+12% Ah 12V", await text(page, "#total-ah12"), "42");
  check(results, "power fridge+12% Ah 24V", await text(page, "#total-ah24"), "21");
  const loss = await text(page, "#loss-note");
  check(results, "power loss note", loss, "Includes 54 Wh inverter loss (12%). Appliance loads before loss: 450 Wh.");
  results.screenshots.push(await shot(page, evidence, "power-daily-fridge-loss"));

  await page.locator("#inverter-loss").uncheck();
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-wh");
    return el && el.textContent.trim() === "450";
  }, null, { timeout: 10000 });

  await open(page, base, "/power/battery.html");
  value = await settleNumber(page, "#bank-ah12");
  check(results, "battery from fridge-only Ah 12V", value, "103");
  check(results, "battery from fridge-only Ah 24V", await text(page, "#bank-ah24"), "51.6");
  check(results, "battery from fridge-only Wh", await text(page, "#bank-wh"), "1,238");
  results.screenshots.push(await shot(page, evidence, "power-battery-from-fridge"));

  await open(page, base, "/power/solar.html");
  value = await settleNumber(page, "#array-watts");
  check(results, "solar from fridge-only array W", value, "220");
  check(results, "solar from fridge-only 100W panels", await text(page, "#panels-100"), "3");
  check(results, "solar from fridge-only 200W panels", await text(page, "#panels-200"), "2");
  check(results, "solar from fridge-only 400W panels", await text(page, "#panels-400"), "1");
  results.screenshots.push(await shot(page, evidence, "power-solar-from-fridge"));
  await context.close();
}

async function drivePowerHoursLimit(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/power/");
  await settleNumber(page, "#total-wh");
  await onlyFridge(page);
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-wh");
    return el && el.textContent.trim() === "450";
  }, null, { timeout: 10000 });
  const hours = page.locator("#hours-fridge");
  await hours.fill("30");
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-wh");
    return el && el.textContent.trim() === "1,080";
  }, null, { timeout: 10000 });
  check(results, "power hours clamp field", await hours.inputValue(), "24");
  check(results, "power hours clamp Wh/day", await text(page, "#total-wh"), "1,080");
  check(results, "power hours clamp Ah 12V", await text(page, "#total-ah12"), "90");
  check(results, "power hours clamp Ah 24V", await text(page, "#total-ah24"), "45");
  const note = await text(page, "#limit-hours-fridge");
  check(results, "power hours clamp note", note, "Maximum is 24 hours a day. This row uses 24 h.");
  results.screenshots.push(await shot(page, evidence, "power-daily-hours-clamp"));
  await context.close();
}

async function driveBatteryDefault(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/power/battery.html");
  const value = await settleNumber(page, "#bank-ah12");
  check(results, "battery default Ah 12V", value, "210");
  check(results, "battery default Ah 24V", await text(page, "#bank-ah24"), "105");
  check(results, "battery default Wh", await text(page, "#bank-wh"), "2,520");
  results.screenshots.push(await shot(page, evidence, "power-battery-default"));
  await context.close();
}

async function driveSolar(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/power/solar.html");
  const value = await settleNumber(page, "#array-watts");
  check(results, "solar default array W", value, "448");
  check(results, "solar default 100W panels", await text(page, "#panels-100"), "5");
  check(results, "solar default 200W panels", await text(page, "#panels-200"), "3");
  check(results, "solar default 400W panels", await text(page, "#panels-400"), "2");
  results.screenshots.push(await shot(page, evidence, "power-solar-default"));
  await context.close();
}

async function driveInverter(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/power/inverter.html");
  const value = await settleNumber(page, "#inverter-continuous");
  check(results, "inverter default continuous W", value, "1,440");
  check(results, "inverter default surge W", await text(page, "#inverter-surge"), "1,440");
  check(results, "inverter default A 12V", await text(page, "#inverter-amps12"), "114");
  check(results, "inverter default A 24V", await text(page, "#inverter-amps24"), "56.8");
  results.screenshots.push(await shot(page, evidence, "power-inverter-default"));
  await context.close();
}

async function driveWire(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/power/wire.html");
  let value = await settleNumber(page, "#cable-mm2");
  check(results, "wire inverter-feed mm2", value, "25");
  check(results, "wire inverter-feed fuse A", await text(page, "#fuse-amps"), "125");
  check(results, "wire inverter-feed A", await text(page, "#wiring-amps"), "120");
  check(results, "wire inverter-feed drop V", await text(page, "#drop-v"), "0.34");
  check(results, "wire inverter-feed drop %", await text(page, "#drop-pct-out"), "2.8");

  await page.locator('#presets button[data-preset="custom"]').click();
  await page.waitForFunction(function () {
    const el = document.querySelector("#cable-mm2");
    return el && el.textContent.trim() === "6";
  }, null, { timeout: 10000 });
  check(results, "wire custom 20A mm2", await text(page, "#cable-mm2"), "6");
  check(results, "wire custom 20A fuse A", await text(page, "#fuse-amps"), "25");
  check(results, "wire custom 20A current", await text(page, "#wiring-amps"), "20");
  check(results, "wire custom 20A drop V", await text(page, "#drop-v"), "0.35");
  check(results, "wire custom 20A drop %", await text(page, "#drop-pct-out"), "2.9");
  results.screenshots.push(await shot(page, evidence, "power-wire-custom"));
  await context.close();
}

async function driveWater(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/water/");
  let value = await settleNumber(page, "#total-trip");
  check(results, "water default trip L", value, "37");
  check(results, "water default daily L", await text(page, "#total-daily"), "18.5");
  check(results, "water default grey trip L", await text(page, "#grey-trip"), "22");
  check(results, "water default grey daily L", await text(page, "#grey-daily"), "11");

  await page.locator('#shower-styles button[data-shower="normal"]').click();
  await page.locator("#showersPerPersonPerDay").fill("1");
  await page.locator("#showersPerPersonPerDay").dispatchEvent("input");
  await page.locator("#cassetteEnabled").uncheck();
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-trip");
    return el && el.textContent.trim() === "68";
  }, null, { timeout: 10000 });
  check(results, "water edited trip L", await text(page, "#total-trip"), "68");
  check(results, "water edited daily L", await text(page, "#total-daily"), "34");
  check(results, "water edited grey trip L", await text(page, "#grey-trip"), "58");
  check(results, "water edited grey daily L", await text(page, "#grey-daily"), "29");
  const weight = await text(page, "#weight-note");
  check(results, "water edited weight note", weight.includes("68 kg"), true);
  results.screenshots.push(await shot(page, evidence, "water-edited"));
  await context.close();
}

async function driveGas(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/water/gas.html");
  let value = await settleNumber(page, "#total-trip");
  check(results, "gas default trip kg", value, "0.32");
  check(results, "gas default daily kg", await text(page, "#total-daily"), "0.16");
  check(results, "gas default bottle days", await text(page, "#bottle-days"), "44");
  check(results, "gas default bottles", await text(page, "#bottles-needed"), "1");

  await page.locator("#mealsPerDay").fill("1");
  await page.locator("#mealsPerDay").dispatchEvent("input");
  await page.locator('#cooking-styles button[data-cooking="heavy"]').click();
  await page.waitForFunction(function () {
    const el = document.querySelector("#total-daily");
    return el && el.textContent.trim() === "0.14";
  }, null, { timeout: 10000 });
  check(results, "gas heavy one meal trip kg", await text(page, "#total-trip"), "0.28");
  check(results, "gas heavy one meal daily kg", await text(page, "#total-daily"), "0.14");
  check(results, "gas heavy one meal bottle days", await text(page, "#bottle-days"), "50");
  check(results, "gas heavy one meal bottles", await text(page, "#bottles-needed"), "1");
  results.screenshots.push(await shot(page, evidence, "gas-heavy-meal"));
  await context.close();
}

async function driveTanks(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/water/tanks.html");
  const value = await settleNumber(page, "#stretch-days");
  check(results, "tanks default stretch days", value, "5.4");
  check(results, "tanks default fresh days", await text(page, "#fresh-days"), "5.4");
  check(results, "tanks default grey days", await text(page, "#grey-days"), "8.2");
  check(results, "tanks default cassette days", await text(page, "#black-days"), "7.2");
  results.screenshots.push(await shot(page, evidence, "tanks-default"));
  await context.close();
}

async function driveCassette(browser, base, evidence, results) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/water/cassette.html");
  const value = await settleNumber(page, "#empty-days");
  check(results, "cassette default empty days", value, "7.2");
  check(results, "cassette default waste L/day", await text(page, "#waste-daily"), "2.5");
  check(results, "cassette default waste trip L", await text(page, "#waste-trip"), "5.0");
  check(results, "cassette default empties", await text(page, "#empties-needed"), "1");
  results.screenshots.push(await shot(page, evidence, "cassette-default"));
  await context.close();
}

async function driveAsk(browser, base, evidence, results, logPath) {
  const context = await fresh(browser);
  const page = await context.newPage();
  await open(page, base, "/ask/");
  await page.locator("#ask-question").fill("solar");
  await page.locator("#ask-submit").click();
  await page.locator("#ask-status").waitFor({ state: "visible" });
  await page.waitForFunction(function () {
    const el = document.querySelector("#ask-status");
    return el && /can’t calculate that yet/.test(el.textContent || "");
  }, null, { timeout: 10000 });
  const status = await text(page, "#ask-status");
  check(results, "ask solar status", status.includes("Ask can’t calculate that yet"), true);
  const href = await page.locator("#ask-answer a.ask-cta-link").getAttribute("href");
  check(results, "ask solar link", href, "/power/solar.html");
  results.screenshots.push(await shot(page, evidence, "ask-solar"));

  await page.locator("#ask-question").fill("best campsite near York");
  await page.locator("#ask-email").fill("");
  await page.locator("#ask-submit").click();
  await page.waitForFunction(function () {
    const el = document.querySelector("#ask-status");
    return el && /passed this to the site owner/.test(el.textContent || "");
  }, null, { timeout: 10000 });
  const saved = await text(page, "#ask-status");
  check(results, "ask unmatched status", saved.includes("Replies are not automated"), true);
  results.screenshots.push(await shot(page, evidence, "ask-unmatched"));
  await context.close();

  if (logPath) {
    let log = "";
    try {
      log = fs.readFileSync(logPath, "utf8");
    } catch (err) {
      log = "";
    }
    const logged = log.includes("[ask]") && log.includes("best campsite near York");
    check(results, "ask unmatched server log", logged, true);
  }
}

async function driveMobile(browser, base, evidence, results) {
  const portrait = await fresh(browser, { width: 390, height: 844 });
  const page = await portrait.newPage();
  await open(page, base, "/");
  await page.locator("h1").waitFor();
  const homeHeading = await text(page, "h1");
  check(results, "home mobile h1", homeHeading, "Stop guessing your van’s limits");
  const card = await page.locator(".start-card").boundingBox();
  const cardFits = !!(card && card.width > 280 && card.width <= 390);
  check(results, "home mobile payload card width", cardFits, true);
  results.screenshots.push(await shot(page, evidence, "home-mobile-390"));

  await open(page, base, "/power/");
  await settleNumber(page, "#total-wh");
  const gateHidden = await page.locator("#rotate-gate").getAttribute("aria-hidden");
  const gateDisplay = await page.locator("#rotate-gate").evaluate(function (el) {
    return window.getComputedStyle(el).display;
  });
  check(results, "power portrait rotate-gate hidden", gateHidden, "true");
  check(results, "power portrait rotate-gate display", gateDisplay, "none");
  check(results, "power portrait still shows Wh", await text(page, "#total-wh"), "917");
  results.screenshots.push(await shot(page, evidence, "power-mobile-390"));
  await portrait.close();

  const landscape = await fresh(browser, { width: 844, height: 390 });
  const sideways = await landscape.newPage();
  await open(sideways, base, "/power/");
  await sideways.locator("#rotate-gate-title").waitFor({ state: "visible", timeout: 10000 });
  const gateShown = await sideways.locator("#rotate-gate").getAttribute("aria-hidden");
  const gateTitle = await text(sideways, "#rotate-gate-title");
  check(results, "power landscape rotate-gate shown", gateShown, "false");
  check(results, "power landscape rotate-gate title", gateTitle, "Turn your phone upright");
  const mainInert = await sideways.locator("main").getAttribute("inert");
  check(results, "power landscape calculator inert", mainInert !== null, true);
  results.screenshots.push(await shot(sideways, evidence, "power-landscape-gate"));
  await landscape.close();
}

main().catch(function (err) {
  console.error("drive fail: " + (err && err.stack ? err.stack : err));
  process.exit(1);
});
