#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var waterDefaults = require(path.join(__dirname, "..", "..", "water", "assets", "defaults.js"));
var tankDefaults = require(path.join(__dirname, "..", "..", "water", "assets", "tank-defaults.js"));
var calc = require(path.join(__dirname, "..", "..", "water", "assets", "cassette-calc.js"));
var defaults = require(path.join(__dirname, "..", "..", "water", "assets", "cassette-defaults.js"));
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

test("defaults match a typical Thetford-style cassette", function () {
  assert.strictEqual(calc.DEFAULT_CASSETTE_LITRES, 18);
  assert.strictEqual(calc.DEFAULT_FIXED_BLACK_LITRES, 80);
  assert.strictEqual(calc.DEFAULT_FLUSHES, 5);
  assert.strictEqual(calc.DEFAULT_LITRES_PER_FLUSH, 0.25);
  assert.strictEqual(calc.blackLabel("cassette"), "Cassette");
  assert.strictEqual(calc.blackLabel("fixed"), "Fixed black tank");
});

test("missing plan inherits people, trip and flushes from water", function () {
  var plan = calc.normalisePlan(null, {
    adults: 3,
    children: 1,
    tripDays: 9,
    cassetteFlushesPerPersonPerDay: 6,
    cassetteLitresPerFlush: 0.3,
  });
  assert.strictEqual(plan.adults, 3);
  assert.strictEqual(plan.children, 1);
  assert.strictEqual(plan.tripDays, 9);
  assert.strictEqual(plan.flushesPerPersonPerDay, 6);
  assert.strictEqual(plan.litresPerFlush, 0.3);
  assert.strictEqual(plan.blackKind, "cassette");
  assert.strictEqual(plan.blackTankLitres, 18);
  assert.strictEqual(plan.startPercent, 0);
});

test("missing plan inherits cassette size and start fill from tanks", function () {
  var plan = calc.normalisePlan(
    null,
    { adults: 2, tripDays: 2 },
    { blackKind: "fixed", blackTankLitres: 60, blackStartPercent: 25 }
  );
  assert.strictEqual(plan.blackKind, "fixed");
  assert.strictEqual(plan.blackTankLitres, 60);
  assert.strictEqual(plan.startPercent, 25);
});

test("own cassette figures are not overwritten by water or tanks", function () {
  var plan = calc.normalisePlan(
    {
      adults: 1,
      tripDays: 4,
      flushesPerPersonPerDay: 3,
      litresPerFlush: 0.2,
      blackTankLitres: 20,
      startPercent: 10,
    },
    {
      adults: 4,
      tripDays: 9,
      cassetteFlushesPerPersonPerDay: 8,
      cassetteLitresPerFlush: 0.4,
    },
    { blackTankLitres: 80, blackStartPercent: 50 }
  );
  assert.strictEqual(plan.adults, 1);
  assert.strictEqual(plan.tripDays, 4);
  assert.strictEqual(plan.flushesPerPersonPerDay, 3);
  assert.strictEqual(plan.litresPerFlush, 0.2);
  assert.strictEqual(plan.blackTankLitres, 20);
  assert.strictEqual(plan.startPercent, 10);
});

test("weekend couple: days until empty and one empty at the end", function () {
  var result = calc.calcCassette(defaults.PRESETS.weekendCouple.usage);
  almostEqual(result.wasteDaily, 2 * 4 * 0.25);
  almostEqual(result.wasteTrip, 2 * 2);
  almostEqual(result.usable, 18);
  almostEqual(result.daysUntilEmpty, 18 / 2);
  assert.strictEqual(result.emptiesNeeded, 1);
  assert.strictEqual(result.extraEmpties, 0);
  assert.strictEqual(result.blackLabel, "Cassette");
});

