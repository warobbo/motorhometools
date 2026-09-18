"use strict";

/**
 * Golden tests for Phase A Payload-first co-pilot Ask and Phase Gas
 * cooking-line estimates. Payload maths must match
 * warobbo/motorhome-payload-calculator compute() / custom-kit.
 * Gas maths must match warobbo/mhwater gas-calc.js cooking line only
 * (light 0.025 / normal 0.04 / heavy 0.07, child 0.7). Never invent
 * MAM, tyre pressures, e-bike kg, or an outdoor BBQ kg/h.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const copilot = require("../lib/copilot");
const handleAsk = require("../api/ask");
const ask = require("../lib/ask");
const { routeAsk } = require("../assets/router");

/** Sibling compute() for the fields Phase A uses (app.js + custom-kit). */
function siblingCompute(state) {
  function num(value) {
    const n = parseFloat(value);
    return isFinite(n) ? n : 0;
  }
  const s = Object.assign({
    mam: 0, miro: 0, actualEmpty: 0,
    driverKg: 0, extraAdults: 0, adultKg: 0, children: 0, childKg: 0, pets: 0, petKg: 0,
    freshCap: 0, freshFill: 0, greyCap: 0, greyFill: 0, blackCap: 0, blackFill: 0,
    fuelCap: 0, fuelFill: 0, fuelDensity: 0.84,
    gas6: 0, gas6Full: 13, gas9: 0, gas9Full: 18.5, gas13: 0, gas13Full: 28,
    inverterKg: 0, elecExtrasKg: 0,
    bikes: 0, bikeKg: 0, rackKg: 0,
    foodPeople: 0, foodKgEach: 0, miscKg: 0,
    awning: false, ramps: false, furniture: false, generator: false, toolbox: false,
    customItems: []
  }, state);
  const mam = num(s.mam);
  const miro = num(s.miro);
  const base = num(s.actualEmpty) > 0 ? num(s.actualEmpty) : miro;
  const fresh = num(s.freshCap) * num(s.freshFill) / 100;
  const grey = num(s.greyCap) * num(s.greyFill) / 100;
  const black = num(s.blackCap) * num(s.blackFill) / 100;
  const water = fresh + grey + black;
  const gas = num(s.gas6) * num(s.gas6Full) + num(s.gas9) * num(s.gas9Full) + num(s.gas13) * num(s.gas13Full);
  const bikes = num(s.bikes) * num(s.bikeKg) + (num(s.bikes) > 0 ? num(s.rackKg) : 0);
  const custom = copilot.customKitTotalKg(s.customItems);
  const added = water + gas + bikes + custom;
  return {
    water: water,
    gas: gas,
    added: added,
    remaining: mam - (base + added)
  };
}

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader: function (key, value) { this.headers[key] = value; },
    end: function (chunk) { this.body = chunk == null ? "" : String(chunk); }
  };
}

test("Payload maths matches sibling compute() for the same state", function () {
  const state = {
    mam: 720,
    miro: 0,
    freshCap: 100,
    freshFill: 100,
    gas6: 2,
    gas6Full: 13,
    customItems: [{ name: "e-bike", kg: 22, qty: 2 }]
  };
  const ours = copilot.computePayload(state);
  const sibling = siblingCompute(state);
  assert.equal(ours.water, 100);
  assert.equal(ours.gas, 26);
  assert.equal(ours.added, 170);
  assert.equal(ours.remaining, 550);
  assert.deepEqual(
    { water: ours.water, gas: ours.gas, added: ours.added, remaining: ours.remaining },
    sibling
  );
});

test("custom kit matches sibling: blank kg adds nothing", function () {
  assert.equal(copilot.customKitItemKg({ name: "E-bike", kg: 22, qty: 2 }), 44);
  assert.equal(copilot.customKitItemKg({ name: "Mystery box", kg: "", qty: 1 }), 0);
  assert.equal(copilot.customKitTotalKg(undefined), 0);
});

