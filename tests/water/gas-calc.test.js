#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var calc = require(path.join(__dirname, "..", "..", "water", "assets", "gas-calc.js"));
var defaults = require(path.join(__dirname, "..", "..", "water", "assets", "gas-defaults.js"));
var storage = require(path.join(__dirname, "..", "..", "water", "assets", "storage.js"));
var waterDefaults = require(path.join(__dirname, "..", "..", "water", "assets", "defaults.js"));

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

test("UK rates are the documented planning figures", function () {
  almostEqual(calc.HEATER_KG_PER_HOUR, 0.18);
  almostEqual(calc.FRIDGE_KG_PER_HOUR, 0.016);
  almostEqual(calc.BOILER_KG_PER_HOUR, 0.12);
  almostEqual(calc.COOK_STYLES.light.kgPerPersonPerMeal, 0.025);
  almostEqual(calc.COOK_STYLES.normal.kgPerPersonPerMeal, 0.04);
  almostEqual(calc.COOK_STYLES.heavy.kgPerPersonPerMeal, 0.07);
  assert.strictEqual(calc.BOTTLES.butane45.kg, 4.5);
  assert.strictEqual(calc.BOTTLES.butane7.kg, 7);
  assert.strictEqual(calc.BOTTLES.butane15.kg, 15);
  assert.strictEqual(calc.BOTTLES.propane39.kg, 3.9);
  assert.strictEqual(calc.BOTTLES.propane6.kg, 6);
  assert.strictEqual(calc.BOTTLES.propane13.kg, 13);
});

test("weekend summer is cooking only for two people", function () {
  var result = calc.calcGas(defaults.PRESETS.weekendSummer.usage);
  var cookDaily = 2 * 2 * 0.04;
  almostEqual(result.cookDaily, cookDaily);
  almostEqual(result.heatDaily, 0);
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.boilerDaily, 0);
  almostEqual(result.dailyKg, cookDaily);
  almostEqual(result.tripKg, cookDaily * 2);
  assert.strictEqual(result.usage.gasType, "butane");
  assert.strictEqual(result.usage.bottleKg, 4.5);
  almostEqual(result.bottleDays, 4.5 / cookDaily);
  assert.strictEqual(result.bottlesNeeded, 1);
});

test("winter week uses far more gas than weekend summer", function () {
  var winter = calc.calcGas(defaults.PRESETS.winterWeek.usage);
  var summer = calc.calcGas(defaults.PRESETS.weekendSummer.usage);
  var cookDaily = 2 * 2 * 0.04;
  var heatDaily = 12 * 0.18;
  var fridgeDaily = 24 * 0.016;
  var boilerDaily = 1.5 * 0.12;
  almostEqual(winter.cookDaily, cookDaily);
  almostEqual(winter.heatDaily, heatDaily);
  almostEqual(winter.fridgeDaily, fridgeDaily);
  almostEqual(winter.boilerDaily, boilerDaily);
  almostEqual(winter.dailyKg, cookDaily + heatDaily + fridgeDaily + boilerDaily);
  almostEqual(winter.tripKg, winter.dailyKg * 7);
  assert.ok(winter.dailyKg > 2);
  assert.ok(winter.dailyKg > summer.dailyKg * 10);
  assert.strictEqual(winter.usage.gasType, "propane");
  assert.strictEqual(winter.usage.bottleKg, 13);
  almostEqual(winter.bottleDays, 13 / winter.dailyKg);
  assert.strictEqual(winter.bottlesNeeded, Math.ceil(winter.tripKg / 13 - 1e-9));
  assert.ok(winter.bottlesNeeded >= 2);
});

test("full-time light is a careful week", function () {
  var result = calc.calcGas(defaults.PRESETS.fulltimeLight.usage);
  var cookDaily = 2 * 2 * 0.025;
  var heatDaily = 2 * 0.18;
  var boilerDaily = 0.5 * 0.12;
  almostEqual(result.cookDaily, cookDaily);
  almostEqual(result.heatDaily, heatDaily);
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.boilerDaily, boilerDaily);
  almostEqual(result.dailyKg, cookDaily + heatDaily + boilerDaily);
  assert.ok(result.dailyKg < 1);
  assert.strictEqual(result.bottlesNeeded, 1);
});

