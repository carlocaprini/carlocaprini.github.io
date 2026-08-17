const CONTRACT_VERSION = 1;
const MAX_BODY_BYTES = 2048;
const MEASURE_PATH = "/v1/measure";
const DEFAULT_ORIGIN = "https://carlocaprini.github.io";
const DEFAULT_RETENTION_MONTHS = 14;

const EVENT_NAMES = new Set([
  "page_view",
  "content_view",
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
  "rss_open",
  "consent_choice",
  "campaign_landing"
]);

const SOURCE_TYPES = new Set([
  "home",
  "thinking",
  "explore",
  "experience",
  "influences",
  "note",
  "question",
  "series",
  "page",
  "site"
]);

const TARGET_TYPES = new Set([
  ...SOURCE_TYPES,
  "collection",
  "series_episode",
  "topic",
  "reading",
  "contact",
  "visual",
  "rss",
  "consent"
]);

const BOT_PATTERN = /(?:bot|crawler|spider|slurp|headlesschrome|lighthouse|pagespeed|facebookexternalhit|linkedinbot)/i;
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_./:#-]+$/;
const TYPE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const CONTEXT_PATTERN = /^[a-z][a-z0-9_/-]{0,63}$/;
const UTM_VALUE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const PUBLICATION_CONTENT_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*_(?:text_post|single_image|carousel)$/;

const CAMPAIGN_SOURCES = new Set(["linkedin", "medium", "newsletter", "manual", "qr"]);
const CAMPAIGN_MEDIUMS = new Set(["social", "comment", "profile", "referral", "email", "direct", "offline"]);
const EDITORIAL_CAMPAIGNS = new Set([
  "thinking",
  "building_my_ai_operating_system",
  "experience",
  "explore"
]);
const CAMPAIGN_NAMES = new Set([...EDITORIAL_CAMPAIGNS, "profile", "monthly_updates"]);
const FIXED_CAMPAIGN_CONTENT = new Set(["comment", "featured", "about", "article", "shared_link", "qr"]);

const UPSERT_SQL = `
  INSERT INTO daily_counts (
    day,
    event_name,
    source_type,
    source_id,
    target_type,
    target_id,
    link_context,
    event_count
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT (
    day,
    event_name,
    source_type,
    source_id,
    target_type,
    target_id,
    link_context
  ) DO UPDATE SET event_count = event_count + 1
`;

const CAMPAIGN_UPSERT_SQL = `
  INSERT INTO daily_campaign_counts (
    day,
    landing_type,
    landing_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    event_count
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT (
    day,
    landing_type,
    landing_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content
  ) DO UPDATE SET event_count = event_count + 1
`;

function response(status, origin, body = null) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  if (body !== null) headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(body, { status, headers });
}

function preflight(origin) {
  const result = response(204, origin);
  result.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  result.headers.set("Access-Control-Allow-Headers", "Content-Type");
  result.headers.set("Access-Control-Max-Age", "86400");
  return result;
}

function validString(value, maximum, pattern) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && pattern.test(value);
}

export function validatePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (input.version !== CONTRACT_VERSION || !EVENT_NAMES.has(input.event_name)) return null;

  if (input.event_name === "campaign_landing") return validateCampaignPayload(input);

  if (!validString(input.source_type, 32, TYPE_PATTERN) || !SOURCE_TYPES.has(input.source_type)) return null;
  if (!validString(input.source_id, 160, IDENTIFIER_PATTERN)) return null;
  if (!validString(input.target_type, 32, TYPE_PATTERN) || !TARGET_TYPES.has(input.target_type)) return null;
  if (!validString(input.target_id, 160, IDENTIFIER_PATTERN)) return null;
  if (!validString(input.link_context, 64, CONTEXT_PATTERN)) return null;

  return {
    version: CONTRACT_VERSION,
    event_name: input.event_name,
    source_type: input.source_type,
    source_id: input.source_id,
    target_type: input.target_type,
    target_id: input.target_id,
    link_context: input.link_context
  };
}