test("golden: 720 kg payload + 2×22 kg e-bikes + 100 L water + 2 gas bottles matches tool", function () {
  const question = "I've got 720 kg payload — can I take 2 e-bikes at 22 kg each, 100 L water and 2 gas bottles?";
  const result = copilot.handleAsk(question);
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "answer");
  assert.equal(result.usedKg, 170);
  assert.equal(result.remainingKg, 550);
  assert.match(result.answer, /170/);
  assert.match(result.answer, /550/);
  assert.ok(result.assumptions.some(function (line) {
    return /1 kg per litre/i.test(line);
  }));
  assert.ok(result.assumptions.some(function (line) {
    return /6 kg/.test(line) && /13/.test(line);
  }));
  assert.equal(result.gaps.length, 0);
  assert.match(result.href, /^https:\/\/motorhomepayload\.co\.uk\/\?/);
  assert.match(result.href, /freshCap=100/);
  assert.match(result.href, /gas6=2/);
  assert.match(result.href, /(?:\?|&)mam=720(?:&|$)/);
  assert.match(result.href, /(?:\?|&)miro=0(?:&|$)/);
  assert.doesNotMatch(result.href, /gas9Full/);
  assert.match(result.hrefLabel, /Open Payload to fine-tune/i);
  assert.equal(result.ctaNote, copilot.CTA_NOTE);

  const sibling = siblingCompute({
    mam: 720,
    freshCap: 100,
    freshFill: 100,
    gas6: 2,
    gas6Full: 13,
    customItems: [{ name: "e-bike", kg: 22, qty: 2 }]
  });
  assert.equal(result.usedKg, sibling.added);
  assert.equal(result.remainingKg, sibling.remaining);
});

test("golden: unknown e-bike weight is a gap — no invented kg", function () {
  const question = "I've got 720 kg payload — can I take 2 e-bikes, 100 L water and 2 gas bottles?";
  const result = copilot.handleAsk(question);
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "gap");
  assert.ok(result.gaps.some(function (line) { return /e-bike/i.test(line) && /kg/i.test(line); }));
  assert.equal(result.usedKg, 126);
  assert.equal(result.remainingKg, 594);
  assert.match(result.answer, /126/);
  assert.match(result.answer, /594/);
  assert.doesNotMatch(result.answer, /cannot say yet/i);
  assert.doesNotMatch(result.answer, /\b14\b/);
  assert.ok(!result.items.some(function (item) { return /e-bike/i.test(item.label); }));
  assert.match(result.hrefLabel, /Open Payload/i);
  assert.equal(result.ctaNote, copilot.CTA_NOTE);
});

test("golden: 500 kg payload + 3 bikes (no kg) uses 14 kg + 12 kg rack defaults", function () {
  const result = copilot.handleAsk("I've got 500 kg payload — can I take 3 bikes?");
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "answer");
  assert.equal(result.usedKg, 54);
  assert.equal(result.remainingKg, 446);
  assert.match(result.answer, /54/);
  assert.match(result.answer, /446/);
  assert.match(result.answer, /14/);
  assert.match(result.answer, /12/);
  assert.doesNotMatch(result.answer, /cannot say yet/i);
  assert.doesNotMatch(result.answer, /we cannot/i);
  assert.equal(result.gaps.length, 0);
  assert.ok(result.assumptions.some(function (line) {
    return /14/.test(line) && /bike/i.test(line);
  }));
  assert.ok(result.assumptions.some(function (line) {
    return /12/.test(line) && /rack/i.test(line);
  }));
  assert.ok(result.followUps.some(function (line) {
    return /tell me the kg/i.test(line);
  }));
  assert.match(result.href, /^https:\/\/motorhomepayload\.co\.uk\/\?/);
  assert.match(result.href, /bikes=3/);
  assert.match(result.href, /bikeKg=14/);
  assert.match(result.href, /rackKg=12/);
  assert.match(result.href, /(?:\?|&)mam=500(?:&|$)/);
  assert.match(result.href, /(?:\?|&)miro=0(?:&|$)/);
  assert.match(result.hrefLabel, /Open Payload to fine-tune/i);
  assert.equal(result.ctaNote, copilot.CTA_NOTE);

  const sibling = siblingCompute({
    mam: 500,
    bikes: 3,
    bikeKg: copilot.BIKE_DEFAULT_KG,
    rackKg: copilot.RACK_DEFAULT_KG
  });
  assert.equal(result.usedKg, sibling.added);
  assert.equal(result.remainingKg, sibling.remaining);
});

