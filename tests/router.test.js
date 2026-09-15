"use strict";

/**
 * Ask synonym regression. Font owns coverage (Wayne lock, 15 Sep 2026):
 * when a hub adds a starter item, update assets/router.js and this table
 * in the same change. Wayne must never find gaps by typing.
 * See ASK-SYNONYMS.md.
 */

const assert = require("node:assert/strict");
const {
  routeAsk,
  POWER_STARTER_ASKS,
  POWER_INVERTER_ASKS,
  POWER_COOLBOX_ASKS,
  POWER_UK_ASKS,
  POWER_APPLIANCE_TOKENS,
  PAYLOAD_WEIGHT_ASKS,
  GAS_HUB_ASKS,
  SEARCH_PHRASE_ASKS
} = require("../assets/router.js");

function expectRoute(query, id) {
  const hit = routeAsk(query);
  assert.ok(hit, `expected a match for “${query}”`);
  assert.equal(hit.id, id, `“${query}” should route to ${id}, got ${hit && hit.id}`);
}

function expectNone(query) {
  const hit = routeAsk(query);
  assert.equal(hit, null, `“${query}” should not invent a tool (got ${hit && hit.id})`);
}

expectRoute("payload left on a 3500", "payload");
expectRoute("payload left", "payload");
expectRoute("MIRO", "payload");
expectRoute("Mass in Service", "payload");
expectRoute("Mass in Running Order", "payload");
expectRoute("How do I weigh the van?", "payload");
expectRoute("weighbridge near me", "payload");
expectRoute("MAM on the VIN plate", "payload");
expectRoute("what is my remaining weight", "payload");

expectRoute("tyre pressure for new rubber", "tyres");
expectRoute("tyre pressure motorhome", "tyres");
expectRoute("CP tyres", "tyres");
expectRoute("tyres not the originals", "tyres");
expectRoute("what PSI should I run", "tyres");
expectRoute("3.5 bar on the rear", "tyres");

expectRoute("daily power use", "power");
expectRoute("Microwave", "power");
expectRoute("fridge", "power");
expectRoute("freezer", "power");
expectRoute("kettle", "power");
expectRoute("toaster", "power");
expectRoute("hairdryer", "power");
expectRoute("hair dryer", "power");
expectRoute("heater", "power");
expectRoute("lights", "power");
expectRoute("LED", "power");
expectRoute("USB", "power");
expectRoute("laptop", "power");
expectRoute("TV", "power");
expectRoute("induction hob", "power");
expectRoute("coffee machine", "power");
expectRoute("blower", "power");
expectRoute("fan", "power");
expectRoute("compressor fridge", "power");
expectRoute("amp draw", "power");
expectRoute("Wh", "power");
expectRoute("watt", "power");
expectRoute("watts", "power");
expectRoute("kWh", "power");
expectRoute("12V", "power");
expectRoute("24V", "power");
expectRoute("alternator", "power");
expectRoute("how many amp hours", "power");

assert.equal(routeAsk("microwave").id, "power");
assert.equal(routeAsk("fridge").id, "power");
assert.equal(routeAsk("freezer").id, "power");
assert.equal(routeAsk("coolbox").id, "power");
assert.equal(routeAsk("microwave").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("fridge").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("freezer").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("coolbox").href, "https://motorhomepower.co.uk/");

assert.ok(POWER_COOLBOX_ASKS.length >= 7, "expected coolbox UK variants");
POWER_COOLBOX_ASKS.forEach(function (row) {
  expectRoute(row.ask, "power");
});
expectRoute("coolboxes", "power");
expectRoute("how much battery for a coolbox", "power");
assert.equal(routeAsk("camping coolbox").id, "power");
assert.equal(routeAsk("camping coolbox").href, "https://motorhomepower.co.uk/");

assert.ok(POWER_STARTER_ASKS.length >= 12, "expected live Power STARTER rows");
POWER_STARTER_ASKS.forEach(function (row) {
  expectRoute(row.ask, "power");
});
expectRoute("compressor fridge", "power");
expectRoute("LED lights", "power");
expectRoute("water pump", "power");
expectRoute("diesel heater", "power");
expectRoute("tablet", "power");
expectRoute("MaxxFan", "power");
expectRoute("roof fan", "power");
expectRoute("monitor", "power");
expectRoute("phantom", "power");
expectRoute("induction", "power");