test("family week needs more than one empty", function () {
  var result = calc.calcCassette(defaults.PRESETS.familyWeek.usage);
  almostEqual(result.heads, 4);
  almostEqual(result.wasteDaily, 4 * 5 * 0.25);
  almostEqual(result.wasteTrip, 5 * 7);
  almostEqual(result.daysUntilEmpty, 19 / 5);
  assert.strictEqual(result.emptiesNeeded, 2);
  assert.strictEqual(result.extraEmpties, 1);
});

test("solo wild camp covers a short stretch", function () {
  var result = calc.calcCassette(defaults.PRESETS.soloWild.usage);
  almostEqual(result.wasteDaily, 1);
  almostEqual(result.wasteTrip, 3);
  almostEqual(result.daysUntilEmpty, 17);
  assert.strictEqual(result.emptiesNeeded, 1);
  assert.strictEqual(result.extraEmpties, 0);
});

test("zero people means no waste and no invented days", function () {
  var result = calc.calcCassette({
    adults: 0,
    children: 0,
    tripDays: 4,
    blackTankLitres: 18,
    flushesPerPersonPerDay: 5,
    litresPerFlush: 0.25,
    startPercent: 0,
  });
  almostEqual(result.heads, 0);
  almostEqual(result.wasteDaily, 0);
  almostEqual(result.wasteTrip, 0);
  almostEqual(result.daysUntilEmpty, 0);
  assert.strictEqual(result.emptiesNeeded, 0);
  assert.strictEqual(result.extraEmpties, 0);
});

test("zero flushes means no waste and no invented days", function () {
  var result = calc.calcCassette({
    adults: 2,
    children: 0,
    tripDays: 4,
    blackTankLitres: 18,
    flushesPerPersonPerDay: 0,
    litresPerFlush: 0.25,
    startPercent: 0,
  });
  almostEqual(result.wasteDaily, 0);
  almostEqual(result.daysUntilEmpty, 0);
  assert.strictEqual(result.emptiesNeeded, 0);
});

test("full start percent needs emptying now", function () {
  var result = calc.calcCassette({
    adults: 2,
    tripDays: 2,
    blackTankLitres: 18,
    flushesPerPersonPerDay: 4,
    litresPerFlush: 0.25,
    startPercent: 100,
  });
  almostEqual(result.usable, 0);
  almostEqual(result.startLitres, 18);
  almostEqual(result.daysUntilEmpty, 0);
  almostEqual(result.wasteTrip, 4);
  assert.strictEqual(result.emptiesNeeded, 2);
  assert.strictEqual(result.extraEmpties, 1);
});

test("tiny cassette needs many empties", function () {
  var result = calc.calcCassette({
    adults: 2,
    children: 0,
    tripDays: 4,
    blackTankLitres: 2,
    flushesPerPersonPerDay: 5,
    litresPerFlush: 0.25,
    startPercent: 0,
  });
  almostEqual(result.wasteDaily, 2.5);
  almostEqual(result.wasteTrip, 10);
  almostEqual(result.daysUntilEmpty, 2 / 2.5);
  assert.strictEqual(result.emptiesNeeded, 5);
  assert.strictEqual(result.extraEmpties, 4);
});

test("part-full start reduces days until empty", function () {
  var result = calc.calcCassette({
    adults: 2,
    tripDays: 3,
    blackTankLitres: 20,
    flushesPerPersonPerDay: 4,
    litresPerFlush: 0.5,
    startPercent: 25,
  });
  almostEqual(result.wasteDaily, 4);
  almostEqual(result.startLitres, 5);
  almostEqual(result.usable, 15);
  almostEqual(result.daysUntilEmpty, 15 / 4);
  almostEqual(result.wasteTrip, 12);
  assert.strictEqual(result.emptiesNeeded, 1);
  assert.strictEqual(result.extraEmpties, 0);
});

test("switching to a fixed black tank lifts a cassette-sized value", function () {
  assert.strictEqual(calc.blackLitresForKind("fixed", 18), 80);
  assert.strictEqual(calc.blackLitresForKind("cassette", 80), 18);
  assert.strictEqual(calc.blackLitresForKind("fixed", 60), 60);
});