test("golden: remaining 500 kg + 3 bikes CTA carries kit + mam=500&miro=0; stay in Ask", function () {
  const question = "i have 500kg payload what happens when i add 3 bikes";
  const result = copilot.handleAsk(question);
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "answer");
  assert.equal(result.usedKg, 54);
  assert.equal(result.remainingKg, 446);
  assert.match(result.href, /^https:\/\/motorhomepayload\.co\.uk\/\?/);
  assert.notEqual(result.href, copilot.PAYLOAD_HREF);

  const params = new URLSearchParams(result.href.slice(result.href.indexOf("?") + 1));
  assert.equal(params.get("bikes"), "3");
  assert.equal(params.get("bikeKg"), "14");
  assert.equal(params.get("rackKg"), "12");
  assert.equal(params.get("mam"), "500");
  assert.equal(params.get("miro"), "0");

  const card = copilot.publicResult(result);
  assert.equal(card.href, result.href);
  assert.match(card.hrefLabel, /Open Payload to fine-tune/i);

  const decision = copilot.resolveAsk(question, { routeAsk: routeAsk });
  assert.equal(decision.navigate, false);
  assert.equal(decision.unmatched, false);
  assert.equal(decision.view.handled, true);
  assert.equal(decision.view.kind, "answer");
  assert.equal(decision.view.href, result.href);
  assert.notEqual(decision.view.href, "https://motorhomepayload.co.uk/");
});

test("golden: 500 kg payload + 3 bikes + 100ltrs water uses 154 kg / 346 kg left", function () {
  const variants = [
    "I have 500kg of payload, what happens when I add 3 bikes and 100ltrs of water",
    "I have 500kg of payload, what happens when I add 3 bikes and 100 ltrs of water",
    "I have 500kg of payload, what happens when I add 3 bikes and 100ltr of water",
    "I have 500kg of payload, what happens when I add 3 bikes and 100 litres of water",
    "I have 500kg of payload, what happens when I add 3 bikes and 100l of water",
    "I have 500kg of payload, what happens when I add 3 bikes and 100L water",
    "I have 500kg of payload, what happens when I add 3 bikes and 100 liters"
  ];
  const sibling = siblingCompute({
    mam: 500,
    freshCap: 100,
    freshFill: 100,
    bikes: 3,
    bikeKg: copilot.BIKE_DEFAULT_KG,
    rackKg: copilot.RACK_DEFAULT_KG
  });
  assert.equal(sibling.added, 154);
  assert.equal(sibling.remaining, 346);

  variants.forEach(function (question) {
    const result = copilot.handleAsk(question);
    assert.equal(result.handled, true, question);
    assert.equal(result.domain, "payload", question);
    assert.equal(result.kind, "answer", question);
    assert.equal(result.usedKg, 154, question);
    assert.equal(result.remainingKg, 346, question);
    assert.equal(result.usedKg, sibling.added, question);
    assert.equal(result.remainingKg, sibling.remaining, question);
    assert.ok(result.items.some(function (item) {
      return /fresh water/i.test(item.label) && item.kg === 100;
    }), question);
    assert.ok(result.items.some(function (item) {
      return /3 bike/i.test(item.label);
    }), question);
    assert.ok(result.assumptions.some(function (line) {
      return /1 kg per litre/i.test(line);
    }), question);
    assert.equal(result.gaps.length, 0, question);
    assert.match(result.href, /freshCap=100/, question);
    assert.match(result.href, /bikes=3/, question);
    assert.match(result.href, /(?:\?|&)mam=500(?:&|$)/, question);
    assert.match(result.href, /(?:\?|&)miro=0(?:&|$)/, question);
  });
});