test("fridge off uses no fridge gas even if hours are set", function () {
  var result = calc.calcGas({
    adults: 2,
    tripDays: 1,
    mealsPerDay: 0,
    heatingHours: 0,
    heatingLevel: "off",
    fridgeGasEnabled: false,
    fridgeHoursPerDay: 24,
    boilerEnabled: false,
  });
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.dailyKg, 0);
  assert.strictEqual(result.bottlesNeeded, 0);
  almostEqual(result.bottleDays, 0);
});

test("bottles needed rounds up", function () {
  var result = calc.calcGas({
    adults: 2,
    tripDays: 10,
    mealsPerDay: 0,
    heatingLevel: "custom",
    heatingHours: 8,
    fridgeGasEnabled: false,
    boilerEnabled: false,
    gasType: "propane",
    bottleId: "propane13",
    bottleKg: 13,
  });
  almostEqual(result.dailyKg, 8 * 0.18);
  almostEqual(result.tripKg, 14.4);
  assert.strictEqual(result.bottlesNeeded, 2);
});

test("missing gas usage inherits trip days and people from water", function () {
  var usage = calc.normaliseUsage(null, {
    adults: 3,
    children: 1,
    tripDays: 9,
  });
  assert.strictEqual(usage.adults, 3);
  assert.strictEqual(usage.children, 1);
  assert.strictEqual(usage.tripDays, 9);
  assert.strictEqual(usage.gasType, "butane");
  assert.strictEqual(usage.bottleKg, 7);
});

test("own gas trip days are not overwritten by water", function () {
  var usage = calc.normaliseUsage({ tripDays: 4, adults: 1 }, { tripDays: 9, adults: 3 });
  assert.strictEqual(usage.tripDays, 4);
  assert.strictEqual(usage.adults, 1);
});

test("clamps people, days, hours, and bottle size", function () {
  var usage = calc.normaliseUsage({
    adults: 99,
    children: -2,
    tripDays: 0,
    mealsPerDay: 20,
    heatingLevel: "custom",
    heatingHours: 40,
    fridgeHoursPerDay: 40,
    boilerLevel: "custom",
    boilerHours: 20,
    bottleId: "custom",
    bottleKg: 80,
  });
  assert.strictEqual(usage.adults, 20);
  assert.strictEqual(usage.children, 0);
  assert.strictEqual(usage.tripDays, 0.5);
  assert.strictEqual(usage.mealsPerDay, 6);
  assert.strictEqual(usage.heatingHours, 24);
  assert.strictEqual(usage.fridgeHoursPerDay, 24);
  assert.strictEqual(usage.boilerHours, 12);
  assert.strictEqual(usage.bottleKg, 47);
});

test("season maps to typical heating hours", function () {
  assert.strictEqual(calc.heatingHoursForSeason("summer"), 0);
  assert.strictEqual(calc.heatingHoursForSeason("mild"), 2);
  assert.strictEqual(calc.heatingHoursForSeason("winter"), 12);
});

test("winter season uses propane; summer and mild stay on butane", function () {
  assert.strictEqual(calc.gasTypeForSeason("winter"), "propane");
  assert.strictEqual(calc.gasTypeForSeason("summer"), "butane");
  assert.strictEqual(calc.gasTypeForSeason("mild"), "butane");
  assert.strictEqual(calc.SEASONS.winter.gasType, "propane");
  assert.strictEqual(calc.SEASONS.summer.gasType, "butane");
  assert.strictEqual(calc.SEASONS.mild.gasType, "butane");
});

test("applying winter season selects propane and the 13 kg Calor bottle", function () {
  var usage = calc.applySeasonToUsage(defaults.createDefaultUsage(), "winter");
  assert.strictEqual(usage.season, "winter");
  assert.strictEqual(usage.heatingLevel, "high");
  assert.strictEqual(usage.heatingHours, 12);
  assert.strictEqual(usage.gasType, "propane");
  assert.strictEqual(usage.bottleId, "propane13");
  assert.strictEqual(usage.bottleKg, 13);
});

