(function () {
  "use strict";

  var waterCalc = window.WaterCalc;
  var calc = window.TankCalc;
  var defaults = window.TankDefaults;
  var storage = window.WaterStorage;

  var profile = storage.loadProfile();
  if (!profile.tankPlan) {
    profile.tankPlan = defaults.createDefaultPlan(profile.waterUsage);
  }
  var lastSaved = "";

  var els = {
    stretchDays: document.getElementById("stretch-days"),
    stretchHint: document.getElementById("stretch-hint"),
    freshDays: document.getElementById("fresh-days"),
    freshHint: document.getElementById("fresh-hint"),
    greyDays: document.getElementById("grey-days"),
    greyHint: document.getElementById("grey-hint"),
    blackDays: document.getElementById("black-days"),
    blackHint: document.getElementById("black-hint"),
    blackLabel: document.getElementById("black-label"),
    blackSizeLabel: document.getElementById("black-size-label"),
    blackStartLabel: document.getElementById("black-start-label"),
    blackKindHint: document.getElementById("black-kind-hint"),
    tripNote: document.getElementById("trip-note"),
    weightNote: document.getElementById("weight-note"),
    breakdownList: document.getElementById("breakdown-list"),
    waterSummary: document.getElementById("water-summary"),
    saveState: document.getElementById("save-state"),
    presets: document.getElementById("presets"),
    printSheet: document.getElementById("print-sheet"),
    form: document.getElementById("tank-form"),
    blackKinds: document.getElementById("black-kinds"),
  };

  var FIELD_IDS = [
    "tripDays",
    "freshTankLitres",
    "greyTankLitres",
    "blackTankLitres",
    "freshStartPercent",
    "greyStartPercent",
    "blackStartPercent",
  ];

  var TANK_SIZE_FIELD_IDS = ["freshTankLitres", "greyTankLitres", "blackTankLitres"];
  var tankSizeInputs = null;

  function formatNumber(value, digits) {
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: digits,
      minimumFractionDigits: value < 10 && digits > 0 ? Math.min(digits, 1) : 0,
    }).format(value);
  }

  function formatLitres(value) {
    if (value >= 100) return formatNumber(value, 0);
    if (value >= 10) return formatNumber(value, 1);
    return formatNumber(value, 1);
  }

  function formatDays(value) {
    if (value >= 10) return formatNumber(value, 0);
    if (Math.abs(value - Math.round(value)) < 0.05) return formatNumber(Math.round(value), 0);
    return formatNumber(value, 1);
  }

  function formatPeople(usage) {
    var parts = [];
    if (usage.adults === 1) parts.push("1 adult");
    else if (usage.adults > 1) parts.push(usage.adults + " adults");
    if (usage.children === 1) parts.push("1 child");
    else if (usage.children > 1) parts.push(usage.children + " children");
    if (!parts.length) return "No people set on Water";
    return parts.join(" and ");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function persist() {
    storage.saveProfile(profile);
    lastSaved = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (els.saveState) {
      els.saveState.textContent = "Saved on this device · " + lastSaved;
    }
  }

  function syncPresetSelection() {
    if (!els.presets) return;
    var active = profile.tankPlan.activePreset || "";
    els.presets.querySelectorAll("[data-preset]").forEach(function (button) {
      var selected = button.getAttribute("data-preset") === active;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function renderPresetButtons() {
    if (!els.presets) return;
    els.presets.innerHTML = defaults.PRESET_ORDER.map(function (id) {
      var preset = defaults.PRESETS[id];
      var fullLabel = preset.sublabel
        ? preset.label + " (" + preset.sublabel + ")"
        : preset.label;
      var inner = '<span class="preset-label">' + escapeHtml(preset.label) + "</span>";
      if (preset.sublabel) {
        inner +=
          '<span class="preset-sublabel">' + escapeHtml(preset.sublabel) + "</span>";
      }
      return (
        '<button type="button" data-preset="' +
        escapeHtml(id) +
        '" aria-pressed="false" aria-label="' +
        escapeHtml(fullLabel) +
        '">' +
        inner +
        "</button>"
      );
    }).join("");
    syncPresetSelection();
  }

  function setFieldValue(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = !!value;
      return;
    }
    if (tankSizeInputs && tankSizeInputs.isEditing(el)) return;
    el.value = value;
  }

  function syncChoiceRow(container, attr, active) {
    if (!container) return;
    container.querySelectorAll("[" + attr + "]").forEach(function (button) {
      var selected = button.getAttribute(attr) === active;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function syncBlackCopy(plan) {
    var cassette = plan.blackKind !== "fixed";
    if (els.blackLabel) {
      els.blackLabel.textContent = cassette ? "Cassette needs empty" : "Black tank fills";
    }
    if (els.blackSizeLabel) {
      els.blackSizeLabel.textContent = cassette ? "Cassette size" : "Black tank size";
    }
    if (els.blackStartLabel) {
      els.blackStartLabel.textContent = cassette ? "Cassette now" : "Black tank now";
    }
    if (els.blackKindHint) {
      els.blackKindHint.textContent = cassette
        ? "A cassette is a removable toilet tank you empty at a service point — usually about 15–20 L on UK leisure vans."
        : "A fixed black tank is plumbed in and emptied through a dump valve. Type the litres stamped on the van.";
    }
  }

  function syncForm() {
    var plan = profile.tankPlan;
    FIELD_IDS.forEach(function (id) {
      setFieldValue(id, plan[id]);
    });
    syncChoiceRow(els.blackKinds, "data-black", plan.blackKind);
    syncBlackCopy(plan);
  }

  function daysDisplay(days, daily, tank, usable) {
    if (tank <= 0) return "—";
    if (daily <= 0) return "—";
    if (usable <= 0) return "0";
    return formatDays(days);
  }

  function stopPhrase(count, verb, noun) {
    if (count <= 0) return "covers the trip — no extra " + verb + ".";
    if (count === 1) return "needs 1 extra " + noun + ".";
    return "needs " + count + " extra " + noun + "s.";
  }

  function renderTotals() {
    var result = calc.calcTanks(profile.tankPlan, profile.waterUsage);
    var plan = result.plan;
    var waterUsage = result.water.usage;
    var blackName = result.blackLabel;

    if (els.waterSummary) {
      els.waterSummary.textContent =
        formatPeople(waterUsage) +
        " · " +
        formatLitres(result.freshDaily) +
        " L fresh a day · " +
        formatLitres(result.greyDaily) +
        " L grey a day · " +
        formatLitres(result.blackDaily) +
        " L into the " +
        (plan.blackKind === "cassette" ? "cassette" : "black tank") +
        " a day. Change showers and habits on the Water page.";
    }

    if (!result.limiter) {
      els.stretchDays.textContent = "—";
      els.stretchHint.textContent =
        "Add a tank size and some water use on the Water page to see how long a stretch lasts.";
    } else if (result.stretchDays <= 0) {
      els.stretchDays.textContent = "0";
      els.stretchHint.textContent =
        result.limiter.name +
        " " +
        result.limiter.verb +
        " already. Fill or empty before you start.";
    } else {
      els.stretchDays.textContent = formatDays(result.stretchDays);
      els.stretchHint.textContent =
        result.limiter.name +
        " " +
        result.limiter.verb +
        " first, after about " +
        formatDays(result.stretchDays) +
        " days. That is the limit of this stretch.";
    }

    els.freshDays.textContent = daysDisplay(
      result.daysFresh,
      result.freshDaily,
      plan.freshTankLitres,
      result.freshUsable
    );
    if (plan.freshTankLitres <= 0) {
      els.freshHint.textContent = "Type a fresh tank size.";
    } else if (result.freshDaily <= 0) {
      els.freshHint.textContent = "No fresh water use on the Water page.";
    } else if (result.freshUsable <= 0) {
      els.freshHint.textContent = "Fresh tank is already empty.";
    } else {
      els.freshHint.textContent =
        formatLitres(result.freshUsable) +
        " L left · " +
        formatLitres(result.freshDaily) +
        " L / day.";
    }

    els.greyDays.textContent = daysDisplay(
      result.daysGrey,
      result.greyDaily,
      plan.greyTankLitres,
      result.greyUsable
    );
    if (plan.greyTankLitres <= 0) {
      els.greyHint.textContent = "Type a grey tank size.";
    } else if (result.greyDaily <= 0) {
      els.greyHint.textContent = "No grey water in your Water figures.";
    } else if (result.greyUsable <= 0) {
      els.greyHint.textContent = "Grey tank is already full.";
    } else {
      els.greyHint.textContent =
        formatLitres(result.greyUsable) +
        " L of room · " +
        formatLitres(result.greyDaily) +
        " L / day.";
    }

    els.blackDays.textContent = daysDisplay(
      result.daysBlack,
      result.blackDaily,
      plan.blackTankLitres,
      result.blackUsable
    );
    if (plan.blackTankLitres <= 0) {
      els.blackHint.textContent = "Type a " + blackName.toLowerCase() + " size.";
    } else if (result.blackDaily <= 0) {
      els.blackHint.textContent =
        "No cassette flushes on the Water page, so this will not fill in the plan.";
    } else if (result.blackUsable <= 0) {
      els.blackHint.textContent = blackName + " is already full.";
    } else {
      els.blackHint.textContent =
        formatLitres(result.blackUsable) +
        " L of room · " +
        formatLitres(result.blackDaily) +
        " L / day.";
    }

    els.tripNote.textContent =
      "For your " +
      formatDays(plan.tripDays) +
      "-day trip: Fresh " +
      stopPhrase(result.freshFills, "fill", "fill") +
      " Grey " +
      stopPhrase(result.greyEmpties, "empty", "empty") +
      " " +
      blackName +
      " " +
      stopPhrase(result.blackEmpties, "empty", "empty");

    if (plan.freshTankLitres > 0) {
      els.weightNote.textContent =
        "A full " +
        formatLitres(plan.freshTankLitres) +
        " L fresh tank is about " +
        formatLitres(result.freshWeightKg) +
        " kg (1 litre ≈ 1 kg).";
    } else {
      els.weightNote.textContent =
        "Water weighs about 1 kg per litre. Type a fresh tank size to see that weight.";
    }

    var rows = [
      {
        name: "Fresh tank",
        detail:
          formatLitres(result.freshUsable) +
          " L left · " +
          formatLitres(result.freshDaily) +
          " L/day",
        days: result.daysFresh,
        show: plan.freshTankLitres > 0 && result.freshDaily > 0,
        limit: result.limiter && result.limiter.id === "fresh",
      },
      {
        name: "Grey tank",
        detail:
          formatLitres(result.greyUsable) +
          " L room · " +
          formatLitres(result.greyDaily) +
          " L/day",
        days: result.daysGrey,
        show: plan.greyTankLitres > 0 && result.greyDaily > 0,
        limit: result.limiter && result.limiter.id === "grey",
      },
      {
        name: blackName,
        detail:
          formatLitres(result.blackUsable) +
          " L room · " +
          formatLitres(result.blackDaily) +
          " L/day",
        days: result.daysBlack,
        show: plan.blackTankLitres > 0 && result.blackDaily > 0,
        limit: result.limiter && result.limiter.id === "black",
      },
    ].filter(function (row) {
      return row.show;
    });

    if (!rows.length) {
      els.breakdownList.innerHTML =
        '<li class="breakdown-empty">Nothing to plan yet. Add tank sizes here and water use on the Water page.</li>';
      return;
    }

    var maxDays = rows.reduce(function (max, row) {
      return Math.max(max, row.days);
    }, 0);

    els.breakdownList.innerHTML = rows
      .map(function (row) {
        var pct = maxDays > 0 ? (row.days / maxDays) * 100 : 0;
        var label = row.limit ? row.name + " · limits the stretch" : row.name;
        return (
          '<li class="breakdown-row">' +
          '<div class="breakdown-meta">' +
          "<span>" +
          escapeHtml(label) +
          "</span>" +
          "<strong>" +
          (row.days > 0 ? formatDays(row.days) + " days" : "now") +
          "</strong>" +
          "</div>" +
          '<p class="field-hint">' +
          escapeHtml(row.detail) +
          "</p>" +
          '<div class="breakdown-bar" role="presentation"><span style="width:' +
          pct.toFixed(1) +
          '%"></span></div>' +
          "</li>"
        );
      })
      .join("");
  }

  function render() {
    syncForm();
    renderTotals();
    syncPresetSelection();
  }

  function syncFreshToWater() {
    profile.waterUsage.freshTankLitres = profile.tankPlan.freshTankLitres;
    profile.waterUsage = waterCalc.normaliseUsage(profile.waterUsage);
  }

  function readTankLitres(id, live) {
    var el = document.getElementById(id);
    var raw = el ? el.value : "";
    if (live && window.WaterUI) {
      return window.WaterUI.parseLiveNumber(raw, profile.tankPlan[id]);
    }
    return raw;
  }

  function updateFromForm(options) {
    var liveTankSizes = options && options.liveTankSizes;
    var plan = profile.tankPlan;
    plan.tripDays = document.getElementById("tripDays").value;
    plan.freshTankLitres = readTankLitres("freshTankLitres", liveTankSizes);
    plan.greyTankLitres = readTankLitres("greyTankLitres", liveTankSizes);
    plan.blackTankLitres = readTankLitres("blackTankLitres", liveTankSizes);
    plan.freshStartPercent = document.getElementById("freshStartPercent").value;
    plan.greyStartPercent = document.getElementById("greyStartPercent").value;
    plan.blackStartPercent = document.getElementById("blackStartPercent").value;
    profile.tankPlan = calc.normalisePlan(plan, profile.waterUsage);
    profile.tankPlan.activePreset = "";
    syncFreshToWater();
  }

  function onFormInput(event) {
    if (tankSizeInputs && tankSizeInputs.isBound(event.target)) return;
    updateFromForm();
    persist();
    render();
  }

  function onTankSizeLive() {
    updateFromForm({ liveTankSizes: true });
    persist();
    renderTotals();
    syncPresetSelection();
  }

  function onTankSizeCommit(el) {
    if (el && window.WaterUI && window.WaterUI.isPartialNumberInput(el.value)) {
      el.value = profile.tankPlan[el.id];
    }
    updateFromForm();
    persist();
    render();
  }

  function applyPreset(presetId) {
    if (storage.applyTankPreset) {
      profile = storage.applyTankPreset(profile, presetId);
    } else {
      var preset = defaults.PRESETS[presetId];
      if (!preset) return;
      var plan =
        presetId === "defaults"
          ? defaults.createDefaultPlan(profile.waterUsage)
          : preset.usage;
      profile.tankPlan = calc.normalisePlan(plan, profile.waterUsage);
      profile.tankPlan.activePreset = presetId;
      syncFreshToWater();
    }
    persist();
    render();
  }

  function applyBlackKind(kindId) {
    var nextKind = calc.sanitiseBlackKind(kindId);
    var currentLitres = profile.tankPlan.blackTankLitres;
    profile.tankPlan.blackKind = nextKind;
    profile.tankPlan.blackTankLitres = calc.blackLitresForKind(nextKind, currentLitres);
    profile.tankPlan = calc.normalisePlan(profile.tankPlan, profile.waterUsage);
    profile.tankPlan.activePreset = "";
    persist();
    render();
  }

  if (els.form) {
    tankSizeInputs = window.WaterUI
      ? window.WaterUI.bindCommitOnBlurNumbers(els.form, TANK_SIZE_FIELD_IDS, {
          onLive: onTankSizeLive,
          onCommit: onTankSizeCommit,
        })
      : null;
    els.form.addEventListener("input", onFormInput);
    els.form.addEventListener("change", onFormInput);
  }

  if (els.presets) {
    els.presets.addEventListener("click", function (event) {
      var button = event.target.closest("[data-preset]");
      if (!button) return;
      applyPreset(button.getAttribute("data-preset"));
    });
  }

  if (els.blackKinds) {
    els.blackKinds.addEventListener("click", function (event) {
      var button = event.target.closest("[data-black]");
      if (!button) return;
      applyBlackKind(button.getAttribute("data-black"));
    });
  }

  if (els.printSheet) {
    els.printSheet.addEventListener("click", function () {
      window.print();
    });
  }

  renderPresetButtons();
  render();
  persist();
  if (window.WaterUI) window.WaterUI.setupRotateGate();
})();
