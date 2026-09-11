"use strict";

const assert = require("node:assert/strict");
const { routeAsk } = require("../assets/router.js");

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
expectRoute("leisure battery size", "power");
expectRoute("solar panels for a week", "power");
expectRoute("how many amp hours", "power");
expectRoute("inverter for a kettle", "power");

expectRoute("fresh water for two people", "water");
expectRoute("gas bottle for a winter week", "gas");
expectRoute("LPG days left", "gas");
expectRoute("holding tanks planner", "tanks");
expectRoute("when to empty the cassette", "cassette");

expectNone("");
expectNone("   ");
expectNone("best campsite near York");
expectNone("plan a route to Cornwall");
expectNone("how much should I spend on a new van");
expectNone("camping in the Lakes");

const waterWeight = routeAsk("how much water do two people use");
assert.equal(waterWeight.id, "water");

console.log("router.test.js: all checks passed");
