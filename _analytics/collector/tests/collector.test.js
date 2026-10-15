import assert from "node:assert/strict";
import test from "node:test";

import {
  handleRequest,
  retentionBoundary,
  runRetention,
  validateCampaignPayload,
  validatePayload
} from "../src/index.js";

const origin = "https://carlocaprini.github.io";

function validPayload(overrides = {}) {
  return {
    version: 1,
    event_name: "note_open",
    source_type: "home",
    source_id: "/",
    target_type: "note",
    target_id: "/thinking/waiting-as-product-decision/",
    link_context: "home_start_here",
    ...overrides
  };
}

function validCampaignPayload(overrides = {}) {
  return {
    version: 1,
    event_name: "campaign_landing",
    landing_type: "note",
    landing_id: "/thinking/friday-connects-the-services-without-owning-their-work/",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "building_my_ai_operating_system",
    utm_content: "episode_05_single_image",
    ...overrides
  };
}

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    this.database.calls.push({ sql: this.sql, values: this.values });
    if (this.database.failure) throw new Error("D1 unavailable");
    return { success: true };
  }
}

class FakeDatabase {
  constructor() {
    this.calls = [];
    this.failure = false;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

function request(payload = validPayload(), options = {}) {
  return new Request("https://measure.example/v1/measure", {
    method: options.method || "POST",
    headers: {
      Origin: options.origin || origin,
      "Content-Type": options.contentType || "application/json",
      ...(options.headers || {})
    },
    body: options.method === "OPTIONS" ? undefined : (options.body ?? JSON.stringify(payload))
  });
}

test("accepts an allowlisted event and increments one aggregate row", async () => {
  const DB = new FakeDatabase();
  const result = await handleRequest(
    request(),
    { DB, ALLOWED_ORIGIN: origin },
    new Date("2026-08-10T12:00:00Z")
  );

  assert.equal(result.status, 204);
  assert.equal(result.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal(DB.calls.length, 1);
  assert.match(DB.calls[0].sql, /ON CONFLICT/);
  assert.deepEqual(DB.calls[0].values, [
    "2026-08-10",
    "note_open",
    "home",
    "/",
    "note",
    "/thinking/waiting-as-product-decision/",
    "home_start_here"
  ]);
});

test("records valid events from representative browser User-Agents", async (t) => {
  const userAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0"
  ];

  for (const userAgent of userAgents) {
    await t.test(userAgent, async () => {
      const DB = new FakeDatabase();
      const result = await handleRequest(
        request(validPayload(), { headers: { "User-Agent": userAgent } }),
        { DB, ALLOWED_ORIGIN: origin }
      );

      assert.equal(result.status, 204);
      assert.equal(DB.calls.length, 1);
    });
  }
});

test("accepts social profile intent without treating it as contact", async () => {
  const DB = new FakeDatabase();
  const result = await handleRequest(
    request(validPayload({
      event_name: "social_profile_open",
      source_type: "note",
      source_id: "/thinking/waiting-as-product-decision/",
      target_type: "social_profile",
      target_id: "linkedin",
      link_context: "article_signature"
    })),
    { DB, ALLOWED_ORIGIN: origin },
    new Date("2026-08-26T12:00:00Z")
  );

  assert.equal(result.status, 204);
  assert.deepEqual(DB.calls[0].values, [
    "2026-08-26",
    "social_profile_open",
    "note",
    "/thinking/waiting-as-product-decision/",
    "social_profile",
    "linkedin",
    "article_signature"
  ]);
});

test("discards unknown payload fields before storage", () => {
  const result = validatePayload(validPayload({
    timestamp: "2026-08-10T12:00:00Z",
    user_id: "not-allowed"
  }));

  assert.deepEqual(Object.keys(result), [
    "version",
    "event_name",
    "source_type",
    "source_id",
    "target_type",
    "target_id",
    "link_context"
  ]);
});

test("accepts a complete canonical UTM landing and increments only its aggregate row", async () => {
  const DB = new FakeDatabase();
  const result = await handleRequest(
    request(validCampaignPayload()),
    { DB, ALLOWED_ORIGIN: origin },
    new Date("2026-08-11T08:00:00Z")
  );

  assert.equal(result.status, 204);
  assert.equal(DB.calls.length, 1);
  assert.match(DB.calls[0].sql, /daily_campaign_counts/);
  assert.deepEqual(DB.calls[0].values, [
    "2026-08-11",
    "note",
    "/thinking/friday-connects-the-services-without-owning-their-work/",
    "linkedin",
    "social",
    "building_my_ai_operating_system",
    "episode_05_single_image"
  ]);
});

test("accepts the Premium button with all four canonical dimensions", async () => {
  const DB = new FakeDatabase();
  const payload = validCampaignPayload({ utm_medium: "profile", utm_campaign: "premium_subscription", utm_content: "website_button" });
  const result = await handleRequest(request(payload), { DB, ALLOWED_ORIGIN: origin }, new Date("2026-09-03T08:00:00Z"));
  assert.equal(result.status, 204);
  assert.deepEqual(DB.calls[0].values.slice(-4), ["linkedin", "profile", "premium_subscription", "website_button"]);
  assert.equal(validateCampaignPayload({ ...payload, utm_content: undefined }), null);
  assert.equal(validateCampaignPayload({ ...payload, utm_content: "" }), null);
  assert.equal(validateCampaignPayload({ ...payload, utm_content: "about" }), null);
});

test("accepts GitHub profile README attribution without broadening profile combinations", async () => {
  const DB = new FakeDatabase();
  const payload = validCampaignPayload({
    utm_source: "github",
    utm_medium: "profile",
    utm_campaign: "profile",
    utm_content: "profile_readme"
  });
  const result = await handleRequest(request(payload), { DB, ALLOWED_ORIGIN: origin }, new Date("2026-09-08T08:00:00Z"));

  assert.equal(result.status, 204);
  assert.deepEqual(DB.calls[0].values.slice(-4), ["github", "profile", "profile", "profile_readme"]);
  assert.equal(validateCampaignPayload({ ...payload, utm_content: "featured" }), null);
  assert.equal(validateCampaignPayload({ ...payload, utm_medium: "social" }), null);
});

test("accepts email-signature attribution without broadening email combinations", async () => {
  const DB = new FakeDatabase();
  const payload = validCampaignPayload({
    landing_type: "home",
    landing_id: "/",
    utm_source: "email_signature",
    utm_medium: "email",
    utm_campaign: "profile",
    utm_content: "website_link"
  });
  const result = await handleRequest(request(payload), { DB, ALLOWED_ORIGIN: origin }, new Date("2026-10-06T08:00:00Z"));

  assert.equal(result.status, 204);
  assert.deepEqual(DB.calls[0].values.slice(-4), ["email_signature", "email", "profile", "website_link"]);
  assert.equal(validateCampaignPayload({ ...payload, utm_content: "article" }), null);
  assert.equal(validateCampaignPayload({ ...payload, utm_source: "newsletter" }), null);
});

test("rejects partial, unknown and inconsistent UTM combinations", () => {
  const invalid = [
    validCampaignPayload({ utm_content: undefined }),
    validCampaignPayload({ utm_source: "google" }),
    validCampaignPayload({ utm_medium: "organic_social" }),
    validCampaignPayload({ utm_campaign: "ai_operating_system" }),
    validCampaignPayload({ utm_campaign: "profile" }),
    validCampaignPayload({ utm_source: "medium", utm_medium: "referral", utm_content: "carousel" }),
    validCampaignPayload({ utm_content: "person_123" })
  ];

  for (const payload of invalid) assert.equal(validateCampaignPayload(payload), null);
});

test("rejects invalid origins, events, identifiers and content types", async () => {
  const cases = [
    request(validPayload(), { origin: "https://example.com" }),
    request(validPayload({ event_name: "user_profile" })),
    request(validPayload({ target_id: "name@example.com" })),
    request(validPayload(), { contentType: "text/plain" })
  ];

  for (const candidate of cases) {
    const result = await handleRequest(candidate, { DB: new FakeDatabase(), ALLOWED_ORIGIN: origin });
    assert.ok([400, 403].includes(result.status));
  }
});

test("accepts only origins from an explicit local allowlist", async () => {
  const origins = "http://127.0.0.1:4000,http://localhost:4000";
  for (const allowed of origins.split(",")) {
    const result = await handleRequest(
      request(validPayload(), { origin: allowed }),
      { DB: new FakeDatabase(), ALLOWED_ORIGINS: origins }
    );
    assert.equal(result.status, 204);
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), allowed);
  }

  const denied = await handleRequest(
    request(validPayload(), { origin: "http://example.test" }),
    { DB: new FakeDatabase(), ALLOWED_ORIGINS: origins }
  );
  assert.equal(denied.status, 403);
});

