"use strict";

const assert = require("node:assert/strict");
const { routeAsk, POWER_STARTER_ASKS } = require("../assets/router.js");

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
expectRoute("How do I weigh the van?", "payload");
expectRoute("weighbridge near me", "payload");
expectRoute("MAM on the VIN plate", "payload");
expectRoute("what is my remaining weight", "payload");

expectRoute("tyre pressure for new rubber", "tyres");
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
assert.equal(routeAsk("microwave").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("fridge").href, "https://motorhomepower.co.uk/");
assert.equal(routeAsk("freezer").href, "https://motorhomepower.co.uk/");

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
expectRoute("gas bottle for a winter week", "gas");
expectRoute("LPG days left", "gas");
expectRoute("bbq", "gas");
expectRoute("BBQ", "gas");
expectRoute("barbecue", "gas");
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

console.log("router.test.js: all checks passed");
