(function () {
  "use strict";

  var body = document.body;
  if (!body) return;

  var contract = window.siteAnalyticsContract;
  if (!contract) return;
  var eventNames = new Set(contract.semanticEvents);

  function safeParameters(name, parameters) {
    var result = {};
    var allowed = contract.parameters.common.concat(contract.parameters.byEvent[name] || []);
    allowed.forEach(function (key) {
      var value = (parameters || {})[key];
      if (typeof value !== "string" && typeof value !== "number") return;
      value = String(value);
      if (key === "destination") {
        try {
          var url = new URL(value, window.location.href);
          if (!/^https?:$/.test(url.protocol) || url.username || url.password) return;
          value = (url.origin === window.location.origin ? "" : url.origin) + url.pathname;
        } catch (_error) { return; }
      }
      if (!value || value.length > 256 || !/^[a-zA-Z0-9_./:#-]+$/.test(value)) return;
      result[key] = value;
    });
    return result;
  }

  function analyticsParameters(element) {
    var parameters = {};

    Array.prototype.forEach.call(element.attributes || [], function (attribute) {
      if (attribute.name.indexOf("data-analytics-") !== 0 || attribute.name === "data-analytics-event") return;
      var name = attribute.name.replace("data-analytics-", "").replace(/-/g, "_");
      if (attribute.value !== "") parameters[name] = attribute.value;
    });

    ["page_type", "page_id", "page_topic", "page_series", "page_episode"].forEach(function (name) {
      var value = body.getAttribute("data-analytics-" + name.replace(/_/g, "-"));
      if (value && parameters[name] === undefined) parameters[name] = value;
    });

    return parameters;
  }

  function track(name, parameters) {
    if (!eventNames.has(name)) return;
    parameters = safeParameters(name, parameters);

    if (typeof window.gtag === "function") {
      window.gtag("event", name, parameters);
    }

    window.dispatchEvent(new CustomEvent("site:analytics", {
      detail: { name: name, parameters: parameters }
    }));
  }

  function trackElement(element) {
    track(element.getAttribute("data-analytics-event"), analyticsParameters(element));
  }

  document.querySelectorAll(".article-body a:not([data-analytics-event]):not(.article-figure-link)").forEach(function (link) {
    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_error) {
      return;
    }

    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return;
    var internal = url.origin === window.location.origin;
    if (internal && url.pathname === window.location.pathname) return;
    var eventName = "reading_open";
    if (internal) {
      if (["/thinking/", "/explore/", "/influences/"].includes(url.pathname)) {
        eventName = "collection_open";
        link.setAttribute("data-analytics-collection", url.pathname.split("/")[1]);
      } else if (/^\/thinking\/[^/]+\/$/.test(url.pathname)) eventName = "note_open";
      else if (/^\/series\/[^/]+\/$/.test(url.pathname)) eventName = "series_open";
      else if (/^\/explore\/[^/]+\/$/.test(url.pathname)) eventName = "question_open";
      else if (url.pathname === "/experience/") eventName = "experience_open";
      else if (url.pathname === "/work/") eventName = "work_open";
      else return;
    }

    link.setAttribute("data-analytics-event", eventName);
    link.setAttribute("data-analytics-link-context", "note_body");
    link.setAttribute("data-analytics-destination", (internal ? "" : url.origin) + url.pathname);
  });

  document.addEventListener("click", function (event) {
    var element = event.target.closest("[data-analytics-event]");
    if (element) trackElement(element);
  });

  if (body.getAttribute("data-analytics-content") === "true") {
    track("content_view", analyticsParameters(body));
  }

  window.addEventListener("site:analytics-ready", function () {
    if (body.getAttribute("data-analytics-content") === "true" && typeof window.gtag === "function") {
      window.gtag("event", "content_view", safeParameters("content_view", analyticsParameters(body)));
    }
  });

  window.siteAnalytics = Object.freeze({ track: track });
})();
