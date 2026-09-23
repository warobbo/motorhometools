#!/usr/bin/env node
"use strict";

var assert = require("assert");
var path = require("path");
var ui = require(path.join(__dirname, "..", "..", "water", "assets", "ui.js"));

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

test("partial tank sizes stay as the last committed value while typing", function () {
  assert.strictEqual(ui.isPartialNumberInput(""), true);
  assert.strictEqual(ui.isPartialNumberInput("   "), true);
  assert.strictEqual(ui.isPartialNumberInput("-"), true);
  assert.strictEqual(ui.isPartialNumberInput("."), true);
  assert.strictEqual(ui.parseLiveNumber("", 18), 18);
  assert.strictEqual(ui.parseLiveNumber("", 90), 90);
  assert.strictEqual(ui.parseLiveNumber("", 80), 80);
  assert.strictEqual(ui.parseLiveNumber("", 100), 100);
});

test("first digits of 20, 65, 100 and 50 are kept while typing", function () {
  assert.strictEqual(ui.parseLiveNumber("2", 18), 2);
  assert.strictEqual(ui.parseLiveNumber("20", 18), 20);
  assert.strictEqual(ui.parseLiveNumber("6", 90), 6);
  assert.strictEqual(ui.parseLiveNumber("65", 90), 65);
  assert.strictEqual(ui.parseLiveNumber("1", 90), 1);
  assert.strictEqual(ui.parseLiveNumber("10", 90), 10);
  assert.strictEqual(ui.parseLiveNumber("100", 90), 100);
  assert.strictEqual(ui.parseLiveNumber("5", 80), 5);
  assert.strictEqual(ui.parseLiveNumber("50", 80), 50);
  assert.strictEqual(ui.parseLiveNumber("1", 80), 1);
  assert.strictEqual(ui.parseLiveNumber("100", 80), 100);
});

test("finished values are not treated as partial", function () {
  assert.strictEqual(ui.isPartialNumberInput("20"), false);
  assert.strictEqual(ui.isPartialNumberInput("0"), false);
  assert.strictEqual(ui.isPartialNumberInput("100"), false);
});

test("bindCommitOnBlurNumbers wires live and blur for the named fields only", function () {
  var liveCount = 0;
  var commitCount = 0;
  var lastLive = null;
  var lastCommit = null;
  var handlers = {};
  var form = {
    addEventListener: function (type, fn) {
      handlers[type] = fn;
    },
  };

  var binding = ui.bindCommitOnBlurNumbers(form, ["freshTankLitres", "greyTankLitres", "blackTankLitres"], {
    onLive: function (el) {
      liveCount += 1;
      lastLive = el.id;
    },
    onCommit: function (el) {
      commitCount += 1;
      lastCommit = el.id;
    },
  });

  handlers.input({ target: { id: "greyTankLitres" } });
  handlers.input({ target: { id: "tripDays" } });
  handlers.focusout({ target: { id: "blackTankLitres" } });
  handlers.focusout({ target: { id: "freshStartPercent" } });

  assert.strictEqual(liveCount, 1);
  assert.strictEqual(lastLive, "greyTankLitres");
  assert.strictEqual(commitCount, 1);
  assert.strictEqual(lastCommit, "blackTankLitres");
  assert.strictEqual(binding.isBound({ id: "freshTankLitres" }), true);
  assert.strictEqual(binding.isBound({ id: "tripDays" }), false);
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}

console.log("\nall tests passed");