test("clamps people, days, flushes, size and percent", function () {
  var plan = calc.normalisePlan({
    adults: -2,
    children: 40,
    tripDays: 0,
    blackTankLitres: 900,
    flushesPerPersonPerDay: 80,
    litresPerFlush: 12,
    startPercent: 140,
    blackKind: "mystery",
  });
  assert.strictEqual(plan.adults, 0);
  assert.strictEqual(plan.children, 20);
  assert.strictEqual(plan.tripDays, 0.5);
  assert.strictEqual(plan.blackTankLitres, 500);
  assert.strictEqual(plan.flushesPerPersonPerDay, 20);
  assert.strictEqual(plan.litresPerFlush, 5);
  assert.strictEqual(plan.startPercent, 100);
  assert.strictEqual(plan.blackKind, "cassette");
});

test("storage writes cassettePlan beside water, gas and tanks", function () {
  var clean = storage.sanitiseProfile({
    version: 1,
    waterUsage: waterDefaults.createDefaultUsage(),
    gasUsage: gasDefaults.PRESETS.weekendSummer.usage,
    tankPlan: tankDefaults.PRESETS.weekendWild.usage,
    cassettePlan: defaults.PRESETS.weekendCouple.usage,
  });
  assert.strictEqual(clean.version, 1);
  assert.ok(clean.waterUsage);
  assert.ok(clean.gasUsage);
  assert.ok(clean.tankPlan);
  assert.ok(clean.cassettePlan);
  assert.strictEqual(clean.cassettePlan.activePreset, "weekendCouple");
  assert.strictEqual(clean.cassettePlan.blackTankLitres, 18);
  assert.strictEqual(clean.cassettePlan.flushesPerPersonPerDay, 4);
});

test("applyCassettePreset leaves water, gas and tanks alone", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "winterWeek");
  profile = storage.applyTankPreset(profile, "weekendWild");
  profile = storage.applyCassettePreset(profile, "soloWild");
  assert.strictEqual(profile.waterUsage.activePreset, "family");
  assert.strictEqual(profile.waterUsage.children, 2);
  assert.strictEqual(profile.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(profile.tankPlan.activePreset, "weekendWild");
  assert.strictEqual(profile.tankPlan.freshTankLitres, 80);
  assert.strictEqual(profile.cassettePlan.activePreset, "soloWild");
  assert.strictEqual(profile.cassettePlan.adults, 1);
  assert.strictEqual(profile.cassettePlan.blackTankLitres, 17);
});

test("defaults cassette preset inherits water people and tank size", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyTankPreset(profile, "typicalUk");
  profile = storage.applyCassettePreset(profile, "defaults");
  assert.strictEqual(profile.cassettePlan.adults, 2);
  assert.strictEqual(profile.cassettePlan.children, 2);
  assert.strictEqual(profile.cassettePlan.tripDays, 7);
  assert.strictEqual(profile.cassettePlan.blackTankLitres, 19);
  assert.strictEqual(profile.cassettePlan.flushesPerPersonPerDay, 5);
  assert.strictEqual(profile.cassettePlan.activePreset, "defaults");
});

test("storage key stays watertools.systemProfile", function () {
  assert.strictEqual(storage.STORAGE_KEY, "watertools.systemProfile");
});

test("parseCassettePrefillQuery reads the Ask cassette contract", function () {
  var patch = calc.parseCassettePrefillQuery(
    "cassette.html?adults=2&blackTankLitres=18&flushesPerPersonPerDay=5&litresPerFlush=0.25&startPercent=0"
  );
  assert.ok(patch);
  assert.strictEqual(patch.adults, 2);
  assert.strictEqual(patch.blackTankLitres, 18);
  assert.strictEqual(patch.flushesPerPersonPerDay, 5);
  assert.strictEqual(patch.litresPerFlush, 0.25);
  assert.strictEqual(patch.startPercent, 0);
  assert.strictEqual(patch.tripDays, undefined);
  assert.strictEqual(patch.children, undefined);
  assert.strictEqual(patch.blackKind, undefined);
  assert.strictEqual(patch.cassetteCount, undefined);
});