test("applying summer or mild season keeps or restores butane", function () {
  var fromWinter = calc.applySeasonToUsage(defaults.PRESETS.winterWeek.usage, "summer");
  assert.strictEqual(fromWinter.season, "summer");
  assert.strictEqual(fromWinter.heatingLevel, "off");
  assert.strictEqual(fromWinter.gasType, "butane");
  assert.strictEqual(fromWinter.bottleId, "butane15");
  assert.strictEqual(fromWinter.bottleKg, 15);

  var mild = calc.applySeasonToUsage(defaults.createDefaultUsage(), "mild");
  assert.strictEqual(mild.season, "mild");
  assert.strictEqual(mild.heatingLevel, "low");
  assert.strictEqual(mild.gasType, "butane");
  assert.strictEqual(mild.bottleId, "butane7");
  assert.strictEqual(mild.bottleKg, 7);

  var keepButane = calc.applySeasonToUsage(defaults.PRESETS.weekendSummer.usage, "summer");
  assert.strictEqual(keepButane.gasType, "butane");
  assert.strictEqual(keepButane.bottleId, "butane45");
  assert.strictEqual(keepButane.bottleKg, 4.5);
});

test("storage writes gasUsage beside waterUsage", function () {
  var clean = storage.sanitiseProfile({
    version: 1,
    waterUsage: waterDefaults.createDefaultUsage(),
    gasUsage: defaults.PRESETS.winterWeek.usage,
  });
  assert.strictEqual(clean.version, 1);
  assert.ok(clean.waterUsage);
  assert.ok(clean.gasUsage);
  assert.strictEqual(clean.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(clean.gasUsage.heatingLevel, "high");
  assert.strictEqual(clean.waterUsage.tripDays, 2);
});

test("applyGasPreset leaves water usage alone", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "winterWeek");
  assert.strictEqual(profile.waterUsage.activePreset, "family");
  assert.strictEqual(profile.waterUsage.children, 2);
  assert.strictEqual(profile.gasUsage.activePreset, "winterWeek");
  assert.strictEqual(profile.gasUsage.tripDays, 7);
  assert.strictEqual(profile.gasUsage.gasType, "propane");
  assert.strictEqual(profile.gasUsage.bottleId, "propane13");
  assert.strictEqual(profile.gasUsage.bottleKg, 13);
});

test("applyGasPreset weekend summer stays on butane", function () {
  var profile = storage.applyGasPreset(waterDefaults.createDefaultProfile(), "winterWeek");
  profile = storage.applyGasPreset(profile, "weekendSummer");
  assert.strictEqual(profile.gasUsage.activePreset, "weekendSummer");
  assert.strictEqual(profile.gasUsage.gasType, "butane");
  assert.strictEqual(profile.gasUsage.bottleId, "butane45");
  assert.strictEqual(profile.gasUsage.bottleKg, 4.5);
  assert.strictEqual(profile.gasUsage.season, "summer");
});

test("defaults gas preset inherits water trip days", function () {
  var profile = storage.applyPreset(waterDefaults.createDefaultProfile(), "family");
  profile = storage.applyGasPreset(profile, "defaults");
  assert.strictEqual(profile.gasUsage.tripDays, 7);
  assert.strictEqual(profile.gasUsage.adults, 2);
  assert.strictEqual(profile.gasUsage.children, 2);
  assert.strictEqual(profile.gasUsage.activePreset, "defaults");
});

test("defaults to butane and Calor butane sizes", function () {
  var usage = calc.normaliseUsage({});
  assert.strictEqual(usage.gasType, "butane");
  assert.strictEqual(usage.bottleId, "butane7");
  assert.deepStrictEqual(
    calc.bottlesForGas("butane").map(function (b) {
      return b.kg;
    }),
    [4.5, 7, 15]
  );
  assert.deepStrictEqual(
    calc.bottlesForGas("propane").map(function (b) {
      return b.kg;
    }),
    [3.9, 6, 13]
  );
});

test("switching gas type picks the closest Calor size", function () {
  assert.strictEqual(calc.closestBottleId(7, "propane"), "propane6");
  assert.strictEqual(calc.closestBottleId(4.5, "propane"), "propane39");
  assert.strictEqual(calc.closestBottleId(15, "propane"), "propane13");
  assert.strictEqual(calc.closestBottleId(13, "butane"), "butane15");
  assert.strictEqual(calc.closestBottleId(6, "butane"), "butane7");
});

test("legacy propane bottle ids still load", function () {
  var usage = calc.normaliseUsage({ bottleId: "calor13" });
  assert.strictEqual(usage.gasType, "propane");
  assert.strictEqual(usage.bottleId, "propane13");
  assert.strictEqual(usage.bottleKg, 13);
});

test("storage key stays watertools.systemProfile", function () {
  assert.strictEqual(storage.STORAGE_KEY, "watertools.systemProfile");
});