test("rejects oversized bodies without touching D1", async () => {
  const DB = new FakeDatabase();
  const result = await handleRequest(
    request(null, { body: "x".repeat(2049) }),
    { DB, ALLOWED_ORIGIN: origin }
  );

  assert.equal(result.status, 413);
  assert.equal(DB.calls.length, 0);
});

test("returns a narrow CORS preflight response", async () => {
  const result = await handleRequest(
    request(null, { method: "OPTIONS" }),
    { DB: new FakeDatabase(), ALLOWED_ORIGIN: origin }
  );

  assert.equal(result.status, 204);
  assert.equal(result.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assert.equal(result.headers.get("Access-Control-Allow-Headers"), "Content-Type");
});

test("does not expose a fallback route", async () => {
  const result = await handleRequest(
    new Request("https://measure.example/", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(validPayload())
    }),
    { DB: new FakeDatabase(), ALLOWED_ORIGIN: origin }
  );

  assert.equal(result.status, 404);
  assert.equal(result.headers.get("Access-Control-Allow-Origin"), null);
});

test("drops known crawler, inspection, preview and automated traffic without storing it", async (t) => {
  const userAgents = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Google-Read-Aloud",
    "Mozilla/5.0 (compatible; Google-Site-Verification/1.0)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "LinkedInBot/1.0"
  ];

  for (const userAgent of userAgents) {
    await t.test(userAgent, async () => {
      const DB = new FakeDatabase();
      const result = await handleRequest(
        request(validPayload(), { headers: { "User-Agent": userAgent } }),
        { DB, ALLOWED_ORIGIN: origin }
      );

      assert.equal(result.status, 204);
      assert.equal(await result.text(), "");
      assert.equal(DB.calls.length, 0);
    });
  }
});

test("fails closed when D1 is unavailable", async () => {
  const DB = new FakeDatabase();
  DB.failure = true;
  const result = await handleRequest(request(), { DB, ALLOWED_ORIGIN: origin });

  assert.equal(result.status, 503);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
});

test("retention uses a calendar-month boundary and deletes only older rows", async () => {
  assert.equal(retentionBoundary(new Date("2026-08-10T12:00:00Z"), 14), "2025-06-10");
  assert.equal(retentionBoundary(new Date("2026-03-31T12:00:00Z"), 1), "2026-02-28");

  const DB = new FakeDatabase();
  await runRetention(
    { DB, RETENTION_MONTHS: "14" },
    new Date("2026-08-10T12:00:00Z")
  );

  assert.equal(DB.calls.length, 2);
  assert.match(DB.calls[0].sql, /DELETE FROM daily_counts/);
  assert.match(DB.calls[1].sql, /DELETE FROM daily_campaign_counts/);
  assert.deepEqual(DB.calls.map((call) => call.values), [["2025-06-10"], ["2025-06-10"]]);
});