test("payload + bikes + water with no litres is a gap, not a silent omit", function () {
  const result = copilot.handleAsk(
    "I have 500kg of payload, what happens when I add 3 bikes and water"
  );
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "gap");
  assert.equal(result.usedKg, 54);
  assert.equal(result.remainingKg, 446);
  assert.ok(result.gaps.some(function (line) { return /litres/i.test(line); }));
  assert.ok(!result.items.some(function (item) { return /water/i.test(item.label); }));
  assert.doesNotMatch(result.answer, /\b90\b/);
  assert.match(result.answer, /54/);
});

test("incomplete “3 b” in payload context infers bikes and computes", function () {
  const result = copilot.handleAsk("I've got 500 kg payload — add 3 b");
  assert.equal(result.handled, true);
  assert.equal(result.kind, "answer");
  assert.equal(result.usedKg, 54);
  assert.equal(result.remainingKg, 446);
  assert.ok(result.items.some(function (item) { return /bike/i.test(item.label); }));
});

test("dangling qty without an item asks one clarifying question", function () {
  const result = copilot.handleAsk("I've got 500 kg payload — can I take 3");
  assert.equal(result.handled, true);
  assert.equal(result.kind, "clarify");
  assert.match(result.answer, /3 bikes/i);
  assert.doesNotMatch(result.answer, /cannot say/i);
  assert.match(result.hrefLabel, /Open Payload/i);
  assert.equal(result.ctaNote, copilot.CTA_NOTE);
});

test("golden: missing MAM / remaining payload is refused", function () {
  const result = copilot.handleAsk("Can I take 100 L water and 2 gas bottles?");
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "refuse");
  assert.ok(result.gaps.some(function (line) { return /MAM|remaining payload/i.test(line); }));
  assert.match(result.answer, /do not invent plated weights/i);
  assert.equal(result.remainingKg, null);
  assert.match(result.hrefLabel, /Open Payload/i);
  assert.equal(result.ctaNote, copilot.CTA_NOTE);
});

test("golden: tyre HOLD refuses a pressure and does not invent one", function () {
  const result = copilot.handleAsk("tyre pressure for a 3500 kg motorhome");
  assert.equal(result.handled, true);
  assert.equal(result.domain, "tyres");
  assert.equal(result.kind, "hold");
  assert.equal(result.answer, copilot.TYRES_HOLD_MESSAGE);
  assert.doesNotMatch(result.answer, /\d+\s*(?:psi|bar)/i);
  assert.equal(result.usedKg, null);
  assert.match(result.href, /tyres\.html/);
});

test("full fresh tank without litres is a gap, not a 90 L default", function () {
  const result = copilot.handleAsk("Full fresh tank — how much of my remaining payload does that use?");
  assert.equal(result.handled, true);
  assert.equal(result.kind, "gap");
  assert.ok(result.gaps.some(function (line) { return /litres/i.test(line); }));
  assert.doesNotMatch(result.answer, /\b90\b/);
});

test("100 L full fresh tank reports 100 kg and does not invent remaining", function () {
  const result = copilot.handleAsk("100 L full fresh tank — how much of my remaining payload does that use?");
  assert.equal(result.handled, true);
  assert.equal(result.usedKg, 100);
  assert.equal(result.remainingKg, null);
  assert.match(result.answer, /100/);
});

test("Power and campsite questions are not answered with invented numbers", function () {
  const power = copilot.handleAsk("Will batteries last 3 days off-grid with a diesel heater?");
  assert.equal(power.handled, true);
  assert.equal(power.domain, "power");
  assert.equal(power.kind, "later");
  assert.equal(power.phase, "B");
  assert.doesNotMatch(power.answer, /\d+\s*(?:ah|wh|kwh|amp)/i);
  assert.match(power.hrefLabel, /Open Power/i);

  const campsite = copilot.handleAsk("best campsite near York");
  assert.equal(campsite.handled, false);
  assert.equal(campsite.domain, "unknown");
});