expectRoute("how much battery for a microwave", "power");
expectRoute("how many amp hours for a fridge", "power");
expectRoute("how much power does a kettle use", "power");
expectRoute("motorhome microwave", "power");
expectRoute("campervan kettle", "power");
assert.equal(routeAsk("how much battery for a microwave").id, "power");
assert.equal(routeAsk("how much battery for a microwave").href, "https://motorhomepower.co.uk/");

assert.ok(SEARCH_PHRASE_ASKS.length >= 6, "expected a search phrase per hub");
SEARCH_PHRASE_ASKS.forEach(function (row) {
  expectRoute(row.ask, row.id);
});

expectRoute("leisure battery size", "battery");
expectRoute("leisure battery", "battery");
expectRoute("solar panels for a week", "solar");
expectRoute("inverter for a kettle", "inverter");
expectRoute("electrical cable", "wire");
expectRoute("wire size", "wire");
expectRoute("fuse", "wire");
expectRoute("12V cable", "wire");

assert.equal(routeAsk("leisure battery size").href, "https://motorhomepower.co.uk/battery.html");
assert.equal(routeAsk("solar panels for a week").href, "https://motorhomepower.co.uk/solar.html");
assert.equal(routeAsk("inverter for a kettle").href, "https://motorhomepower.co.uk/inverter.html");
assert.equal(routeAsk("electrical cable").href, "https://motorhomepower.co.uk/wire.html");

expectRoute("heater pressure", "tyres");
expectNone("cable");

expectRoute("fresh water for two people", "water");
expectRoute("fresh water", "water");
expectRoute("grey water", "water");
expectRoute("shower", "water");
expectRoute("shower litres", "water");
expectRoute("fresh water how much", "water");
expectRoute("gas bottle for a winter week", "gas");
expectRoute("LPG days left", "gas");
expectRoute("bbq", "gas");
expectRoute("BBQ", "gas");
expectRoute("barbecue", "gas");
expectRoute("external BBQ point", "gas");
expectRoute("BBQ gas", "gas");
expectRoute("Calor bottle how long", "gas");
expectRoute("gas bottle days", "gas");
expectRoute("barbeque", "gas");
expectRoute("calor", "gas");
expectRoute("camping gaz", "gas");
expectRoute("gas bottle", "gas");
expectRoute("gas cylinder", "gas");
expectRoute("cooking", "gas");
expectRoute("heating", "gas");
expectRoute("boiler", "gas");
expectRoute("gas fridge", "gas");
expectRoute("absorption fridge", "gas");
expectRoute("3-way fridge", "gas");
expectRoute("three way fridge", "gas");
assert.equal(routeAsk("bbq").href, "https://motorhomewater.co.uk/gas.html");
assert.equal(routeAsk("gas fridge").id, "gas");
expectRoute("holding tanks planner", "tanks");
expectRoute("when to empty the cassette", "cassette");
expectRoute("empty cassette", "cassette");
expectRoute("cassette", "cassette");
expectRoute("cassette toilet", "cassette");
expectRoute("toilet", "cassette");
expectRoute("toilets", "cassette");
expectRoute("loo", "cassette");
expectRoute("loos", "cassette");
expectRoute("chemical toilet", "cassette");
expectRoute("porta potty", "cassette");
expectRoute("portapotty", "cassette");
expectRoute("porta-potty", "cassette");

assert.equal(routeAsk("toilet").href, "https://motorhomewater.co.uk/cassette.html");
assert.equal(routeAsk("cassette").id, "cassette");
assert.equal(routeAsk("water").id, "water");

expectNone("");
expectNone("   ");
expectNone("best campsite near York");
expectNone("plan a route to Cornwall");
expectNone("how much should I spend on a new van");
expectNone("camping in the Lakes");

const waterWeight = routeAsk("how much water do two people use");
assert.equal(waterWeight.id, "water");

// Seed lists from live hub defaults — walk every row.
assert.ok(POWER_INVERTER_ASKS.length >= 10, "expected inverter-load Ask rows");
POWER_INVERTER_ASKS.forEach(function (row) {
  expectRoute(row.ask, row.id);
});
assert.ok(POWER_UK_ASKS.length >= 16, "expected 12V leisure-electric Ask rows");
POWER_UK_ASKS.forEach(function (row) {
  expectRoute(row.ask, row.id);
});
assert.ok(PAYLOAD_WEIGHT_ASKS.length >= 10, "expected Payload weight terms");
PAYLOAD_WEIGHT_ASKS.forEach(function (row) {
  expectRoute(row.ask, row.id);
});
assert.ok(GAS_HUB_ASKS.length >= 8, "expected Gas hub terms");
GAS_HUB_ASKS.forEach(function (row) {
  expectRoute(row.ask, row.id);
});
assert.ok(POWER_APPLIANCE_TOKENS.length >= 30, "expected a full Power appliance token list");

