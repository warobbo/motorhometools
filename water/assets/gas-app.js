(function () {
  "use strict";

  var calc = window.GasCalc;
  var defaults = window.GasDefaults;
  var storage = window.WaterStorage;

  var profile = storage.loadProfile();
  if (!profile.gasUsage) {
    profile.gasUsage = defaults.createDefaultUsage(profile.waterUsage);
  }
  var lastSaved = "";

  // URL prefill (Ask / share links) patches gasUsage only — waterUsage stays.
  var prefilled = calc.applyGasPrefillToUsage(
    profile.gasUsage,
    window.location.search,
    profile.waterUsage
  );
  if (prefilled) {
    profile.gasUsage = prefilled;
    profile.gasUsage.activePreset = "";
  }

  var els = {
    breakdownList: document.getElementById("breakdown-list"),
    totalTrip: document.getElementById("total-trip"),
    totalDaily: document.getElementById("total-daily"),
    bottleDays: document.getElementById("bottle-days"),
    bottleHint: document.getElementById("bottle-hint"),
    bottlesNeeded: document.getElementById("bottles-needed"),
    bottlesUnit: document.getElementById("bottles-unit"),
    bottlesHint: document.getElementById("bottles-hint"),
    saveState: document.getElementById("save-state"),
    presets: document.getElementById("presets"),
    printSheet: document.getElementById("print-sheet"),
    form: document.getElementById("usage-form"),
    fridgeFields: document.getElementById("fridge-fields"),
    boilerFields: document.getElementById("boiler-fields"),
    seasons: document.getElementById("seasons"),
    cookingStyles: document.getElementById("cooking-styles"),
    heatingLevels: document.getElementById("heating-levels"),
    boilerLevels: document.getElementById("boiler-levels"),
    gasTypes: document.getElementById("gas-types"),
    bottles: document.getElementById("bottles"),
  };

  var FIELD_IDS = [
    "adults",
    "children",
    "tripDays",
    "mealsPerDay",
    "heatingHours",
    "fridgeGasEnabled",
    "fridgeHoursPerDay",
    "boilerEnabled",
    "boilerHours",
    "bottleKg",
  ];

  function formatNumber(value, digits) {
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: digits,
      minimumFractionDigits: value < 10 && digits > 0 ? Math.min(digits, 1) : 0,
    }).format(value);
  }

  function formatKg(value) {
    if (value >= 100) return formatNumber(value, 0);
    if (value >= 10) return formatNumber(value, 1);
    return formatNumber(value, 2);
  }

  function formatDays(value) {
    if (value >= 10) return formatNumber(value, 0);
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
    var active = profile.gasUsage.activePreset || "";
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

  function renderBottleButtons() {
    if (!els.bottles) return;
    var gasType = profile.gasUsage && profile.gasUsage.gasType;
    var bottles = calc.bottlesForGas(gasType);
    els.bottles.innerHTML = bottles
      .map(function (bottle) {
        var fullLabel = bottle.label + " " + bottle.sublabel;
        return (
          '<button type="button" data-bottle="' +
          escapeHtml(bottle.id) +
          '" aria-pressed="false" aria-label="' +
          escapeHtml(fullLabel) +
          '">' +
          '<span class="preset-label">' +
          escapeHtml(bottle.label) +
          "</span>" +
          '<span class="preset-sublabel">' +
          escapeHtml(bottle.sublabel) +
          "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  function setFieldValue(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = !!value;
      return;
    }
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

  function syncForm() {
    var usage = profile.gasUsage;
    FIELD_IDS.forEach(function (id) {
      setFieldValue(id, usage[id]);
    });
    if (els.fridgeFields) {
      els.fridgeFields.hidden = !usage.fridgeGasEnabled;
    }
    if (els.boilerFields) {
      els.boilerFields.hidden = !usage.boilerEnabled;
    }
    syncChoiceRow(els.seasons, "data-season", usage.season);
    syncChoiceRow(els.cookingStyles, "data-cooking", usage.cookingStyle);
    syncChoiceRow(els.heatingLevels, "data-heating", usage.heatingLevel);
    syncChoiceRow(els.boilerLevels, "data-boiler", usage.boilerLevel);
    syncChoiceRow(els.gasTypes, "data-gas", usage.gasType);
    syncChoiceRow(els.bottles, "data-bottle", usage.bottleId);
  }

  function bottleLabel(usage) {
    if (usage.bottleId !== "custom" && calc.BOTTLES[usage.bottleId]) {
      var named = calc.BOTTLES[usage.bottleId];
      return named.label + " " + named.sublabel;
    }
    return formatKg(usage.bottleKg) + " kg bottle";
  }

  function renderTotals() {
    var result = calc.calcGas(profile.gasUsage, profile.waterUsage);
    var usage = result.usage;

    els.totalTrip.textContent = formatKg(result.tripKg);
    els.totalDaily.textContent = formatKg(result.dailyKg);

    if (result.dailyKg <= 0) {
      els.bottleDays.textContent = "—";
      els.bottleHint.textContent = "No gas used at these settings, so a bottle is not being emptied.";
      els.bottlesNeeded.textContent = "0";
      if (els.bottlesUnit) els.bottlesUnit.textContent = "bottles";
      els.bottlesHint.textContent = "Nothing to buy for this trip.";
    } else {
      els.bottleDays.textContent = formatDays(result.bottleDays);
      els.bottleHint.textContent =
        "A " +
        bottleLabel(usage) +
        " lasts about " +
        formatDays(result.bottleDays) +
        " days at this daily use.";
      els.bottlesNeeded.textContent = String(result.bottlesNeeded);
      if (els.bottlesUnit) {
        els.bottlesUnit.textContent = result.bottlesNeeded === 1 ? "bottle" : "bottles";
      }
      els.bottlesHint.textContent =
        result.bottlesNeeded === 1
          ? "One " + bottleLabel(usage) + " covers the trip (rounded up)."
          : result.bottlesNeeded +
            " × " +
            bottleLabel(usage) +
            " to cover the trip (rounded up).";
    }

    var ranked = result.items
      .filter(function (item) {
        return item.kgPerDay > 0;
      })
      .sort(function (a, b) {
        return b.kgPerDay - a.kgPerDay;
      });

    if (!ranked.length) {
      els.breakdownList.innerHTML =
        '<li class="breakdown-empty">Nothing using gas yet. Add cooking, heating, a fridge on gas, or hot water.</li>';
      return;
    }

    els.breakdownList.innerHTML = ranked
      .map(function (item) {
        var pct = result.dailyKg > 0 ? (item.kgPerDay / result.dailyKg) * 100 : 0;
        return (
          '<li class="breakdown-row">' +
          '<div class="breakdown-meta">' +
          "<span>" +
          escapeHtml(item.name) +
          "</span>" +
          "<strong>" +
          formatKg(item.kgTrip) +
          " kg trip · " +
          formatKg(item.kgPerDay) +
          " kg/day</strong>" +
          "</div>" +
          '<div class="breakdown-bar" role="presentation"><span style="width:' +
          pct.toFixed(1) +
          '%"></span></div>' +
          "</li>"
        );
      })
      .join("");
  }

  function render() {
    renderBottleButtons();
    syncForm();
    renderTotals();
    syncPresetSelection();
  }

  function updateFromForm() {
    var usage = profile.gasUsage;
    usage.adults = document.getElementById("adults").value;
    usage.children = document.getElementById("children").value;
    usage.tripDays = document.getElementById("tripDays").value;
    usage.mealsPerDay = document.getElementById("mealsPerDay").value;
    usage.heatingHours = document.getElementById("heatingHours").value;
    usage.fridgeGasEnabled = document.getElementById("fridgeGasEnabled").checked;
    usage.fridgeHoursPerDay = document.getElementById("fridgeHoursPerDay").value;
    usage.boilerEnabled = document.getElementById("boilerEnabled").checked;
    usage.boilerHours = document.getElementById("boilerHours").value;
    usage.bottleKg = document.getElementById("bottleKg").value;
    profile.gasUsage = calc.normaliseUsage(usage, profile.waterUsage);
    profile.gasUsage.activePreset = "";
  }

  function onFormInput(event) {
    var target = event.target;
    var field = target.id;
    if (!field) return;

    if (field === "heatingHours") {
      profile.gasUsage.heatingHours = target.value;
      profile.gasUsage.heatingLevel = calc.matchHeatingLevel(
        calc.clamp(calc.toNumber(target.value, 0), 0, calc.MAX_HEATING_HOURS)
      );
      profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
      profile.gasUsage.activePreset = "";
      persist();
      render();
      return;
    }

    if (field === "boilerHours") {
      profile.gasUsage.boilerHours = target.value;
      profile.gasUsage.boilerLevel = calc.matchBoilerLevel(
        calc.clamp(calc.toNumber(target.value, 0), 0, calc.MAX_BOILER_HOURS)
      );
      profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
      profile.gasUsage.activePreset = "";
      persist();
      render();
      return;
    }

    if (field === "bottleKg") {
      profile.gasUsage.bottleKg = target.value;
      profile.gasUsage.bottleId = calc.matchBottleId(
        calc.clamp(
          calc.toNumber(target.value, calc.BOTTLES[calc.DEFAULT_BOTTLE_ID.butane].kg),
          calc.MIN_BOTTLE_KG,
          calc.MAX_BOTTLE_KG
        ),
        profile.gasUsage.gasType
      );
      profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
      profile.gasUsage.activePreset = "";
      persist();
      render();
      return;
    }

    updateFromForm();
    persist();
    render();
  }

  function applyPreset(presetId) {
    if (storage.applyGasPreset) {
      profile = storage.applyGasPreset(profile, presetId);
    } else {
      var preset = defaults.PRESETS[presetId];
      if (!preset) return;
      var usage =
        presetId === "defaults"
          ? defaults.createDefaultUsage(profile.waterUsage)
          : preset.usage;
      profile.gasUsage = calc.normaliseUsage(usage, profile.waterUsage);
      profile.gasUsage.activePreset = presetId;
    }
    persist();
    render();
  }

  function applySeason(seasonId) {
    if (!calc.SEASONS[seasonId]) return;
    profile.gasUsage = calc.applySeasonToUsage(
      profile.gasUsage,
      seasonId,
      profile.waterUsage
    );
    profile.gasUsage.activePreset = "";
    persist();
    render();
  }

  function applyCookingStyle(styleId) {
    if (!calc.COOK_STYLES[styleId]) return;
    profile.gasUsage.cookingStyle = styleId;
    profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
    profile.gasUsage.activePreset = "";
    persist();
    render();
  }

  function applyHeatingLevel(levelId) {
    var level = calc.HEATING_LEVELS[levelId];
    if (!level) return;
    profile.gasUsage.heatingLevel = level.id;
    profile.gasUsage.heatingHours = level.hours;
    profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
    profile.gasUsage.activePreset = "";
    persist();
    render();
  }

  function applyBoilerLevel(levelId) {
    var level = calc.BOILER_LEVELS[levelId];
    if (!level) return;
    profile.gasUsage.boilerEnabled = true;
    profile.gasUsage.boilerLevel = level.id;
    profile.gasUsage.boilerHours = level.hours;
    profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
    profile.gasUsage.activePreset = "";
    persist();
    render();
  }

  function applyGasType(typeId) {
    var nextType = calc.sanitiseGasType(typeId);
    var currentKg = calc.toNumber(profile.gasUsage.bottleKg, 7);
    var nextBottleId = calc.closestBottleId(currentKg, nextType);
    profile.gasUsage.gasType = nextType;
    profile.gasUsage.bottleId = nextBottleId;
    profile.gasUsage.bottleKg = calc.BOTTLES[nextBottleId].kg;
    profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
    profile.gasUsage.activePreset = "";
    persist();
    render();
  }

  function applyBottle(bottleId) {
    var bottle = calc.BOTTLES[bottleId];
    if (!bottle) return;
    profile.gasUsage.gasType = bottle.gasType;
    profile.gasUsage.bottleId = bottle.id;
    profile.gasUsage.bottleKg = bottle.kg;
    profile.gasUsage = calc.normaliseUsage(profile.gasUsage, profile.waterUsage);
    profile.gasUsage.activePreset = "";
    persist();
    render();
  }

  if (els.form) {
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

  if (els.seasons) {
    els.seasons.addEventListener("click", function (event) {
      var button = event.target.closest("[data-season]");
      if (!button) return;
      applySeason(button.getAttribute("data-season"));
    });
  }

  if (els.cookingStyles) {
    els.cookingStyles.addEventListener("click", function (event) {
      var button = event.target.closest("[data-cooking]");
      if (!button) return;
      applyCookingStyle(button.getAttribute("data-cooking"));
    });
  }

  if (els.heatingLevels) {
    els.heatingLevels.addEventListener("click", function (event) {
      var button = event.target.closest("[data-heating]");
      if (!button) return;
      applyHeatingLevel(button.getAttribute("data-heating"));
    });
  }

  if (els.boilerLevels) {
    els.boilerLevels.addEventListener("click", function (event) {
      var button = event.target.closest("[data-boiler]");
      if (!button) return;
      applyBoilerLevel(button.getAttribute("data-boiler"));
    });
  }

  if (els.gasTypes) {
    els.gasTypes.addEventListener("click", function (event) {
      var button = event.target.closest("[data-gas]");
      if (!button) return;
      applyGasType(button.getAttribute("data-gas"));
    });
  }

  if (els.bottles) {
    els.bottles.addEventListener("click", function (event) {
      var button = event.target.closest("[data-bottle]");
      if (!button) return;
      applyBottle(button.getAttribute("data-bottle"));
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