test("bare payload keywords stay in Ask with a Payload CTA — no invented plated weight", function () {
  const result = copilot.handleAsk("Mass in Service");
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "later");
  assert.match(result.href, /motorhomepayload/);
  assert.doesNotMatch(result.answer, /\b\d+\s*kg\b/);
});

test("coolbox + portable aircon + battery stays in Ask with a soft Power CTA", function () {
  const question = "what happens to my battery if I add a coolbox and a portable aircon";
  const decision = copilot.resolveAsk(question, { routeAsk: routeAsk });
  assert.equal(decision.navigate, false);
  assert.equal(decision.unmatched, false);
  assert.equal(decision.view.handled, true);
  assert.equal(decision.view.kind, "later");
  assert.equal(decision.view.domain, "power");
  assert.match(decision.view.href, /motorhomepower/);
  assert.match(decision.view.hrefLabel, /Open (?:Power|Battery)/i);
  assert.doesNotMatch(decision.view.answer, /\d+\s*(?:ah|wh|w|kwh|amp)/i);
  assert.doesNotMatch(decision.view.answer, /\b\d+\s*hours?\b/i);
});

function siblingGasCooking(state) {
  const adults = state.adults;
  const children = state.children || 0;
  const meals = state.mealsPerDay;
  const rate = copilot.GAS_COOK_STYLES[state.cookingStyle].kgPerPersonPerMeal;
  const dailyKg = (adults + children * copilot.GAS_CHILD_FACTOR) * meals * rate;
  const bottleKg = state.bottleKg;
  return {
    dailyKg: dailyKg,
    bottleDays: dailyKg > 0 ? bottleKg / dailyKg : 0
  };
}

test("Gas cooking-line maths matches mhwater calcGas cook row", function () {
  const ours = copilot.calcGasCooking({
    adults: 2,
    children: 0,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    bottleKg: 7
  });
  const sibling = siblingGasCooking({
    adults: 2,
    children: 0,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    bottleKg: 7
  });
  assert.equal(ours.dailyKg, 0.28);
  assert.equal(ours.dailyKg, sibling.dailyKg);
  assert.ok(Math.abs(ours.bottleDays - 25) < 1e-9);
  assert.equal(ours.bottleDays, sibling.bottleDays);
  assert.equal(ours.cookRate, 0.07);
});

test("golden: gas BBQ twice a day estimates 0.28 kg/day and ~25 days, stays in Ask", function () {
  const question = "i have bought a gas bbq, if i use it twice a day, how long will my gas last";
  const result = copilot.handleAsk(question);
  assert.equal(result.handled, true);
  assert.equal(result.domain, "gas");
  assert.equal(result.kind, "answer");
  assert.equal(result.dailyKg, 0.28);
  assert.ok(Math.abs(result.bottleDays - 25) < 1e-9);
  assert.match(result.answer, /0\.28/);
  assert.match(result.answer, /25/);
  assert.match(result.answer, /planning estimate/i);
  assert.ok(result.assumptions.some(function (line) {
    return /heavy cook meal/i.test(line) && /not a separate outdoor BBQ/i.test(line);
  }));
  assert.ok(result.assumptions.some(function (line) {
    return /7 kg/.test(line) && /butane/i.test(line);
  }));
  assert.ok(result.assumptions.some(function (line) {
    return /2 adults/i.test(line);
  }));
  assert.ok(result.assumptions.some(function (line) {
    return /heating off/i.test(line) && /fridge/i.test(line) && /boiler/i.test(line);
  }));
  assert.ok(result.followUps.some(function (line) {
    return /bottle kg \/ minutes/i.test(line);
  }));
  assert.match(result.href, /^https:\/\/motorhomewater\.co\.uk\/gas\.html\?/);
  assert.match(result.href, /adults=2/);
  assert.match(result.href, /children=0/);
  assert.match(result.href, /mealsPerDay=2/);
  assert.match(result.href, /cookingStyle=heavy/);
  assert.match(result.href, /heatingLevel=off/);
  assert.match(result.href, /fridgeGasEnabled=0/);
  assert.match(result.href, /boilerEnabled=0/);
  assert.match(result.href, /gasType=butane/);
  assert.match(result.href, /bottleId=butane7/);
  assert.doesNotMatch(result.href, /bottleKg=/);
  assert.doesNotMatch(result.href, /heatingHours=/);
  assert.doesNotMatch(result.href, /boilerLevel=/);
  assert.doesNotMatch(result.href, /boilerHours=/);
  assert.match(result.hrefLabel, /Open Gas to fine-tune/i);
  assert.equal(result.ctaNote, copilot.CTA_NOTE);

  const decision = copilot.resolveAsk(question, { routeAsk: routeAsk });
  assert.equal(decision.navigate, false);
  assert.equal(decision.unmatched, false);
  assert.equal(decision.view.handled, true);
  assert.equal(decision.view.kind, "answer");
  assert.equal(decision.view.domain, "gas");
  assert.match(decision.view.href, /cookingStyle=heavy/);
  assert.equal(decision.view.dailyKg, 0.28);
  assert.ok(Math.abs(decision.view.bottleDays - 25) < 1e-9);

  const sibling = siblingGasCooking({
    adults: 2,
    children: 0,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    bottleKg: 7
  });
  assert.equal(result.dailyKg, sibling.dailyKg);
  assert.equal(result.bottleDays, sibling.bottleDays);
});

