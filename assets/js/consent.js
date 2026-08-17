(function () {
  "use strict";

  var storageKey = "site_analytics_consent";
  var body = document.body;
  var panel = document.getElementById("analytics-consent");
  var settingsButton = document.querySelector("[data-consent-settings]");
  var analyticsLoaded = false;
  var preferenceLifetime = 180 * 24 * 60 * 60 * 1000;

  if (!body || !panel) return;

  function readPreference() {
    try {
      var stored = window.localStorage.getItem(storageKey);
      if (!stored) return null;
      var preference = JSON.parse(stored);
      if (!preference || (preference.value !== "granted" && preference.value !== "denied")) return null;
      if (!preference.updatedAt || Date.now() - preference.updatedAt > preferenceLifetime) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return preference.value;
    } catch (_error) {
      return null;
    }
  }

  function savePreference(value) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        value: value,
        updatedAt: Date.now()
      }));
    } catch (_error) {
      // A blocked storage API must not prevent the privacy-safe default.
    }
  }

  function showPanel(shouldFocus) {
    panel.hidden = false;
    var firstChoice = panel.querySelector("[data-consent-choice]");
    if (shouldFocus && firstChoice) firstChoice.focus({ preventScroll: true });
  }

  function hidePanel() {
    panel.hidden = true;
  }

  function deleteAnalyticsCookies() {
    document.cookie.split(";").forEach(function (entry) {
      var name = entry.split("=")[0].trim();
      if (name !== "_ga" && name.indexOf("_ga_") !== 0) return;

      ["", ";domain=" + location.hostname, ";domain=." + location.hostname].forEach(function (domain) {
        document.cookie = name + "=;Max-Age=0;path=/" + domain + ";SameSite=Lax;Secure";
      });
    });
  }

  function loadAnalytics() {
    var analyticsId = body.getAttribute("data-analytics-id");
    var analyticsHostname = body.getAttribute("data-analytics-hostname");
    var analyticsEnabled = body.getAttribute("data-analytics-enabled") === "true";
    var publicProductionHost = window.location.protocol === "https:" &&
      analyticsHostname &&
      window.location.hostname === analyticsHostname;
    if (!publicProductionHost || !analyticsEnabled || !analyticsId || analyticsLoaded) return;

    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", analyticsId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 34128000,
      cookie_update: false
    });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(analyticsId);
    document.head.appendChild(script);
    window.dispatchEvent(new CustomEvent("site:analytics-ready"));
  }

  function grant() {
    savePreference("granted");
    hidePanel();
    window.dispatchEvent(new CustomEvent("site:consent-choice", {
      detail: { value: "granted" }
    }));
    loadAnalytics();
  }

  function deny() {
    var wasLoaded = analyticsLoaded;
    savePreference("denied");
    window.dispatchEvent(new CustomEvent("site:consent-choice", {
      detail: { value: "denied" }
    }));
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
    deleteAnalyticsCookies();
    hidePanel();
    if (wasLoaded) window.location.reload();
  }

  panel.querySelectorAll("[data-consent-choice]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.getAttribute("data-consent-choice") === "granted") grant();
      else deny();
    });
  });

  if (settingsButton) settingsButton.addEventListener("click", function () {
    showPanel(true);
  });

  var preference = readPreference();
  if (preference === "granted") loadAnalytics();
  else if (preference === null) showPanel(false);

  window.siteConsent = Object.freeze({
    deny: deny,
    grant: grant,
    open: function () { showPanel(true); },
    status: readPreference
  });
})();