test("parseCassettePrefillQuery ignores unknown keys and invalid values", function () {
  assert.strictEqual(calc.parseCassettePrefillQuery(""), null);
  assert.strictEqual(calc.parseCassettePrefillQuery("?foo=bar&utm_source=ask"), null);
  var patch = calc.parseCassettePrefillQuery(
    "?adults=nope&children=1&blackKind=portaloo&blackTankLitres=eighteen&flushesPerPersonPerDay=5&litresPerFlush=maybe&startPercent=&cassetteCount=1.5&tripDays=3"
  );
  assert.ok(patch);
  assert.strictEqual(patch.children, 1);
  assert.strictEqual(patch.flushesPerPersonPerDay, 5);
  assert.strictEqual(patch.tripDays, 3);
  assert.strictEqual(patch.adults, undefined);
  assert.strictEqual(patch.blackKind, undefined);
  assert.strictEqual(patch.blackTankLitres, undefined);
  assert.strictEqual(patch.litresPerFlush, undefined);
  assert.strictEqual(patch.startPercent, undefined);
  assert.strictEqual(patch.cassetteCount, undefined);
});

test("parseCassettePrefillQuery accepts cassette, fixed and fixedBlack", function () {
  assert.strictEqual(calc.parseCassettePrefillQuery("?blackKind=cassette").blackKind, "cassette");
  assert.strictEqual(calc.parseCassettePrefillQuery("?blackKind=fixed").blackKind, "fixed");
  assert.strictEqual(calc.parseCassettePrefillQuery("?blackKind=fixedBlack").blackKind, "fixed");
  assert.strictEqual(calc.parseCassettePrefillQuery("?blackKind=fixed-black").blackKind, "fixed");
});

test("parseCassettePrefillQuery accepts a positive integer cassetteCount", function () {
  var patch = calc.parseCassettePrefillQuery("?cassetteCount=2");
  assert.strictEqual(patch.cassetteCount, 2);
  assert.strictEqual(calc.parseCassettePrefillQuery("?cassetteCount=0"), null);
  assert.strictEqual(calc.parseCassettePrefillQuery("?cassetteCount=-1"), null);
  assert.strictEqual(calc.parseCassettePrefillQuery("?cassetteCount=two"), null);
});

test("applyCassettePrefillToPlan patches after defaults and keeps water and tanks", function () {
  var water = {
    adults: 4,
    children: 2,
    tripDays: 10,
    cassetteFlushesPerPersonPerDay: 8,
    cassetteLitresPerFlush: 0.4,
  };
  var tank = { blackKind: "fixed", blackTankLitres: 60, blackStartPercent: 25 };
  var plan = defaults.createDefaultPlan(water, tank);
  assert.strictEqual(plan.adults, 4);
  assert.strictEqual(plan.children, 2);
  assert.strictEqual(plan.blackTankLitres, 60);
  assert.strictEqual(plan.flushesPerPersonPerDay, 8);

  var next = calc.applyCassettePrefillToPlan(
    plan,
    "?adults=2&blackTankLitres=18&flushesPerPersonPerDay=5&litresPerFlush=0.25&startPercent=0",
    water,
    tank
  );
  assert.ok(next);
  assert.strictEqual(next.adults, 2);
  assert.strictEqual(next.children, 2);
  assert.strictEqual(next.tripDays, 10);
  assert.strictEqual(next.blackKind, "fixed");
  assert.strictEqual(next.blackTankLitres, 18);
  assert.strictEqual(next.flushesPerPersonPerDay, 5);
  assert.strictEqual(next.litresPerFlush, 0.25);
  assert.strictEqual(next.startPercent, 0);
  assert.strictEqual(next.activePreset, "");

  assert.strictEqual(water.adults, 4);
  assert.strictEqual(water.cassetteFlushesPerPersonPerDay, 8);
  assert.strictEqual(tank.blackTankLitres, 60);
  assert.strictEqual(tank.blackStartPercent, 25);
});

