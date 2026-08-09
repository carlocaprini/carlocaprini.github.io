(function () {
  "use strict";

  var body = document.body;
  if (!body) return;

  var eventNames = new Set([
    "content_view",
    "note_open",
    "question_open",
    "series_open",
    "series_episode_open",
    "topic_select",
    "reading_open",
    "experience_open",
    "contact_open",
    "series_visual_open",
    "rss_open"
  ]);

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

  document.querySelectorAll(".article-body a:not([data-analytics-event])").forEach(function (link) {
    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_error) {
      return;
    }

    var eventName = "reading_open";
    if (url.origin === window.location.origin && url.pathname.indexOf("/thinking/") === 0) eventName = "note_open";
    if (url.origin === window.location.origin && url.pathname.indexOf("/series/") === 0) eventName = "series_open";
    if (url.origin === window.location.origin && url.pathname.indexOf("/explore/") === 0) eventName = "question_open";
    if (url.origin === window.location.origin && url.pathname === "/experience/") eventName = "experience_open";

    link.setAttribute("data-analytics-event", eventName);
    link.setAttribute("data-analytics-link-context", "note_body");
    link.setAttribute("data-analytics-destination", url.pathname + url.hash);
  });

  document.addEventListener("click", function (event) {
    var element = event.target.closest("[data-analytics-event]");
    if (element) trackElement(element);
  });

  if (body.getAttribute("data-analytics-content") === "true") {
    track("content_view", analyticsParameters(body));
  }

  window.siteAnalytics = Object.freeze({ track: track });
})();