test("parseGasPrefillQuery reads the Ask cooking-only contract", function () {
  var patch = calc.parseGasPrefillQuery(
    "gas.html?mealsPerDay=2&cookingStyle=heavy&adults=2&heatingLevel=off&fridgeGasEnabled=0&boilerEnabled=0&gasType=butane&bottleId=butane7"
  );
  assert.ok(patch);
  assert.strictEqual(patch.mealsPerDay, 2);
  assert.strictEqual(patch.cookingStyle, "heavy");
  assert.strictEqual(patch.adults, 2);
  assert.strictEqual(patch.heatingLevel, "off");
  assert.strictEqual(patch.fridgeGasEnabled, false);
  assert.strictEqual(patch.boilerEnabled, false);
  assert.strictEqual(patch.gasType, "butane");
  assert.strictEqual(patch.bottleId, "butane7");
  assert.strictEqual(patch.tripDays, undefined);
});

test("parseGasPrefillQuery ignores unknown keys and invalid values", function () {
  assert.strictEqual(calc.parseGasPrefillQuery(""), null);
  assert.strictEqual(calc.parseGasPrefillQuery("?foo=bar&utm_source=ask"), null);
  var patch = calc.parseGasPrefillQuery(
    "?adults=nope&children=1&cookingStyle=super&heatingLevel=toasty&fridgeGasEnabled=maybe&gasType=lpg&bottleId=steel11&mealsPerDay=2"
  );
  assert.ok(patch);
  assert.strictEqual(patch.children, 1);
  assert.strictEqual(patch.mealsPerDay, 2);
  assert.strictEqual(patch.adults, undefined);
  assert.strictEqual(patch.cookingStyle, undefined);
  assert.strictEqual(patch.heatingLevel, undefined);
  assert.strictEqual(patch.fridgeGasEnabled, undefined);
  assert.strictEqual(patch.gasType, undefined);
  assert.strictEqual(patch.bottleId, undefined);
});

test("parseGasPrefillQuery accepts 0/1/true/false for flags", function () {
  var a = calc.parseGasPrefillQuery("?fridgeGasEnabled=true&boilerEnabled=false");
  assert.strictEqual(a.fridgeGasEnabled, true);
  assert.strictEqual(a.boilerEnabled, false);
  var b = calc.parseGasPrefillQuery("?fridgeGasEnabled=1&boilerEnabled=0");
  assert.strictEqual(b.fridgeGasEnabled, true);
  assert.strictEqual(b.boilerEnabled, false);
});

test("applyGasPrefillToUsage patches gas after defaults and keeps water", function () {
  var water = {
    adults: 4,
    children: 2,
    tripDays: 10,
    showerStyle: "long",
  };
  var gas = defaults.createDefaultUsage(water);
  assert.strictEqual(gas.adults, 4);
  assert.strictEqual(gas.children, 2);
  assert.strictEqual(gas.cookingStyle, "normal");

  var next = calc.applyGasPrefillToUsage(
    gas,
    "?mealsPerDay=2&cookingStyle=heavy&adults=2&heatingLevel=off&fridgeGasEnabled=0&boilerEnabled=0&gasType=butane&bottleId=butane7",
    water
  );
  assert.ok(next);
  assert.strictEqual(next.adults, 2);
  assert.strictEqual(next.children, 2);
  assert.strictEqual(next.tripDays, 10);
  assert.strictEqual(next.mealsPerDay, 2);
  assert.strictEqual(next.cookingStyle, "heavy");
  assert.strictEqual(next.heatingLevel, "off");
  assert.strictEqual(next.heatingHours, 0);
  assert.strictEqual(next.fridgeGasEnabled, false);
  assert.strictEqual(next.boilerEnabled, false);
  assert.strictEqual(next.gasType, "butane");
  assert.strictEqual(next.bottleId, "butane7");
  assert.strictEqual(next.bottleKg, 7);
  assert.strictEqual(next.activePreset, "");

  assert.strictEqual(water.adults, 4);
  assert.strictEqual(water.children, 2);
  assert.strictEqual(water.tripDays, 10);
  assert.strictEqual(water.showerStyle, "long");
});