test("applyCassettePrefillToPlan does not invent omitted flush rates or tank sizes", function () {
  var plan = defaults.createDefaultPlan();
  var next = calc.applyCassettePrefillToPlan(plan, "?adults=1&children=1");
  assert.strictEqual(next.adults, 1);
  assert.strictEqual(next.children, 1);
  assert.strictEqual(next.tripDays, 2);
  assert.strictEqual(next.blackKind, "cassette");
  assert.strictEqual(next.blackTankLitres, 18);
  assert.strictEqual(next.flushesPerPersonPerDay, 5);
  assert.strictEqual(next.litresPerFlush, 0.25);
  assert.strictEqual(next.startPercent, 0);
});

test("Ask default-looking query matches createDefaultPlan fields", function () {
  var next = calc.applyCassettePrefillToPlan(
    defaults.createDefaultPlan(),
    "?adults=2&blackTankLitres=18&flushesPerPersonPerDay=5&litresPerFlush=0.25&startPercent=0"
  );
  var expected = calc.normalisePlan(defaults.createDefaultPlan());
  assert.strictEqual(next.adults, expected.adults);
  assert.strictEqual(next.children, expected.children);
  assert.strictEqual(next.tripDays, expected.tripDays);
  assert.strictEqual(next.blackKind, expected.blackKind);
  assert.strictEqual(next.blackTankLitres, expected.blackTankLitres);
  assert.strictEqual(next.flushesPerPersonPerDay, expected.flushesPerPersonPerDay);
  assert.strictEqual(next.litresPerFlush, expected.litresPerFlush);
  assert.strictEqual(next.startPercent, expected.startPercent);
});

test("cassetteCount multiplies blackTankLitres for planning", function () {
  var twoCassettes = calc.applyCassettePrefillToPlan(
    defaults.createDefaultPlan(),
    "?blackTankLitres=18&cassetteCount=2"
  );
  assert.strictEqual(twoCassettes.blackTankLitres, 36);

  var inherited = calc.applyCassettePrefillToPlan(defaults.createDefaultPlan(), "?cassetteCount=2");
  assert.strictEqual(inherited.blackTankLitres, 36);
  assert.strictEqual(inherited.flushesPerPersonPerDay, 5);
  assert.strictEqual(inherited.litresPerFlush, 0.25);
});

test("applyCassettePrefillToPlan returns null when nothing valid is present", function () {
  var plan = defaults.createDefaultPlan();
  assert.strictEqual(calc.applyCassettePrefillToPlan(plan, ""), null);
  assert.strictEqual(calc.applyCassettePrefillToPlan(plan, "?foo=1&blackKind=nope&cassetteCount=0"), null);
});

test("buildCassettePrefillHref round-trips through the parser", function () {
  var plan = {
    adults: 2,
    children: 1,
    tripDays: 5,
    blackKind: "fixed",
    blackTankLitres: 80,
    flushesPerPersonPerDay: 4,
    litresPerFlush: 0.3,
    startPercent: 10,
  };
  var href = calc.buildCassettePrefillHref(plan);
  assert.ok(href.indexOf("cassette.html?") === 0);
  assert.ok(href.indexOf("blackKind=fixed") !== -1);
  assert.ok(href.indexOf("blackTankLitres=80") !== -1);
  assert.ok(href.indexOf("cassetteCount=") === -1);

  var again = calc.applyCassettePrefillToPlan(defaults.createDefaultPlan(), href);
  assert.strictEqual(again.adults, 2);
  assert.strictEqual(again.children, 1);
  assert.strictEqual(again.tripDays, 5);
  assert.strictEqual(again.blackKind, "fixed");
  assert.strictEqual(again.blackTankLitres, 80);
  assert.strictEqual(again.flushesPerPersonPerDay, 4);
  assert.strictEqual(again.litresPerFlush, 0.3);
  assert.strictEqual(again.startPercent, 10);
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
