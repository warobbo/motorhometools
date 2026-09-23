#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var calc = require(path.join(__dirname, "..", "..", "water", "assets", "calc.js"));
var defaults = require(path.join(__dirname, "..", "..", "water", "assets", "defaults.js"));
var storage = require(path.join(__dirname, "..", "..", "water", "assets", "storage.js"));

var failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    failed += 1;
    console.error("fail - " + name);
    console.error("  " + err.message);
  }
}

function almostEqual(actual, expected, message) {
  var delta = Math.abs(actual - expected);
  assert.ok(delta < 0.001, message || actual + " should be close to " + expected);
}

test("people units count children at 0.7", function () {
  almostEqual(calc.peopleUnits(2, 2), 2 + 2 * 0.7);
  almostEqual(calc.peopleUnits(2, 0), 2);
});

test("short shower style is 6 L / 1.5 min", function () {
  assert.strictEqual(calc.SHOWER_STYLES.short.litres, 6);
  assert.strictEqual(calc.SHOWER_STYLES.short.minutes, 1.5);
  assert.strictEqual(calc.litresFromMinutes(1.5), 6);
  assert.strictEqual(calc.litresFromMinutes(3), 12);
});

test("weekend two people: fresh trip, grey, and weight", function () {
  var usage = defaults.PRESETS.weekend.usage;
  var result = calc.calcWater(usage);
  var units = 2;
  var showerDaily = units * 0.5 * 6;
  var washDaily = 5;
  var drinkDaily = units * 2.5;
  var cassetteDaily = 2 * 4 * 0.25;
  var freshDaily = showerDaily + washDaily + drinkDaily + cassetteDaily;
  almostEqual(result.freshDaily, freshDaily);
  almostEqual(result.freshTrip, freshDaily * 2);
  almostEqual(result.greyDaily, showerDaily + washDaily);
  almostEqual(result.greyTrip, (showerDaily + washDaily) * 2);
  almostEqual(result.tripWeightKg, result.freshTrip);
  assert.ok(result.hasTank);
  almostEqual(result.daysUntilEmpty, 100 / freshDaily);
});

test("grey water excludes drinking and cassette", function () {
  var result = calc.calcWater({
    adults: 2,
    children: 0,
    tripDays: 1,
    showersPerPersonPerDay: 1,
    showerStyle: "custom",
    showerMinutes: 3,
    showerLitres: 10,
    washUpLitresPerDay: 4,
    laundryEnabled: false,
    drinkCookLitresPerPersonPerDay: 3,
    cassetteEnabled: true,
    cassetteFlushesPerPersonPerDay: 4,
    cassetteLitresPerFlush: 0.25,
    freshTankLitres: 0,
  });
  almostEqual(result.freshDaily, 20 + 4 + 6 + 2);
  almostEqual(result.greyDaily, 20 + 4);
  almostEqual(result.drinkDaily, 6);
  almostEqual(result.cassetteDaily, 2);
});

test("laundry is spread across the trip", function () {
  var result = calc.calcWater({
    adults: 2,
    children: 0,
    tripDays: 5,
    showersPerPersonPerDay: 0,
    showerStyle: "custom",
    showerLitres: 0,
    washUpLitresPerDay: 0,
    laundryEnabled: true,
    laundryLitresPerLoad: 15,
    laundryLoadsPerTrip: 1,
    drinkCookLitresPerPersonPerDay: 0,
    cassetteEnabled: false,
    freshTankLitres: 0,
  });
  almostEqual(result.laundryTrip, 15);
  almostEqual(result.laundryDaily, 3);
  almostEqual(result.freshTrip, 15);
});

test("family week includes children and laundry", function () {
  var result = calc.calcWater(defaults.PRESETS.family.usage);
  assert.strictEqual(result.usage.adults, 2);
  assert.strictEqual(result.usage.children, 2);
  assert.strictEqual(result.usage.tripDays, 7);
  assert.ok(result.freshDaily > 40);
  assert.ok(result.freshTrip > 300);
  assert.ok(result.greyDaily > 0);
  assert.ok(result.laundryTrip > 0);
});

test("empty tank hides days-until-empty", function () {
  var result = calc.calcWater({
    adults: 1,
    tripDays: 2,
    showersPerPersonPerDay: 1,
    showerStyle: "short",
    drinkCookLitresPerPersonPerDay: 2,
    cassetteEnabled: false,
    freshTankLitres: 0,
  });
  assert.strictEqual(result.hasTank, false);
  assert.strictEqual(result.daysUntilEmpty, 0);
});

test("clamps people, days, and tank size", function () {
  var usage = calc.normaliseUsage({
    adults: 99,
    children: -3,
    tripDays: 0,
    freshTankLitres: 900,
  });
  assert.strictEqual(usage.adults, 20);
  assert.strictEqual(usage.children, 0);
  assert.strictEqual(usage.tripDays, 0.5);
  assert.strictEqual(usage.freshTankLitres, 500);
});

test("storage sanitise keeps later sibling keys", function () {
  var clean = storage.sanitiseProfile({
    version: 1,
    waterUsage: defaults.createDefaultUsage(),
    gas: { note: "later slice" },
  });
  assert.strictEqual(clean.version, 1);
  assert.ok(clean.waterUsage);
  assert.deepStrictEqual(clean.gas, { note: "later slice" });
});

test("applyPreset sets weekend figures", function () {
  var profile = storage.applyPreset(defaults.createDefaultProfile(), "weekend");
  assert.strictEqual(profile.waterUsage.activePreset, "weekend");
  assert.strictEqual(profile.waterUsage.tripDays, 2);
  assert.strictEqual(profile.waterUsage.adults, 2);
});

test("storage key is watertools.systemProfile", function () {
  assert.strictEqual(storage.STORAGE_KEY, "watertools.systemProfile");
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
