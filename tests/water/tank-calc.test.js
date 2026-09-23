#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var waterCalc = require(path.join(__dirname, "..", "..", "water", "assets", "calc.js"));
var waterDefaults = require(path.join(__dirname, "..", "..", "water", "assets", "defaults.js"));
var calc = require(path.join(__dirname, "..", "..", "water", "assets", "tank-calc.js"));
var defaults = require(path.join(__dirname, "..", "..", "water", "assets", "tank-defaults.js"));
var storage = require(path.join(__dirname, "..", "..", "water", "assets", "storage.js"));
var gasDefaults = require(path.join(__dirname, "..", "..", "water", "assets", "gas-defaults.js"));

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

test("defaults are typical UK leisure sizes", function () {
  assert.strictEqual(calc.DEFAULT_GREY_LITRES, 90);
  assert.strictEqual(calc.DEFAULT_CASSETTE_LITRES, 18);
  assert.strictEqual(calc.DEFAULT_FIXED_BLACK_LITRES, 80);
  assert.strictEqual(calc.BLACK_KINDS.cassette.label, "Cassette");
  assert.strictEqual(calc.BLACK_KINDS.fixed.label, "Fixed black tank");
});

test("missing tank plan inherits trip days and fresh tank from water", function () {
  var plan = calc.normalisePlan(null, {
    adults: 3,
    tripDays: 9,
    freshTankLitres: 140,
  });
  assert.strictEqual(plan.tripDays, 9);
  assert.strictEqual(plan.freshTankLitres, 140);
  assert.strictEqual(plan.greyTankLitres, 90);
  assert.strictEqual(plan.blackKind, "cassette");
  assert.strictEqual(plan.blackTankLitres, 18);
  assert.strictEqual(plan.freshStartPercent, 100);
  assert.strictEqual(plan.greyStartPercent, 0);
  assert.strictEqual(plan.blackStartPercent, 0);
});

test("own tank trip days and fresh size are not overwritten by water", function () {
  var plan = calc.normalisePlan(
    { tripDays: 4, freshTankLitres: 80 },
    { tripDays: 9, freshTankLitres: 140 }
  );
  assert.strictEqual(plan.tripDays, 4);
  assert.strictEqual(plan.freshTankLitres, 80);
});

test("weekend water + typical tanks: fresh is the limit", function () {
  var water = waterDefaults.PRESETS.weekend.usage;
  var waterResult = waterCalc.calcWater(water);
  var result = calc.calcTanks(defaults.PRESETS.typicalUk.usage, water);
  almostEqual(result.freshDaily, waterResult.freshDaily);
  almostEqual(result.greyDaily, waterResult.greyDaily);
  almostEqual(result.blackDaily, waterResult.cassetteDaily);
  almostEqual(result.daysFresh, 100 / waterResult.freshDaily);
  almostEqual(result.daysGrey, 90 / waterResult.greyDaily);
  almostEqual(result.daysBlack, 19 / waterResult.cassetteDaily);
  assert.ok(result.daysFresh < result.daysGrey);
  assert.strictEqual(result.limiter.id, "fresh");
  almostEqual(result.stretchDays, result.daysFresh);
  assert.strictEqual(result.freshFills, 0);
  assert.strictEqual(result.greyEmpties, 0);
  assert.strictEqual(result.blackEmpties, 0);
});

test("smaller grey tank can fill before fresh runs dry", function () {
  var water = {
    adults: 2,
    children: 0,
    tripDays: 4,
    showersPerPersonPerDay: 1,
    showerStyle: "custom",
    showerLitres: 10,
    washUpLitresPerDay: 8,
    laundryEnabled: false,
    drinkCookLitresPerPersonPerDay: 2,
    cassetteEnabled: true,
    cassetteFlushesPerPersonPerDay: 4,
    cassetteLitresPerFlush: 0.25,
    freshTankLitres: 120,
  };
  var waterResult = waterCalc.calcWater(water);
  var result = calc.calcTanks(
    {
      tripDays: 4,
      freshTankLitres: 120,
      greyTankLitres: 40,
      blackKind: "cassette",
      blackTankLitres: 18,
    },
    water
  );
  almostEqual(result.freshDaily, waterResult.freshDaily);
  almostEqual(result.greyDaily, waterResult.greyDaily);
  almostEqual(result.daysFresh, 120 / waterResult.freshDaily);
  almostEqual(result.daysGrey, 40 / waterResult.greyDaily);
  assert.ok(result.daysGrey < result.daysFresh);
  assert.strictEqual(result.limiter.id, "grey");
});