test("golden: named 13 kg propane BBQ uses that bottle, not the 7 kg default", function () {
  const question = "gas BBQ twice a day, how long will a 13 kg propane last";
  const result = copilot.handleAsk(question);
  assert.equal(result.handled, true);
  assert.equal(result.domain, "gas");
  assert.equal(result.kind, "answer");
  const sibling = siblingGasCooking({
    adults: 2,
    children: 0,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    bottleKg: 13
  });
  assert.equal(result.dailyKg, 0.28);
  assert.equal(result.bottleDays, sibling.bottleDays);
  assert.equal(result.bottleDays, 13 / 0.28);
  assert.match(result.answer, /0\.28/);
  assert.match(result.answer, /13/);
  assert.match(result.answer, /propane/i);
  assert.ok(result.assumptions.some(function (line) {
    return /13/.test(line) && /propane/i.test(line);
  }));
  assert.ok(!result.assumptions.some(function (line) {
    return /7 kg/.test(line) && /default/i.test(line);
  }));
  assert.match(result.href, /gasType=propane/);
  assert.match(result.href, /bottleId=propane13/);
  assert.doesNotMatch(result.href, /bottleKg=/);
  assert.match(result.href, /cookingStyle=heavy/);
  assert.match(result.href, /heatingLevel=off/);
  assert.match(result.href, /fridgeGasEnabled=0/);
  assert.match(result.href, /boilerEnabled=0/);
  assert.equal(copilot.resolveAsk(question, { routeAsk: routeAsk }).navigate, false);
});

test("Gas CTA href matches mhwater buildGasPrefillHref contract for BBQ twice a day", function () {
  const href = copilot.buildGasPrefillHref({
    adults: 2,
    children: 0,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    heatingLevel: "off",
    fridgeGasEnabled: 0,
    boilerEnabled: 0,
    gasType: "butane",
    bottleId: "butane7"
  }, "https://motorhomewater.co.uk/gas.html");
  const qs = href.slice(href.indexOf("?") + 1);
  const params = new URLSearchParams(qs);
  assert.equal(href.startsWith("https://motorhomewater.co.uk/gas.html?"), true);
  assert.equal(params.get("adults"), "2");
  assert.equal(params.get("children"), "0");
  assert.equal(params.get("mealsPerDay"), "2");
  assert.equal(params.get("cookingStyle"), "heavy");
  assert.equal(params.get("heatingLevel"), "off");
  assert.equal(params.get("fridgeGasEnabled"), "0");
  assert.equal(params.get("boilerEnabled"), "0");
  assert.equal(params.get("gasType"), "butane");
  assert.equal(params.get("bottleId"), "butane7");
  assert.equal(params.get("bottleKg"), null);
  assert.equal(params.get("heatingHours"), null);
  assert.equal(params.get("tripDays"), null);
  copilot.GAS_PREFILL_KEYS.forEach(function (key) {
    assert.ok(typeof key === "string");
  });
});

