(function () {
  "use strict";

  var body = document.body;
  if (!body) return;

  var semanticEvents = new Set([
    "collection_open",
    "note_open",
    "question_open",
    "series_open",
    "series_episode_open",
    "topic_select",
    "reading_open",
    "experience_open",
    "contact_section_open",
    "contact_open",
    "series_visual_open",
    "rss_open"
  ]);

  var campaignSources = new Set(["linkedin", "medium", "newsletter", "manual", "qr"]);
  var campaignMediums = new Set(["social", "comment", "profile", "referral", "email", "direct", "offline"]);
  var editorialCampaigns = new Set([
    "thinking",
    "building_my_ai_operating_system",
    "experience",
    "explore"
  ]);
  var campaignNames = new Set(Array.from(editorialCampaigns).concat(["profile", "monthly_updates"]));
  var fixedCampaignContent = new Set(["comment", "featured", "about", "article", "shared_link", "qr"]);
  var publicationContentPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*_(?:text_post|single_image|carousel)$/;

  function localPreview() {
    var hostname = window.location.hostname;
    return window.location.protocol === "file:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost");
  }

  function localCollector(value) {
    try {
      var url = new URL(value);
      return url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") &&
        url.pathname === "/v1/measure";
    } catch (_error) {
      return false;
    }
  }

  function cleanIdentifier(value, maximum) {
    if (value === undefined || value === null) return "";
    var result = String(value).trim();
    if (!result || result.length > maximum || !/^[a-zA-Z0-9_./:#-]+$/.test(result)) return "";
    return result;
  }

  function cleanType(value) {
    var result = cleanIdentifier(value, 32);
    return /^[a-z][a-z0-9_]{0,31}$/.test(result) ? result : "";
  }

  function cleanContext(value, fallback) {
    var result = cleanIdentifier(value || fallback, 64);
    return /^[a-z][a-z0-9_/-]{0,63}$/.test(result) ? result : fallback;
  }

  function source(parameters) {
    return {
      type: cleanType(parameters.page_type || body.getAttribute("data-analytics-page-type")) || "page",
      id: cleanIdentifier(parameters.page_id || body.getAttribute("data-analytics-page-id"), 160) || "/"
    };
  }

  function targetFor(name, parameters, eventSource) {
    var series = cleanIdentifier(parameters.series_id || parameters.page_series, 120);
    var episode = cleanIdentifier(parameters.episode_number || parameters.page_episode, 24);

    switch (name) {
      case "content_view":
        return { type: eventSource.type, id: eventSource.id };
      case "collection_open":
        return { type: "collection", id: cleanIdentifier(parameters.collection, 160) };
      case "note_open":
        return { type: "note", id: cleanIdentifier(parameters.note_id || parameters.destination, 160) };
      case "question_open":
        return { type: "question", id: cleanIdentifier(parameters.question_id || parameters.destination, 160) };
      case "series_open":
        return { type: "series", id: series || cleanIdentifier(parameters.destination, 160) };
      case "series_episode_open":
        return {
          type: "series_episode",
          id: series && episode ? series + ":" + episode : cleanIdentifier(parameters.note_id || parameters.destination, 160)
        };
      case "topic_select":
        return { type: "topic", id: cleanIdentifier(parameters.topic, 160) };
      case "reading_open":
        return { type: "reading", id: cleanIdentifier(parameters.reading_id || parameters.destination, 160) };
      case "experience_open":
        return { type: "experience", id: "experience" };
      case "contact_section_open":
        return { type: "contact", id: "section" };
      case "contact_open":
        return { type: "contact", id: cleanIdentifier(parameters.contact_method, 160) };
      case "series_visual_open":
        return {
          type: "visual",
          id: cleanIdentifier([series, parameters.service, episode].filter(Boolean).join(":"), 160)
        };
      case "rss_open":
        return { type: "rss", id: "feed" };
      default:
        return null;
    }
  }

  function buildEvent(name, parameters) {
    parameters = parameters || {};
    var eventSource = source(parameters);
    var target = targetFor(name, parameters, eventSource);
    if (!target || !target.type || !target.id) return null;

    return {
      version: 1,
      event_name: name,
      source_type: eventSource.type,
      source_id: eventSource.id,
      target_type: target.type,
      target_id: target.id,
      link_context: cleanContext(parameters.link_context, name === "content_view" ? "content_load" : "unspecified")
    };
  }

  function buildPageView() {
    var eventSource = source({});
    return {
      version: 1,
      event_name: "page_view",
      source_type: eventSource.type,
      source_id: eventSource.id,
      target_type: eventSource.type,
      target_id: eventSource.id,
      link_context: "page_load"
    };
  }

  function buildConsentChoice(value) {
    if (value !== "granted" && value !== "denied") return null;
    return {
      version: 1,
      event_name: "consent_choice",
      source_type: "site",
      source_id: "/",
      target_type: "consent",
      target_id: value,
      link_context: "consent_panel"
    };
  }

  function validCampaignCombination(source, medium, campaign, content) {
    if (!campaignSources.has(source) || !campaignMediums.has(medium) || !campaignNames.has(campaign)) {
      return false;
    }

    if (source === "linkedin" && medium === "social") {
      return editorialCampaigns.has(campaign) && publicationContentPattern.test(content);
    }
    if (source === "linkedin" && medium === "comment") {
      return editorialCampaigns.has(campaign) && content === "comment";
    }
    if (source === "linkedin" && medium === "profile") {
      return campaign === "profile" && (content === "featured" || content === "about");
    }
    if (source === "medium" && medium === "referral") {
      return editorialCampaigns.has(campaign) && content === "article";
    }
    if (source === "newsletter" && medium === "email") {
      return campaign === "monthly_updates" && content === "article";
    }
    if (source === "manual" && medium === "direct") {
      return editorialCampaigns.has(campaign) && content === "shared_link";
    }
    if (source === "qr" && medium === "offline") {
      return editorialCampaigns.has(campaign) && content === "qr";
    }
    return false;
  }

  function buildCampaignLanding(search) {
    var parameters = new URLSearchParams(search === undefined ? window.location.search : search);
    var names = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];

    if (names.some(function (name) { return parameters.getAll(name).length !== 1; })) return null;

    var sourceValue = parameters.get("utm_source") || "";
    var mediumValue = parameters.get("utm_medium") || "";
    var campaignValue = parameters.get("utm_campaign") || "";
    var contentValue = parameters.get("utm_content") || "";

    if (!fixedCampaignContent.has(contentValue) && !publicationContentPattern.test(contentValue)) return null;
    if (!validCampaignCombination(sourceValue, mediumValue, campaignValue, contentValue)) return null;

    var eventSource = source({});
    return {
      version: 1,
      event_name: "campaign_landing",
      landing_type: eventSource.type,
      landing_id: eventSource.id,
      utm_source: sourceValue,
      utm_medium: mediumValue,
      utm_campaign: campaignValue,
      utm_content: contentValue
    };
  }

  var endpoint = body.getAttribute("data-aggregate-analytics-endpoint") || "";
  var local = localPreview();
  var localEnabled = body.getAttribute("data-aggregate-analytics-local") === "true";
  var endpointAllowed = local
    ? localEnabled && localCollector(endpoint)
    : /^https:\/\//.test(endpoint);
  var enabled = body.getAttribute("data-aggregate-analytics-enabled") === "true" && endpointAllowed;

  function send(payload) {
    if (!enabled || !payload) return;

    window.fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(function () {
      // Aggregate measurement must never affect navigation or create retries.
    });
  }

  window.addEventListener("site:analytics", function (event) {
    if (!event.detail || !semanticEvents.has(event.detail.name)) return;
    send(buildEvent(event.detail.name, event.detail.parameters));
  });

  window.addEventListener("site:consent-choice", function (event) {
    send(buildConsentChoice(event.detail && event.detail.value));
  });

  if (enabled) {
    send(buildPageView());
    send(buildCampaignLanding());
    if (body.getAttribute("data-analytics-content") === "true") {
      send(buildEvent("content_view", {}));
    }
  }

  window.siteAggregateAnalytics = Object.freeze({
    buildConsentChoice: buildConsentChoice,
    buildEvent: buildEvent,
    buildPageView: buildPageView,
    buildCampaignLanding: buildCampaignLanding,
    enabled: enabled
  });
})();
