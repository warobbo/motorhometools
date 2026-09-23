/**
 * Shared page chrome and number-field helpers.
 * Tank litre inputs (and any similar size field) must not be
 * clamped or rewritten on every keystroke — partial values like
 * "2" (for 20) or "1" (for 100) are valid while the field is focused.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WaterUI = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function isPartialNumberInput(value) {
    var text = value == null ? "" : String(value).trim();
    return (
      text === "" ||
      text === "-" ||
      text === "+" ||
      text === "." ||
      text === "-." ||
      text === "+."
    );
  }

  function parseLiveNumber(raw, committed) {
    if (isPartialNumberInput(raw)) return committed;
    var n = typeof raw === "number" ? raw : parseFloat(raw);
    return Number.isFinite(n) ? n : committed;
  }

  function isEditingField(el) {
    return !!(el && document.activeElement === el);
  }

  /**
   * Let the user type freely in the given number fields. Call onLive
   * on each keystroke (do not write the field back). Call onCommit
   * on blur so the page can sanitise and show the cleaned value.
   */
  function bindCommitOnBlurNumbers(form, fieldIds, handlers) {
    var idSet = {};
    var hooks = handlers || {};
    (fieldIds || []).forEach(function (id) {
      idSet[id] = true;
    });

    function isBound(el) {
      return !!(el && idSet[el.id]);
    }

    if (form) {
      form.addEventListener("input", function (event) {
        if (!isBound(event.target)) return;
        if (hooks.onLive) hooks.onLive(event.target);
      });
      form.addEventListener("focusout", function (event) {
        if (!isBound(event.target)) return;
        if (hooks.onCommit) hooks.onCommit(event.target);
      });
    }

    return {
      isBound: isBound,
      isEditing: function (el) {
        return isBound(el) && isEditingField(el);
      },
    };
  }

  function setupRotateGate() {
    var gate = document.getElementById("rotate-gate");
    if (!gate) return;

    var lockTargets = document.querySelectorAll(
      ".skip-link, .site-header, .site-main, .site-footer"
    );
    var wasLocked = false;

    function isLocked() {
      return window.getComputedStyle(gate).display !== "none";
    }

    function sync() {
      var locked = isLocked();
      gate.setAttribute("aria-hidden", locked ? "false" : "true");
      lockTargets.forEach(function (el) {
        el.inert = locked;
      });
      if (locked && !wasLocked) {
        var title = document.getElementById("rotate-gate-title");
        if (title) title.focus();
      }
      wasLocked = locked;
    }

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    if (window.matchMedia) {
      var query = window.matchMedia(
        "(orientation: landscape) and (max-height: 540px) and (max-width: 1000px)"
      );
      if (query.addEventListener) {
        query.addEventListener("change", sync);
      } else if (query.addListener) {
        query.addListener(sync);
      }
    }
    sync();
  }

  return {
    isPartialNumberInput: isPartialNumberInput,
    parseLiveNumber: parseLiveNumber,
    isEditingField: isEditingField,
    bindCommitOnBlurNumbers: bindCommitOnBlurNumbers,
    setupRotateGate: setupRotateGate,
  };
});