test("cooking-only Ask link yields non-zero bottle days", function () {
  var usage = calc.applyGasPrefillToUsage(
    defaults.createDefaultUsage(),
    "?mealsPerDay=2&cookingStyle=heavy&adults=2&heatingLevel=off&fridgeGasEnabled=0&boilerEnabled=0&gasType=butane&bottleId=butane7"
  );
  var result = calc.calcGas(usage);
  var cookDaily = 2 * 2 * 0.07;
  almostEqual(result.cookDaily, cookDaily);
  almostEqual(result.heatDaily, 0);
  almostEqual(result.fridgeDaily, 0);
  almostEqual(result.boilerDaily, 0);
  almostEqual(result.dailyKg, cookDaily);
  almostEqual(result.bottleDays, 7 / cookDaily);
  assert.ok(result.bottleDays > 0);
});

test("prefill heatingHours and boilerHours match existing levels", function () {
  var usage = calc.applyGasPrefillToUsage(
    defaults.createDefaultUsage(),
    "?heatingHours=6&boilerEnabled=1&boilerHours=3"
  );
  assert.strictEqual(usage.heatingLevel, "medium");
  assert.strictEqual(usage.heatingHours, 6);
  assert.strictEqual(usage.boilerEnabled, true);
  assert.strictEqual(usage.boilerLevel, "heavy");
  assert.strictEqual(usage.boilerHours, 3);
});

test("prefill bottleKg without bottleId selects the closest Calor size", function () {
  var butane = calc.applyGasPrefillToUsage(defaults.createDefaultUsage(), "?bottleKg=15");
  assert.strictEqual(butane.gasType, "butane");
  assert.strictEqual(butane.bottleId, "butane15");
  assert.strictEqual(butane.bottleKg, 15);

  var propane = calc.applyGasPrefillToUsage(
    defaults.createDefaultUsage(),
    "?gasType=propane&bottleKg=13"
  );
  assert.strictEqual(propane.gasType, "propane");
  assert.strictEqual(propane.bottleId, "propane13");
  assert.strictEqual(propane.bottleKg, 13);
});

test("prefill custom bottleKg keeps the typed size", function () {
  var usage = calc.applyGasPrefillToUsage(
    defaults.createDefaultUsage(),
    "?bottleId=custom&bottleKg=11"
  );
  assert.strictEqual(usage.bottleId, "custom");
  assert.strictEqual(usage.bottleKg, 11);
});

test("prefill bottleId infers gas type when gasType is omitted", function () {
  var usage = calc.applyGasPrefillToUsage(
    defaults.createDefaultUsage(),
    "?bottleId=propane13"
  );
  assert.strictEqual(usage.gasType, "propane");
  assert.strictEqual(usage.bottleId, "propane13");
  assert.strictEqual(usage.bottleKg, 13);
});

test("applyGasPrefillToUsage returns null when nothing valid is present", function () {
  var gas = defaults.createDefaultUsage();
  assert.strictEqual(calc.applyGasPrefillToUsage(gas, ""), null);
  assert.strictEqual(calc.applyGasPrefillToUsage(gas, "?foo=1&cookingStyle=nope"), null);
});

test("buildGasPrefillHref round-trips through the parser", function () {
  var usage = {
    adults: 2,
    children: 1,
    tripDays: 5,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    heatingLevel: "off",
    heatingHours: 0,
    fridgeGasEnabled: false,
    boilerEnabled: true,
    boilerLevel: "light",
    boilerHours: 0.5,
    gasType: "butane",
    bottleId: "butane7",
    bottleKg: 7,
  };
  var href = calc.buildGasPrefillHref(usage);
  assert.ok(href.indexOf("gas.html?") === 0);
  assert.ok(href.indexOf("cookingStyle=heavy") !== -1);
  assert.ok(href.indexOf("fridgeGasEnabled=0") !== -1);
  assert.ok(href.indexOf("boilerEnabled=1") !== -1);
  assert.ok(href.indexOf("bottleId=butane7") !== -1);

  var again = calc.applyGasPrefillToUsage(defaults.createDefaultUsage(), href);
  assert.strictEqual(again.adults, 2);
  assert.strictEqual(again.children, 1);
  assert.strictEqual(again.tripDays, 5);
  assert.strictEqual(again.cookingStyle, "heavy");
  assert.strictEqual(again.heatingLevel, "off");
  assert.strictEqual(again.fridgeGasEnabled, false);
  assert.strictEqual(again.boilerEnabled, true);
  assert.strictEqual(again.boilerLevel, "light");
  assert.strictEqual(again.gasType, "butane");
  assert.strictEqual(again.bottleId, "butane7");
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
