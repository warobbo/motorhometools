"use strict";

(function () {
  var router = window.MotorhomeToolsRouter;
  var copilot = window.MotorhomeToolsCopilot;
  if (!router) return;

  var STORAGE_KEY = "motorhometools.unansweredAsks";
  var ASK_ENDPOINT = "/api/ask";
  var MAX_STORED = 40;

  var form = document.getElementById("ask-form");
  var questionInput = document.getElementById("ask-question");
  var emailInput = document.getElementById("ask-email");
  var honeypot = document.getElementById("ask-website");
  var statusEl = document.getElementById("ask-status");
  var answerEl = document.getElementById("ask-answer");
  var submitBtn = document.getElementById("ask-submit");

  if (!form || !questionInput || !statusEl) return;

  function clearAnswer() {
    if (!answerEl) return;
    answerEl.hidden = true;
    answerEl.textContent = "";
    answerEl.removeAttribute("data-kind");
  }

  function addList(title, items) {
    if (!items || !items.length) return;
    var heading = document.createElement("h3");
    heading.textContent = title;
    answerEl.appendChild(heading);
    var list = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    answerEl.appendChild(list);
  }

  function visualKind(result) {
    if (result.kind === "answer") return "ok";
    if (result.kind === "clarify" || result.kind === "later") return "note";
    return "warn";
  }

  function statusCopy(result) {
    if (result.domain === "tyres") return "Tyres is on hold — no invented pressure.";
    if (result.kind === "answer" && result.domain === "gas") {
      return "Rough gas estimate. Open Gas to fine-tune with your figures.";
    }
    if (result.kind === "answer" && result.domain === "cassette") {
      return "Rough cassette estimate. Open Cassette to fine-tune with your figures.";
    }
    if (result.kind === "answer" && result.domain === "power") {
      return "Rough power estimate. Open Power to fine-tune with your figures.";
    }
    if (result.kind === "answer") return "Rough payload estimate. Open Payload to fine-tune with your figures.";
    if (result.kind === "clarify") return "One quick check, then I can calculate.";
    if (result.kind === "later") return "Ask can’t calculate that yet. Open the calculator to enter your figures.";
    if (result.kind === "refuse") return "Need a plated or remaining-payload figure — I don’t invent those.";
    return "Need a figure we don’t have a standard for. Open Payload to enter yours.";
  }

  function showCopilot(result) {
    var kind = visualKind(result);
    setStatus(statusCopy(result), kind);
    if (!answerEl) return;
    answerEl.hidden = false;
    answerEl.dataset.kind = kind;
    answerEl.textContent = "";

    var lead = document.createElement("p");
    lead.className = "ask-answer-lead";
    lead.textContent = result.answer || "";
    answerEl.appendChild(lead);

    if (result.items && result.items.length) {
      addList("What’s included", result.items.map(function (item) {
        return item.label + " — " + item.kg + " kg";
      }));
    }
    addList("Assumptions", result.assumptions);
    if (result.followUps && result.followUps.length) {
      result.followUps.forEach(function (line) {
        var note = document.createElement("p");
        note.className = "ask-follow-up";
        note.textContent = line;
        answerEl.appendChild(note);
      });
    }
    if (result.gaps && result.gaps.length) {
      addList("Still needed", result.gaps);
    }

    if (result.href && result.hrefLabel) {
      var cta = document.createElement("p");
      cta.className = "ask-cta";
      var link = document.createElement("a");
      link.className = "ask-cta-link";
      // Copilot href already includes calculator prefill (?bikes=, gas, cassette).
      // Do not replace this with the bare hub URL.
      link.href = result.href;
      // Payload and Tyres stay on motorhomepayload.co.uk (new tab).
      // Power and Water are same-origin /power and /water paths.
      if (/^https?:\/\//i.test(result.href)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      link.textContent = result.hrefLabel;
      cta.appendChild(link);
      answerEl.appendChild(cta);
      if (result.ctaNote) {
        var hint = document.createElement("p");
        hint.className = "ask-cta-note";
        hint.textContent = result.ctaNote;
        answerEl.appendChild(hint);
      }
    }
    if (answerEl.scrollIntoView) {
      answerEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

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
      clearAnswer();
      setStatus("We’ve noted your question.", "ok");
      return;
    }

    var question = String(questionInput.value || "").trim();
    if (!question) {
      clearAnswer();
      setStatus("Type a few words so we can open the right page.", "warn");
      questionInput.focus();
      return;
    }

    if (copilot && typeof copilot.resolveAsk === "function") {
      var decision = copilot.resolveAsk(question, { routeAsk: router.routeAsk });
      if (decision && decision.view && decision.view.handled) {
        showCopilot(decision.view);
        return;
      }
    } else if (copilot) {
      var copilotResult = copilot.publicResult(copilot.handleAsk(question));
      if (copilotResult && copilotResult.handled) {
        showCopilot(copilotResult);
        return;
      }
    }

    var match = router.routeAsk(question);
    if (match) {
      if (copilot && typeof copilot.laterGuide === "function") {
        showCopilot(copilot.publicResult(Object.assign(copilot.laterGuide(match.id), {
          href: match.href,
          hrefLabel: "Open " + match.label + " to enter your figures"
        })));
        return;
      }
      setStatus(
        "The " + match.label + " calculator is the right place — we don’t invent numbers in Ask.",
        "note",
        { href: match.href, label: "Open " + match.label }
      );
      return;
    }

    clearAnswer();

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
