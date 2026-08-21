import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  ANALYTICS_CONTRACT,
  EVENT_NAMES,
  SOURCE_TYPES,
  TARGET_TYPES,
  validCampaignCombination as workerValidCampaignCombination
} from "../../_analytics/collector/src/analytics-contract.generated.js";

const canonical = JSON.parse(await readFile(new URL("../../contracts/analytics.json", import.meta.url), "utf8"));
const browserSource = await readFile(new URL("../../assets/js/analytics-contract.generated.js", import.meta.url), "utf8");
const browserRuntime = { window: {} };
vm.runInNewContext(browserSource, browserRuntime);
const browser = browserRuntime.window.siteAnalyticsContract;

test("generated browser and Worker contracts match the canonical declaration", () => {
  assert.deepEqual(ANALYTICS_CONTRACT, canonical);
  assert.deepEqual(Array.from(browser.semanticEvents), canonical.events.semantic);
  assert.deepEqual(Array.from(browser.aggregateForwardedEvents), canonical.events.aggregateForwarded);
  assert.deepEqual(Array.from(browser.aggregateOnlyEvents), canonical.events.aggregateOnly);
  assert.deepEqual(Array.from(browser.sourceTypes), canonical.sourceTypes);
  assert.deepEqual(Array.from(browser.targetTypes), canonical.targetTypes);
});

test("every browser aggregate event is accepted by the collector contract", () => {
  for (const event of canonical.events.aggregateForwarded) assert.equal(EVENT_NAMES.has(event), true, event);
  for (const event of canonical.events.aggregateOnly) assert.equal(EVENT_NAMES.has(event), true, event);
  assert.equal(EVENT_NAMES.has("content_view"), true);
});

test("source and target types share the canonical runtime vocabulary", () => {
  assert.deepEqual(Array.from(SOURCE_TYPES), canonical.sourceTypes);
  assert.deepEqual(Array.from(TARGET_TYPES), canonical.targetTypes);
  for (const sourceType of SOURCE_TYPES) assert.equal(TARGET_TYPES.has(sourceType), true, sourceType);
});

const validCampaigns = [
  ["linkedin", "social", "thinking", "waiting_as_product_decision_text_post"],
  ["linkedin", "comment", "explore", "comment"],
  ["linkedin", "profile", "profile", "featured"],
  ["linkedin", "profile", "profile", "about"],
  ["medium", "referral", "experience", "article"],
  ["newsletter", "email", "monthly_updates", "article"],
  ["manual", "direct", "building_my_ai_operating_system", "shared_link"],
  ["qr", "offline", "explore", "qr"]
];

test("browser and Worker accept every representative canonical campaign tuple", () => {
  for (const tuple of validCampaigns) {
    assert.equal(browser.validCampaignCombination(...tuple), true, tuple.join("/"));
    assert.equal(workerValidCampaignCombination(...tuple), true, tuple.join("/"));
  }
});

const invalidCampaigns = [
  ["linkedin", "social", "profile", "featured"],
  ["linkedin", "social", "thinking", "article"],
  ["medium", "social", "thinking", "article"],
  ["newsletter", "email", "thinking", "article"],
  ["manual", "direct", "thinking", "person_123"],
  ["qr", "offline", "monthly_updates", "qr"],
  ["google", "social", "thinking", "note_single_image"]
];

test("browser and Worker reject the same non-canonical campaign tuples", () => {
  for (const tuple of invalidCampaigns) {
    assert.equal(browser.validCampaignCombination(...tuple), false, tuple.join("/"));
    assert.equal(workerValidCampaignCombination(...tuple), false, tuple.join("/"));
  }
});

test("generated outputs identify their canonical source", async () => {
  const workerSource = await readFile(new URL("../../_analytics/collector/src/analytics-contract.generated.js", import.meta.url), "utf8");
  for (const source of [browserSource, workerSource]) {
    assert.match(source, /^\/\* GENERATED from contracts\/analytics\.json/);
    assert.match(source, /Do not edit/);
  }
});