test("custom bottle kg is sent only when bottleId is custom", function () {
  const href = copilot.gasPrefillHref({
    adults: 2,
    children: 0,
    mealsPerDay: 2,
    cookingStyle: "heavy",
    bottleId: "custom",
    bottleKg: 10,
    gasType: "propane"
  });
  assert.match(href, /bottleId=custom/);
  assert.match(href, /bottleKg=10/);
  assert.match(href, /gasType=propane/);
});

test("gas fridge stays a later stub — cooking estimate is not invented for absorption fridges", function () {
  const result = copilot.handleAsk("gas fridge how much does it use");
  assert.equal(result.handled, true);
  assert.equal(result.domain, "gas");
  assert.equal(result.kind, "later");
  assert.equal(result.dailyKg, null);
  assert.match(result.hrefLabel, /Open Gas/i);
  assert.doesNotMatch(result.answer, /0\.28/);
  assert.doesNotMatch(result.answer, /\b25\s*days?\b/i);
});

test("Ask front door never auto-navigates away from a router match", function () {
  const appJs = fs.readFileSync(path.join(__dirname, "../assets/app.js"), "utf8");
  assert.doesNotMatch(appJs, /window\.open/);
  assert.doesNotMatch(appJs, /Opening /);
  assert.match(appJs, /link\.href = result\.href/);
});

test("plated MAM + Mass in Service CTA passes those limits, not remaining-as-mam", function () {
  const result = copilot.handleAsk("MAM 3500 kg Mass in Service 3000 can I take 3 bikes?");
  assert.equal(result.handled, true);
  assert.equal(result.domain, "payload");
  assert.equal(result.kind, "answer");
  const params = new URLSearchParams(result.href.slice(result.href.indexOf("?") + 1));
  assert.equal(params.get("mam"), "3500");
  assert.equal(params.get("miro"), "3000");
  assert.equal(params.get("bikes"), "3");
  assert.equal(params.get("bikeKg"), "14");
  assert.equal(params.get("rackKg"), "12");
});

test("optional LLM parse may refine slots only — maths stay deterministic", function () {
  const result = copilot.handleAsk("can I take the e-bikes on 720 kg payload", {
    llmParse: function () {
      return {
        domain: "payload",
        calculable: true,
        remainingPayloadKg: 720,
        items: [{ type: "ebike", qty: 2, kgEach: 22 }],
        wantsFit: true
      };
    }
  });
  assert.equal(result.usedKg, 44);
  assert.equal(result.remainingKg, 676);
  assert.equal(copilot.computePayload(result.payloadState).remaining, 676);
});

test("POST /api/ask returns a copilot payload answer without unmatched logging", async function () {
  ask.resetRateLimit();
  const logs = [];
  const originalLog = console.log;
  console.log = function (line) { logs.push(String(line)); };
  const res = fakeRes();
  try {
    await handleAsk({
      method: "POST",
      headers: {},
      body: {
        question: "I've got 720 kg payload — can I take 2 e-bikes at 22 kg each, 100 L water and 2 gas bottles?"
      }
    }, res);
  } finally {
    console.log = originalLog;
  }
  const json = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(json.ok, true);
  assert.equal(json.saved, false);
  assert.equal(json.copilot.handled, true);
  assert.equal(json.copilot.usedKg, 170);
  assert.equal(json.copilot.remainingKg, 550);
  assert.ok(!logs.some(function (line) { return line.indexOf("[ask]") === 0; }));
});

test("POST /api/ask tyre question is HOLD and is not captured as unmatched", async function () {
  ask.resetRateLimit();
  const res = fakeRes();
  await handleAsk({
    method: "POST",
    headers: {},
    body: { question: "what PSI should I run" }
  }, res);
  const json = JSON.parse(res.body);
  assert.equal(json.saved, false);
  assert.equal(json.copilot.kind, "hold");
  assert.equal(json.copilot.domain, "tyres");
});
