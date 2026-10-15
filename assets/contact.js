"use strict";

(function () {
  var form = document.getElementById("contact-form");
  var nameInput = document.getElementById("contact-name");
  var emailInput = document.getElementById("contact-email");
  var messageInput = document.getElementById("contact-message");
  var honeypot = document.getElementById("contact-website");
  var statusEl = document.getElementById("contact-status");
  var submitBtn = document.getElementById("contact-submit");

  if (!form || !messageInput || !statusEl) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    if (kind) statusEl.setAttribute("data-kind", kind);
    else statusEl.removeAttribute("data-kind");
  }

  function honeypotText() {
    if (!honeypot || honeypot.value == null) return "";
    return String(honeypot.value).replace(/\s+/g, " ").trim();
  }

  function fieldText(input) {
    if (!input || input.value == null) return "";
    return String(input.value).replace(/\s+/g, " ").trim();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (honeypotText()) {
      setStatus("We’ve got your message. Motorhome Tools will read it. A reply is not automatic.", "ok");
      return;
    }

    var message = fieldText(messageInput);
    if (!message) {
      setStatus("Write a message so we know what you need.", "warn");
      messageInput.focus();
      return;
    }
    if (message.length > 2000) {
      setStatus("That message is too long.", "warn");
      messageInput.focus();
      return;
    }

    var name = fieldText(nameInput);
    if (name.length > 80) {
      setStatus("That name is too long.", "warn");
      if (nameInput) nameInput.focus();
      return;
    }

    var email = fieldText(emailInput);
    if (email && (email.length > 200 || !EMAIL_RE.test(email))) {
      setStatus("That email does not look usable. Leave it blank, or type the address again.", "warn");
      if (emailInput) emailInput.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending";
    }
    setStatus("Sending your message.", "note");

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        message: message,
        href: window.location.href,
        website: ""
      })
    }).then(function (res) {
      return res.json().then(function (json) {
        return { ok: res.ok, status: res.status, json: json || {} };
      }).catch(function () {
        return { ok: res.ok, status: res.status, json: {} };
      });
    }).then(function (result) {
      if (result.ok && result.json && (result.json.saved || result.json.ignored)) {
        setStatus(result.json.message || "We’ve got your message. Motorhome Tools will read it. A reply is not automatic.", "ok");
        form.reset();
        return;
      }
      var fallback = result.status === 429
        ? "Please wait before sending another message."
        : "That message did not reach us. Please try again in a moment.";
      setStatus((result.json && result.json.message) || fallback, "warn");
    }).catch(function () {
      setStatus("That message did not reach us. Please try again in a moment.", "warn");
    }).then(function () {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send message";
      }
    });
  });
})();
