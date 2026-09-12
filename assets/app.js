"use strict";

(function () {
  var router = window.MotorhomeToolsRouter;
  if (!router) return;

  var STORAGE_KEY = "motorhometools.unansweredAsks";
  var ASK_ENDPOINT = "/api/ask";
  var MAX_STORED = 40;

  var form = document.getElementById("ask-form");
  var questionInput = document.getElementById("ask-question");
  var emailInput = document.getElementById("ask-email");
  var honeypot = document.getElementById("ask-website");
  var statusEl = document.getElementById("ask-status");
  var submitBtn = document.getElementById("ask-submit");

  if (!form || !questionInput || !statusEl) return;

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.dataset.kind = kind || "note";
  }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function storeAsk(record) {
    try {
      var list = readStore();
      list.push(record);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_STORED)));
      return true;
    } catch (err) {
      return false;
    }
  }

  function postAsk(record) {
    return fetch(ASK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    }).then(function (res) {
      return res.ok;
    }).catch(function () {
      return false;
    });
  }

  function buildRecord(question, email) {
    return {
      question: question,
      email: email || null,
      at: new Date().toISOString(),
      href: window.location.href,
      source: "motorhometools-ask"
    };
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (honeypot && honeypot.value) {
      setStatus("We’ve noted your question.", "ok");
      return;
    }

    var question = String(questionInput.value || "").trim();
    if (!question) {
      setStatus("Type a few words so we can open the right page.", "warn");
      questionInput.focus();
      return;
    }

    var match = router.routeAsk(question);
    if (match) {
      setStatus("Opening " + match.label + " — we don’t invent numbers; that page will ask for yours.", "ok");
      window.setTimeout(function () {
        window.open(match.href, "_blank", "noopener,noreferrer");
      }, 280);
      return;
    }

    var email = emailInput && String(emailInput.value || "").trim();
    var record = buildRecord(question, email);
    storeAsk(record);

    if (submitBtn) submitBtn.disabled = true;
    setStatus("We’ve noted your question.", "ok");

    postAsk(record).finally(function () {
      if (submitBtn) submitBtn.disabled = false;
    });
  });
})();
