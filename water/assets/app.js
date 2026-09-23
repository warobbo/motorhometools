(function () {
  "use strict";

  var calc = window.WaterCalc;
  var defaults = window.WaterDefaults;
  var storage = window.WaterStorage;

  var profile = storage.loadProfile();
  var lastSaved = "";

  var els = {
    breakdownList: document.getElementById("breakdown-list"),
    totalTrip: document.getElementById("total-trip"),
    totalDaily: document.getElementById("total-daily"),
    greyTrip: document.getElementById("grey-trip"),
    greyDaily: document.getElementById("grey-daily"),
    greyNote: document.getElementById("grey-note"),
    weightNote: document.getElementById("weight-note"),
    tankNote: document.getElementById("tank-note"),
    saveState: document.getElementById("save-state"),
    presets: document.getElementById("presets"),
    printSheet: document.getElementById("print-sheet"),
    form: document.getElementById("usage-form"),
    laundryFields: document.getElementById("laundry-fields"),
    cassetteFields: document.getElementById("cassette-fields"),
    showerStyles: document.getElementById("shower-styles"),
  };

  var FIELD_IDS = [
    "adults",
    "children",
    "tripDays",
    "showersPerPersonPerDay",
    "showerMinutes",
    "showerLitres",
    "washUpLitresPerDay",
    "laundryEnabled",
    "laundryLitresPerLoad",
    "laundryLoadsPerTrip",
    "drinkCookLitresPerPersonPerDay",
    "cassetteEnabled",
    "cassetteFlushesPerPersonPerDay",
    "cassetteLitresPerFlush",
    "freshTankLitres",
  ];

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

  function clearActivePreset() {
    if (!profile.waterUsage.activePreset) return;
    profile.waterUsage.activePreset = "";
    syncPresetSelection();
  }

  function syncPresetSelection() {
    if (!els.presets) return;
    var active = profile.waterUsage.activePreset || "";
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
    el.value = value;
  }

  function syncForm() {
    var usage = profile.waterUsage;
    FIELD_IDS.forEach(function (id) {
      setFieldValue(id, usage[id]);
    });
    if (els.laundryFields) {
      els.laundryFields.hidden = !usage.laundryEnabled;
    }
    if (els.cassetteFields) {
      els.cassetteFields.hidden = !usage.cassetteEnabled;
    }
    syncShowerStyles();
  }

  function syncShowerStyles() {
    if (!els.showerStyles) return;
    var active = profile.waterUsage.showerStyle || "";
    els.showerStyles.querySelectorAll("[data-shower]").forEach(function (button) {
      var selected = button.getAttribute("data-shower") === active;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function renderTotals() {
    var result = calc.calcWater(profile.waterUsage);
    els.totalTrip.textContent = formatLitres(result.freshTrip);
    els.totalDaily.textContent = formatLitres(result.freshDaily);
    els.greyTrip.textContent = formatLitres(result.greyTrip);
    els.greyDaily.textContent = formatLitres(result.greyDaily);

    els.greyNote.textContent =
      "Grey water is roughly the shower, washing up and laundry. Drinking stays in people, and cassette flushes go in the toilet cassette — not the grey tank.";

    els.weightNote.textContent =
      "About " +
      formatLitres(result.tripWeightKg) +
      " kg if you carry the whole trip’s fresh water (1 litre = 1 kg).";

    if (result.hasTank) {
      var tankText =
        "A full " +
        formatLitres(result.usage.freshTankLitres) +
        " L tank is about " +
        formatLitres(result.tankWeightKg) +
        " kg.";
      if (result.daysUntilEmpty > 0) {
        tankText +=
          " At this rate it lasts about " +
          formatDays(result.daysUntilEmpty) +
          " days before you need a top-up.";
      }
      els.tankNote.hidden = false;
      els.tankNote.textContent = tankText;
    } else {
      els.tankNote.hidden = true;
      els.tankNote.textContent = "";
    }

    var ranked = result.items
      .filter(function (item) {
        return item.litresPerDay > 0;
      })
      .sort(function (a, b) {
        return b.litresPerDay - a.litresPerDay;
      });

    if (!ranked.length) {
      els.breakdownList.innerHTML =
        '<li class="breakdown-empty">Nothing using water yet. Add people or habits above.</li>';
      return;
    }

    els.breakdownList.innerHTML = ranked
      .map(function (item) {
        var pct = result.freshDaily > 0 ? (item.litresPerDay / result.freshDaily) * 100 : 0;
        return (
          '<li class="breakdown-row">' +
          '<div class="breakdown-meta">' +
          "<span>" +
          escapeHtml(item.name) +
          "</span>" +
          "<strong>" +
          formatLitres(item.litresTrip) +
          " L trip · " +
          formatLitres(item.litresPerDay) +
          " L/day</strong>" +
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
    syncForm();
    renderTotals();
    syncPresetSelection();
  }

  function updateFromForm() {
    var usage = profile.waterUsage;
    usage.adults = document.getElementById("adults").value;
    usage.children = document.getElementById("children").value;
    usage.tripDays = document.getElementById("tripDays").value;
    usage.showersPerPersonPerDay = document.getElementById("showersPerPersonPerDay").value;
    usage.showerMinutes = document.getElementById("showerMinutes").value;
    usage.showerLitres = document.getElementById("showerLitres").value;
    usage.washUpLitresPerDay = document.getElementById("washUpLitresPerDay").value;
    usage.laundryEnabled = document.getElementById("laundryEnabled").checked;
    usage.laundryLitresPerLoad = document.getElementById("laundryLitresPerLoad").value;
    usage.laundryLoadsPerTrip = document.getElementById("laundryLoadsPerTrip").value;
    usage.drinkCookLitresPerPersonPerDay = document.getElementById(
      "drinkCookLitresPerPersonPerDay"
    ).value;
    usage.cassetteEnabled = document.getElementById("cassetteEnabled").checked;
    usage.cassetteFlushesPerPersonPerDay = document.getElementById(
      "cassetteFlushesPerPersonPerDay"
    ).value;
    usage.cassetteLitresPerFlush = document.getElementById("cassetteLitresPerFlush").value;
    usage.freshTankLitres = document.getElementById("freshTankLitres").value;
    profile.waterUsage = calc.normaliseUsage(usage);
    profile.waterUsage.activePreset = "";
  }

  function onFormInput(event) {
    var target = event.target;
    var field = target.id;
    if (!field) return;

    if (field === "showerMinutes") {
      profile.waterUsage.showerMinutes = target.value;
      profile.waterUsage.showerLitres = calc.litresFromMinutes(target.value);
      profile.waterUsage.showerStyle = calc.matchShowerStyle(
        profile.waterUsage.showerLitres,
        calc.clamp(calc.toNumber(target.value, 0), 0, calc.MAX_SHOWER_MINUTES)
      );
      profile.waterUsage = calc.normaliseUsage(profile.waterUsage);
      profile.waterUsage.activePreset = "";
      setFieldValue("showerLitres", profile.waterUsage.showerLitres);
      persist();
      renderTotals();
      syncShowerStyles();
      return;
    }

    if (field === "showerLitres") {
      profile.waterUsage.showerLitres = target.value;
      profile.waterUsage.showerStyle = "custom";
      profile.waterUsage = calc.normaliseUsage(profile.waterUsage);
      profile.waterUsage.activePreset = "";
      persist();
      renderTotals();
      syncShowerStyles();
      return;
    }

    updateFromForm();
    persist();
    render();
  }

  function applyPreset(presetId) {
    profile = storage.applyPreset(profile, presetId);
    persist();
    render();
  }

  function applyShowerStyle(styleId) {
    var style = calc.SHOWER_STYLES[styleId];
    if (!style) return;
    profile.waterUsage.showerStyle = style.id;
    profile.waterUsage.showerMinutes = style.minutes;
    profile.waterUsage.showerLitres = style.litres;
    profile.waterUsage = calc.normaliseUsage(profile.waterUsage);
    profile.waterUsage.activePreset = "";
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

  if (els.showerStyles) {
    els.showerStyles.addEventListener("click", function (event) {
      var button = event.target.closest("[data-shower]");
      if (!button) return;
      applyShowerStyle(button.getAttribute("data-shower"));
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