function validCampaignCombination(source, medium, campaign, content) {
  if (!CAMPAIGN_SOURCES.has(source) || !CAMPAIGN_MEDIUMS.has(medium) || !CAMPAIGN_NAMES.has(campaign)) {
    return false;
  }

  if (source === "linkedin" && medium === "social") {
    return EDITORIAL_CAMPAIGNS.has(campaign) && PUBLICATION_CONTENT_PATTERN.test(content);
  }
  if (source === "linkedin" && medium === "comment") {
    return EDITORIAL_CAMPAIGNS.has(campaign) && content === "comment";
  }
  if (source === "linkedin" && medium === "profile") {
    return campaign === "profile" && (content === "featured" || content === "about");
  }
  if (source === "medium" && medium === "referral") {
    return EDITORIAL_CAMPAIGNS.has(campaign) && content === "article";
  }
  if (source === "newsletter" && medium === "email") {
    return campaign === "monthly_updates" && content === "article";
  }
  if (source === "manual" && medium === "direct") {
    return EDITORIAL_CAMPAIGNS.has(campaign) && content === "shared_link";
  }
  if (source === "qr" && medium === "offline") {
    return EDITORIAL_CAMPAIGNS.has(campaign) && content === "qr";
  }
  return false;
}

export function validateCampaignPayload(input) {
  if (!validString(input.landing_type, 32, TYPE_PATTERN) || !SOURCE_TYPES.has(input.landing_type)) return null;
  if (!validString(input.landing_id, 160, IDENTIFIER_PATTERN)) return null;

  const values = [input.utm_source, input.utm_medium, input.utm_campaign, input.utm_content];
  if (!values.every((value) => validString(value, 96, UTM_VALUE_PATTERN))) return null;
  if (!validCampaignCombination(...values)) return null;

  return {
    version: CONTRACT_VERSION,
    event_name: "campaign_landing",
    landing_type: input.landing_type,
    landing_id: input.landing_id,
    utm_source: input.utm_source,
    utm_medium: input.utm_medium,
    utm_campaign: input.utm_campaign,
    utm_content: input.utm_content
  };
}

export function retentionBoundary(now, months = DEFAULT_RETENTION_MONTHS) {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export async function handleRequest(request, env, now = new Date()) {
  if (new URL(request.url).pathname !== MEASURE_PATH) return response(404, null, "Not found");

  const allowedOrigins = new Set(
    String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || DEFAULT_ORIGIN)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const origin = request.headers.get("Origin");

  if (!origin || !allowedOrigins.has(origin)) return response(403, null, "Forbidden");
  if (request.method === "OPTIONS") return preflight(origin);
  if (request.method !== "POST") return response(405, origin, "Method not allowed");

  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return response(400, origin, "Invalid request");

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return response(413, origin, "Payload too large");

  if (BOT_PATTERN.test(request.headers.get("User-Agent") || "")) return response(204, origin);

  let text;
  try {
    text = await request.text();
  } catch (_error) {
    return response(400, origin, "Invalid request");
  }

  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return response(413, origin, "Payload too large");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    return response(400, origin, "Invalid request");
  }

  const event = validatePayload(parsed);
  if (!event) return response(400, origin, "Invalid request");
  if (!env.DB || typeof env.DB.prepare !== "function") return response(503, origin, "Unavailable");

  const day = new Date(now).toISOString().slice(0, 10);

  try {
    if (event.event_name === "campaign_landing") {
      await env.DB.prepare(CAMPAIGN_UPSERT_SQL).bind(
        day,
        event.landing_type,
        event.landing_id,
        event.utm_source,
        event.utm_medium,
        event.utm_campaign,
        event.utm_content
      ).run();
    } else {
      await env.DB.prepare(UPSERT_SQL).bind(
        day,
        event.event_name,
        event.source_type,
        event.source_id,
        event.target_type,
        event.target_id,
        event.link_context
      ).run();
    }
  } catch (_error) {
    return response(503, origin, "Unavailable");
  }

  return response(204, origin);
}

export async function runRetention(env, now = new Date()) {
  if (!env.DB || typeof env.DB.prepare !== "function") throw new Error("Missing D1 binding");
  const configuredMonths = Number.parseInt(env.RETENTION_MONTHS || "", 10);
  const months = Number.isInteger(configuredMonths) && configuredMonths > 0
    ? configuredMonths
    : DEFAULT_RETENTION_MONTHS;

  const boundary = retentionBoundary(now, months);
  return Promise.all([
    env.DB.prepare("DELETE FROM daily_counts WHERE day < ?").bind(boundary).run(),
    env.DB.prepare("DELETE FROM daily_campaign_counts WHERE day < ?").bind(boundary).run()
  ]);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },

  scheduled(_controller, env, context) {
    context.waitUntil(runRetention(env));
  }
};