/**
 * Broad term → hub table. Dozens of UK words people type.
 * Locked locks: oven/radio → Power; grill → Gas; axle → Payload;
 * coolbox/microwave/fridge → Power; BBQ → Gas; toilet → Cassette.
 */
const ASK_REGRESSION = [
  ["oven", "power"],
  ["ovens", "power"],
  ["electric oven", "power"],
  ["wonder oven", "power"],
  ["microwave", "power"],
  ["kettle", "power"],
  ["air fryer", "power"],
  ["airfryer", "power"],
  ["coffee machine", "power"],
  ["nespresso", "power"],
  ["coolbox", "power"],
  ["cool box", "power"],
  ["fridge", "power"],
  ["freezer", "power"],
  ["hob", "power"],
  ["induction", "power"],
  ["radio", "power"],
  ["stereo", "power"],
  ["bluetooth", "power"],
  ["speaker", "power"],
  ["charger", "power"],
  ["phone charger", "power"],
  ["usb charger", "power"],
  ["usb", "power"],
  ["tv", "power"],
  ["television", "power"],
  ["lights", "power"],
  ["led", "power"],
  ["fan", "power"],
  ["heater fan", "power"],
  ["diesel heater", "power"],
  ["pump", "power"],
  ["12v socket", "power"],
  ["slow cooker", "power"],
  ["electric grill", "power"],
  ["electric bbq", "power"],
  ["how much battery for an oven", "power"],
  ["how much battery for a radio", "power"],
  ["grill", "gas"],
  ["grills", "gas"],
  ["gas grill", "gas"],
  ["BBQ", "gas"],
  ["bbq", "gas"],
  ["barbecue", "gas"],
  ["Calor", "gas"],
  ["LPG", "gas"],
  ["gas bottle", "gas"],
  ["propane", "gas"],
  ["butane", "gas"],
  ["gas fridge", "gas"],
  ["absorption fridge", "gas"],
  ["3-way fridge", "gas"],
  ["axle", "payload"],
  ["axles", "payload"],
  ["front axle", "payload"],
  ["rear axle", "payload"],
  ["weighbridge", "payload"],
  ["MAM", "payload"],
  ["MIRO", "payload"],
  ["Mass in Service", "payload"],
  ["payload", "payload"],
  ["overweight", "payload"],
  ["overload", "payload"],
  ["overloaded", "payload"],
  ["plated weight", "payload"],
  ["VIN plate", "payload"],
  ["toilet", "cassette"],
  ["loo", "cassette"],
  ["cassette", "cassette"],
  ["chemical toilet", "cassette"],
  ["fresh water", "water"],
  ["waste water", "water"],
  ["water fill", "water"],
  ["grey water", "water"],
  ["shower", "water"],
  ["waste tank", "tanks"],
  ["black water", "tanks"],
  ["holding tanks", "tanks"],
  ["tyre pressure", "tyres"],
  ["leisure battery", "battery"],
  ["solar", "solar"],
  ["inverter", "inverter"]
];

assert.ok(ASK_REGRESSION.length >= 40, "expected a broad Ask regression table");
ASK_REGRESSION.forEach(function (row) {
  expectRoute(row[0], row[1]);
});

assert.equal(routeAsk("oven").id, "power");
assert.equal(routeAsk("oven").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("grill").id, "gas");
assert.equal(routeAsk("grill").href, "https://motorhomewater.co.uk/gas.html");
assert.equal(routeAsk("radio").id, "power");
assert.equal(routeAsk("radio").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("Radio").id, "power");
assert.equal(routeAsk("bluetooth").id, "power");
assert.equal(routeAsk("speaker").id, "power");
assert.equal(routeAsk("charger").id, "power");
assert.equal(routeAsk("diesel heater").id, "power");
assert.equal(routeAsk("axle").id, "payload");
assert.equal(routeAsk("axle").href, "https://motorhomepayload.co.uk/");
assert.equal(routeAsk("coolbox").id, "power");
assert.equal(routeAsk("microwave").id, "power");
assert.equal(routeAsk("BBQ").id, "gas");
assert.equal(routeAsk("toilet").id, "cassette");
assert.equal(routeAsk("fridge").id, "power");

console.log("router.test.js: all checks passed");
