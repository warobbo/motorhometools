(function () {
  "use strict";

  var calc = window.CassetteCalc;
  var defaults = window.CassetteDefaults;
  var storage = window.WaterStorage;

  var profile = storage.loadProfile();
  if (!profile.cassettePlan) {
    profile.cassettePlan = defaults.createDefaultPlan(profile.waterUsage, profile.tankPlan);
  }
  var lastSaved = "";

  // URL prefill (Ask / share links) patches cassettePlan only —
  // waterUsage and tankPlan stay.
  var prefilled = calc.applyCassettePrefillToPlan(
    profile.cassettePlan,
    window.location.search,
    profile.waterUsage,
    profile.tankPlan
  );
  if (prefilled) {
    profile.cassettePlan = prefilled;
    profile.cassettePlan.activePreset = "";
  }

  var els = {
    emptyDays: document.getElementById("empty-days"),
    emptyHint: document.getElementById("empty-hint"),
    wasteDaily: document.getElementById("waste-daily"),
    wasteDailyHint: document.getElementById("waste-daily-hint"),
    wasteTrip: document.getElementById("waste-trip"),
    wasteTripHint: document.getElementById("waste-trip-hint"),
    emptiesNeeded: document.getElementById("empties-needed"),
    emptiesUnit: document.getElementById("empties-unit"),
    emptiesHint: document.getElementById("empties-hint"),
    blackLabel: document.getElementById("black-label"),
    blackSizeLabel: document.getElementById("black-size-label"),
    blackStartLabel: document.getElementById("black-start-label"),
    blackKindHint: document.getElementById("black-kind-hint"),
    tripNote: document.getElementById("trip-note"),
    breakdownList: document.getElementById("breakdown-list"),
    saveState: document.getElementById("save-state"),
    presets: document.getElementById("presets"),
    printSheet: document.getElementById("print-sheet"),
    form: document.getElementById("cassette-form"),
    blackKinds: document.getElementById("black-kinds"),
  };

  var FIELD_IDS = [
    "adults",
    "children",
    "tripDays",
    "blackTankLitres",
    "flushesPerPersonPerDay",
    "litresPerFlush",
    "startPercent",
  ];

  var TANK_SIZE_FIELD_IDS = ["blackTankLitres"];
  var tankSizeInputs = null;

  function formatNumber(value, digits) {
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: digits,
      minimumFractionDigits: value < 10 && digits > 0 ? Math.min(digits, 1) : 0,
    }).format(value);
  }

  function formatLitres(value) {
    if (value >= 100) return formatNumber(value, 0);
    if (value >= 1) return formatNumber(value, 1);
    return formatNumber(value, 2);
  }

  function formatDays(value) {
    if (value >= 10) return formatNumber(value, 0);
    if (Math.abs(value - Math.round(value)) < 0.05) return formatNumber(Math.round(value), 0);
    return formatNumber(value, 1);
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
    var active = profile.cassettePlan.activePreset || "";
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
      els.blackLabel.textContent = cassette ? "Days until empty" : "Days until full";
    }
    if (els.blackSizeLabel) {
      els.blackSizeLabel.textContent = cassette ? "Cassette size" : "Black tank size";
    }
    if (els.blackStartLabel) {
      els.blackStartLabel.textContent = cassette ? "Cassette now" : "Black tank now";
    }
    if (els.blackKindHint) {
      els.blackKindHint.textContent = cassette
        ? "A cassette is a removable toilet tank you empty at a service point — usually about 15–20 L on UK leisure vans (Thetford-style)."
        : "A fixed black tank is plumbed in and emptied through a dump valve. Type the litres stamped on the van.";
    }
  }

  function syncForm() {
    var plan = profile.cassettePlan;
    FIELD_IDS.forEach(function (id) {
      setFieldValue(id, plan[id]);
    });
    syncChoiceRow(els.blackKinds, "data-black", plan.blackKind);
    syncBlackCopy(plan);
  }

  function emptyHint(result) {
    var name = result.blackLabel;
    if (result.plan.blackTankLitres <= 0) {
      return "Type a " + name.toLowerCase() + " size.";
    }
    if (result.heads <= 0) {
      return "Add people to see how fast it fills.";
    }
    if (result.wasteDaily <= 0) {
      return "No flushes set, so this will not fill in the plan.";
    }
    if (result.usable <= 0) {
      return name + " is already full. Empty before you start.";
    }
    return (
      formatLitres(result.usable) +
      " L of room · " +
      formatLitres(result.wasteDaily) +
      " L / day."
    );
  }

  function emptiesHint(result) {
    var name = result.blackLabel.toLowerCase();
    if (result.plan.blackTankLitres <= 0) {
      return "Type a size to see empties for this trip.";
    }
    if (result.wasteTrip <= 0 && result.startLitres <= 0) {
      return "Nothing to empty on this trip.";
    }
    if (result.emptiesNeeded === 1 && result.extraEmpties === 0) {
      return "One empty covers the trip — usually at the end, or when you pass a service point.";
    }
    if (result.extraEmpties === 0) {
      return "The starting room covers the trip. Empty the " + name + " when you can.";
    }
    if (result.extraEmpties === 1) {
      return "Plan 1 empty during the trip, plus one at the end.";
    }
    return (
      "Plan " +
      result.extraEmpties +
      " empties during the trip, plus one at the end."
    );
  }

  function renderTotals() {
    var result = calc.calcCassette(profile.cassettePlan, profile.waterUsage, profile.tankPlan);
    var plan = result.plan;
    var name = result.blackLabel;

    if (plan.blackTankLitres <= 0 || result.wasteDaily <= 0 || result.usable <= 0) {
      els.emptyDays.textContent = result.usable <= 0 && plan.blackTankLitres > 0 && result.wasteDaily > 0 ? "0" : "—";
    } else {
      els.emptyDays.textContent = formatDays(result.daysUntilEmpty);
    }
    els.emptyHint.textContent = emptyHint(result);

    els.wasteDaily.textContent = result.wasteDaily > 0 ? formatLitres(result.wasteDaily) : "0";
    els.wasteDailyHint.textContent =
      result.heads <= 0
        ? "Add people to see daily waste."
        : formatNumber(result.flushesPerDay, 0) +
          " flushes a day · " +
          formatLitres(plan.litresPerFlush) +
          " L each.";

    els.wasteTrip.textContent = result.wasteTrip > 0 ? formatLitres(result.wasteTrip) : "0";
    els.wasteTripHint.textContent =
      "Over " + formatDays(plan.tripDays) + " days. Planning estimate only.";

    els.emptiesNeeded.textContent = String(result.emptiesNeeded);
    if (els.emptiesUnit) {
      els.emptiesUnit.textContent = result.emptiesNeeded === 1 ? "empty" : "empties";
    }
    els.emptiesHint.textContent = emptiesHint(result);

    if (els.tripNote) {
      if (result.emptiesNeeded <= 0) {
        els.tripNote.textContent =
          "For your " + formatDays(plan.tripDays) + "-day trip the " + name.toLowerCase() + " stays empty in this plan.";
      } else if (result.extraEmpties <= 0) {
        els.tripNote.textContent =
          "For your " +
          formatDays(plan.tripDays) +
          "-day trip the " +
          name.toLowerCase() +
          " covers the stretch. Empty it when you finish, or sooner if it smells.";
      } else {
        els.tripNote.textContent =
          "For your " +
          formatDays(plan.tripDays) +
          "-day trip, plan about " +
          result.emptiesNeeded +
          (result.emptiesNeeded === 1 ? " empty" : " empties") +
          " at a proper service point.";
      }
    }

    var rows = [
      {
        name: "Flush waste each day",
        detail: formatNumber(result.flushesPerDay, 0) + " flushes · " + formatLitres(plan.litresPerFlush) + " L each",
        value: formatLitres(result.wasteDaily) + " L",
        show: result.wasteDaily > 0,
        pct: 100,
      },
      {
        name: "Waste this trip",
        detail: formatDays(plan.tripDays) + " days at that daily use",
        value: formatLitres(result.wasteTrip) + " L",
        show: result.wasteTrip > 0,
        pct: plan.blackTankLitres > 0 ? Math.min(100, (result.wasteTrip / plan.blackTankLitres) * 100) : 0,
      },
      {
        name: "Room left now",
        detail:
          formatLitres(result.startLitres) +
          " L already in · " +
          formatLitres(plan.blackTankLitres) +
          " L tank",
        value: formatLitres(result.usable) + " L",
        show: plan.blackTankLitres > 0,
        pct: plan.blackTankLitres > 0 ? (result.usable / plan.blackTankLitres) * 100 : 0,
      },
    ].filter(function (row) {
      return row.show;
    });

    if (!rows.length) {
      els.breakdownList.innerHTML =
        '<li class="breakdown-empty">Nothing to plan yet. Add people, flushes and a cassette size.</li>';
      return;
    }

    els.breakdownList.innerHTML = rows
      .map(function (row) {
        return (
          '<li class="breakdown-row">' +
          '<div class="breakdown-meta">' +
          "<span>" +
          escapeHtml(row.name) +
          "</span>" +
          "<strong>" +
          escapeHtml(row.value) +
          "</strong>" +
          "</div>" +
          '<p class="field-hint">' +
          escapeHtml(row.detail) +
          "</p>" +
          '<div class="breakdown-bar" role="presentation"><span style="width:' +
          row.pct.toFixed(1) +
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

  function readTankLitres(id, live) {
    var el = document.getElementById(id);
    var raw = el ? el.value : "";
    if (live && window.WaterUI) {
      return window.WaterUI.parseLiveNumber(raw, profile.cassettePlan[id]);
    }
    return raw;
  }

  function updateFromForm(options) {
    var liveTankSizes = options && options.liveTankSizes;
    var plan = profile.cassettePlan;
    plan.adults = document.getElementById("adults").value;
    plan.children = document.getElementById("children").value;
    plan.tripDays = document.getElementById("tripDays").value;
    plan.blackTankLitres = readTankLitres("blackTankLitres", liveTankSizes);
    plan.flushesPerPersonPerDay = document.getElementById("flushesPerPersonPerDay").value;
    plan.litresPerFlush = document.getElementById("litresPerFlush").value;
    plan.startPercent = document.getElementById("startPercent").value;
    profile.cassettePlan = calc.normalisePlan(plan, profile.waterUsage, profile.tankPlan);
    profile.cassettePlan.activePreset = "";
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
      el.value = profile.cassettePlan[el.id];
    }
    updateFromForm();
    persist();
    render();
  }

  function applyPreset(presetId) {
    if (storage.applyCassettePreset) {
      profile = storage.applyCassettePreset(profile, presetId);
    } else {
      var preset = defaults.PRESETS[presetId];
      if (!preset) return;
      var plan =
        presetId === "defaults"
          ? defaults.createDefaultPlan(profile.waterUsage, profile.tankPlan)
          : preset.usage;
      profile.cassettePlan = calc.normalisePlan(plan, profile.waterUsage, profile.tankPlan);
      profile.cassettePlan.activePreset = presetId;
    }
    persist();
    render();
  }

  function applyBlackKind(kindId) {
    var nextKind = calc.sanitiseBlackKind(kindId);
    var currentLitres = profile.cassettePlan.blackTankLitres;
    profile.cassettePlan.blackKind = nextKind;
    profile.cassettePlan.blackTankLitres = calc.blackLitresForKind(nextKind, currentLitres);
    profile.cassettePlan = calc.normalisePlan(
      profile.cassettePlan,
      profile.waterUsage,
      profile.tankPlan
    );
    profile.cassettePlan.activePreset = "";
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
