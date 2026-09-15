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

  function setStatus(message, kind, extraLink) {
    statusEl.textContent = message;
    statusEl.dataset.kind = kind || "note";
    statusEl.setAttribute("aria-live", kind === "ok" ? "assertive" : "polite");
    if (extraLink && extraLink.href && extraLink.label) {
      statusEl.appendChild(document.createTextNode(" "));
      var link = document.createElement("a");
      link.href = extraLink.href;
      link.textContent = extraLink.label;
      statusEl.appendChild(link);
    }
    if (message && statusEl.scrollIntoView) {
      statusEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
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

  function mailtoFallback(record, to) {
    if (!to || !record || !record.question) return "";
    var body = [
      "Unmatched Ask from motorhometools.co.uk.",
      "Do not invent a tyre pressure, weight or legal answer.",
      "",
      "Question: " + record.question,
      "Visitor email: " + (record.email || "(not given)")
    ].join("\n");
    return "mailto:" + to +
      "?subject=" + encodeURIComponent("Ask: " + record.question.slice(0, 80)) +
      "&body=" + encodeURIComponent(body);
  }

  function fetchMailto() {
    return fetch(ASK_ENDPOINT, { method: "GET", headers: { "Accept": "application/json" } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) { return json && json.mailto ? json.mailto : ""; })
      .catch(function () { return ""; });
  }

  function postAsk(record) {
    return fetch(ASK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    }).then(function (res) {
      return res.json().then(function (json) {
        return { ok: res.ok, status: res.status, json: json || {} };
      }).catch(function () {
        return { ok: res.ok, status: res.status, json: {} };
      });
    }).catch(function () {
      return { ok: false, status: 0, json: {} };
    });
  }

  function buildRecord(question, email) {
    return {
      question: question,
      email: email || null,
      at: new Date().toISOString(),
      href: window.location.href,
      source: "motorhometools-ask",
      website: honeypot && honeypot.value ? honeypot.value : ""
    };
  }

  function flashSubmitLabel(label) {
    if (!submitBtn) return;
    submitBtn.textContent = label;
    window.setTimeout(function () {
      if (submitBtn.textContent === label) submitBtn.textContent = "Find it";
    }, 2800);
  }

  function showSaved(email) {
    flashSubmitLabel("Sent");
    if (email) {
      setStatus("Noted — we’ve passed this to the site owner, with the email you left. Replies are not automated.", "ok");
      return;
    }
    setStatus("Noted — we’ve passed this to the site owner. Replies are not automated.", "ok");
  }

  function showFallback(record) {
    var phoneNote = storeAsk(record)
      ? "Saved on this phone. The note did not reach the site owner this time — we are not promising a reply."
      : "The note did not reach the site owner this time — we are not promising a reply.";
    fetchMailto().then(function (to) {
      var href = mailtoFallback(record, to);
      setStatus(phoneNote, "warn", href ? { href: href, label: "Email this instead" } : null);
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (submitBtn) submitBtn.textContent = "Find it";

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

    if (submitBtn) submitBtn.disabled = true;
    setStatus("Passing your question to the site owner…", "note");

    postAsk(record).then(function (result) {
      if (result && result.json && result.json.ok && result.json.saved) {
        storeAsk(record);
        showSaved(email);
        return;
      }
      if (result && result.json && result.json.ok && result.json.ignored) {
        setStatus("We’ve noted your question.", "ok");
        return;
      }
      showFallback(record);
    }).finally(function () {
      if (submitBtn) submitBtn.disabled = false;
    });
  });
})();