test("starting fill and empty levels change usable litres", function () {
  var water = {
    adults: 2,
    tripDays: 2,
    showersPerPersonPerDay: 0,
    showerStyle: "custom",
    showerLitres: 0,
    washUpLitresPerDay: 10,
    drinkCookLitresPerPersonPerDay: 0,
    cassetteEnabled: true,
    cassetteFlushesPerPersonPerDay: 2,
    cassetteLitresPerFlush: 0.5,
    freshTankLitres: 100,
  };
  var result = calc.calcTanks(
    {
      tripDays: 2,
      freshTankLitres: 100,
      greyTankLitres: 80,
      blackTankLitres: 20,
      freshStartPercent: 50,
      greyStartPercent: 25,
      blackStartPercent: 50,
    },
    water
  );
  almostEqual(result.freshUsable, 50);
  almostEqual(result.greyUsable, 60);
  almostEqual(result.blackUsable, 10);
  almostEqual(result.freshDaily, 12);
  almostEqual(result.greyDaily, 10);
  almostEqual(result.blackDaily, 2);
  almostEqual(result.daysFresh, 50 / 12);
  almostEqual(result.daysGrey, 60 / 10);
  almostEqual(result.daysBlack, 10 / 2);
});

test("trip longer than the tanks needs extra fill and empty stops", function () {
  var water = {
    adults: 2,
    tripDays: 10,
    showersPerPersonPerDay: 0,
    showerStyle: "custom",
    showerLitres: 0,
    washUpLitresPerDay: 20,
    drinkCookLitresPerPersonPerDay: 0,
    cassetteEnabled: true,
    cassetteFlushesPerPersonPerDay: 2,
    cassetteLitresPerFlush: 0.5,
    freshTankLitres: 40,
  };
  var result = calc.calcTanks(
    {
      tripDays: 10,
      freshTankLitres: 40,
      greyTankLitres: 40,
      blackTankLitres: 10,
      freshStartPercent: 100,
      greyStartPercent: 0,
      blackStartPercent: 0,
    },
    water
  );
  almostEqual(result.freshDaily, 22);
  almostEqual(result.greyDaily, 20);
  almostEqual(result.blackDaily, 2);
  almostEqual(result.daysFresh, 40 / 22);
  almostEqual(result.daysGrey, 2);
  almostEqual(result.daysBlack, 5);
  assert.strictEqual(result.freshFills, 5);
  assert.strictEqual(result.greyEmpties, 4);
  assert.strictEqual(result.blackEmpties, 1);
});

test("zero daily use does not invent black or grey days", function () {
  var result = calc.calcTanks(
    defaults.createDefaultPlan(),
    {
      adults: 1,
      tripDays: 2,
      showersPerPersonPerDay: 0,
      showerStyle: "custom",
      showerLitres: 0,
      washUpLitresPerDay: 0,
      drinkCookLitresPerPersonPerDay: 2,
      cassetteEnabled: false,
      freshTankLitres: 40,
    }
  );
  almostEqual(result.freshDaily, 2);
  almostEqual(result.greyDaily, 0);
  almostEqual(result.blackDaily, 0);
  almostEqual(result.daysGrey, 0);
  almostEqual(result.daysBlack, 0);
  assert.strictEqual(result.limiter.id, "fresh");
  assert.strictEqual(result.greyEmpties, 0);
  assert.strictEqual(result.blackEmpties, 0);
});

test("switching to a fixed black tank lifts a cassette-sized value", function () {
  assert.strictEqual(calc.blackLitresForKind("fixed", 18), 80);
  assert.strictEqual(calc.blackLitresForKind("cassette", 80), 18);
  assert.strictEqual(calc.blackLitresForKind("fixed", 60), 60);
  assert.strictEqual(calc.blackLitresForKind("cassette", 19), 19);
});

test("sanitise keeps tank sizes that do not start with the default digit", function () {
  var cassettePlan = calc.normalisePlan({
    freshTankLitres: 80,
    greyTankLitres: 65,
    blackKind: "cassette",
    blackTankLitres: 20,
  });
  assert.strictEqual(cassettePlan.freshTankLitres, 80);
  assert.strictEqual(cassettePlan.greyTankLitres, 65);
  assert.strictEqual(cassettePlan.blackKind, "cassette");
  assert.strictEqual(cassettePlan.blackTankLitres, 20);

  var fixedPlan = calc.normalisePlan({
    greyTankLitres: 100,
    blackKind: "fixed",
    blackTankLitres: 50,
  });
  assert.strictEqual(fixedPlan.greyTankLitres, 100);
  assert.strictEqual(fixedPlan.blackKind, "fixed");
  assert.strictEqual(fixedPlan.blackTankLitres, 50);
});

test("clamps days, tank size, and percents", function () {
  var plan = calc.normalisePlan({
    tripDays: 0,
    freshTankLitres: 900,
    greyTankLitres: -10,
    blackTankLitres: 12,
    freshStartPercent: 140,
    greyStartPercent: -5,
    blackStartPercent: 55,
    blackKind: "mystery",
  });
  assert.strictEqual(plan.tripDays, 0.5);
  assert.strictEqual(plan.freshTankLitres, 500);
  assert.strictEqual(plan.greyTankLitres, 0);
  assert.strictEqual(plan.blackKind, "cassette");
  assert.strictEqual(plan.freshStartPercent, 100);
  assert.strictEqual(plan.greyStartPercent, 0);
  assert.strictEqual(plan.blackStartPercent, 55);
});

test("storage writes tankPlan beside waterUsage and gasUsage", function () {
  var clean = storage.sanitiseProfile({
    version: 1,
    waterUsage: waterDefaults.createDefaultUsage(),
    gasUsage: gasDefaults.PRESETS.weekendSummer.usage,
    tankPlan: defaults.PRESETS.weekendWild.usage,
  });
  assert.strictEqual(clean.version, 1);
  assert.ok(clean.waterUsage);
  assert.ok(clean.gasUsage);
  assert.ok(clean.tankPlan);
  assert.strictEqual(clean.tankPlan.activePreset, "weekendWild");
  assert.strictEqual(clean.tankPlan.freshTankLitres, 80);
  assert.strictEqual(clean.tankPlan.greyTankLitres, 65);
  assert.strictEqual(clean.gasUsage.activePreset, "weekendSummer");
});

test("applyTankPreset leaves water habits and gas usage alone", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "winterWeek");
  profile = storage.applyTankPreset(profile, "weekendWild");
  assert.strictEqual(profile.waterUsage.activePreset, "family");
  assert.strictEqual(profile.waterUsage.children, 2);
  assert.strictEqual(profile.waterUsage.washUpLitresPerDay, 10);
  assert.strictEqual(profile.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(profile.tankPlan.activePreset, "weekendWild");
  assert.strictEqual(profile.tankPlan.freshTankLitres, 80);
  assert.strictEqual(profile.waterUsage.freshTankLitres, 80);
});

test("defaults tank preset inherits water trip days and fresh tank", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyTankPreset(profile, "defaults");
  assert.strictEqual(profile.tankPlan.tripDays, 7);
  assert.strictEqual(profile.tankPlan.freshTankLitres, 120);
  assert.strictEqual(profile.tankPlan.greyTankLitres, 90);
  assert.strictEqual(profile.tankPlan.activePreset, "defaults");
});

test("family-week tank preset is a 7-day comparison", function () {
  var result = calc.calcTanks(
    defaults.PRESETS.familyWeek.usage,
    waterDefaults.PRESETS.family.usage
  );
  assert.strictEqual(result.plan.tripDays, 7);
  assert.strictEqual(result.plan.freshTankLitres, 120);
  assert.strictEqual(result.plan.blackKind, "cassette");
  assert.ok(result.stretchDays > 0);
  assert.ok(result.limiter);
});

test("storage key stays watertools.systemProfile", function () {
  assert.strictEqual(storage.STORAGE_KEY, "watertools.systemProfile");
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
