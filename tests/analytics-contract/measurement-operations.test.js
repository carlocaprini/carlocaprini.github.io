import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checklist = await readFile(
  new URL("../../_analytics/measurement/monthly-evidence-checklist.md", import.meta.url),
  "utf8"
);
const monthly = await readFile(
  new URL("../../_analytics/measurement/templates/monthly-review.md", import.meta.url),
  "utf8"
);
const quarterly = await readFile(
  new URL("../../_analytics/measurement/templates/quarterly-review.md", import.meta.url),
  "utf8"
);
const outcomes = await readFile(
  new URL("../../_analytics/measurement/templates/professional-outcomes.csv", import.meta.url),
  "utf8"
);

const stages = ["Discovery", "Arrival", "Depth", "Professional intent", "Professional outcome"];

test("monthly evidence uses one exact calendar period and the canonical aggregate report", () => {
  assert.match(checklist, /--month=YYYY-MM/);
  assert.match(checklist, /generate-report\.mjs/);
  assert.match(checklist, /exact previous calendar month/i);
  for (const source of ["LinkedIn", "Search Console", "GA4", "Aggregate D1", "Professional outcomes"]) {
    assert.match(checklist, new RegExp(source));
  }
});

test("detailed platform exports remain optional monthly diagnostics", () => {
  const [core, diagnostics = ""] = checklist.split("## 3. Collect optional diagnostic evidence");
  assert.match(core, /high-level GA4 record/i);
  assert.match(core, /when one or more publications appeared/i);
  assert.doesNotMatch(core, /ga4\/acquisition\.csv/);
  for (const exportName of [
    "ga4/acquisition.csv",
    "ga4/content.csv",
    "ga4/depth.csv",
    "ga4/professional-intent.csv",
    "ga4/audience-diagnostics.csv"
  ]) {
    assert.match(diagnostics, new RegExp(exportName.replace(/[./-]/g, "\\$&")));
  }
  assert.match(diagnostics, /specific question worth investigating/i);
});

test("monthly and quarterly reviews preserve the five measurement stages", () => {
  for (const stage of stages) {
    assert.match(monthly, new RegExp(stage, "i"));
    assert.match(quarterly, new RegExp(stage, "i"));
  }
  assert.match(quarterly, /three completed monthly packages/i);
});

test("professional outcomes stay lightweight and contain no analytics identity", () => {
  assert.equal(outcomes.trim(), [
    "conversation_date",
    "discovery_source",
    "content_mentioned",
    "problem_area",
    "engagement_type",
    "qualified",
    "outcome",
    "note"
  ].join(","));
  for (const forbidden of ["email", "user_id", "client_id", "ip_address", "session_id", "visitor_id"]) {
    assert.doesNotMatch(outcomes, new RegExp(forbidden, "i"));
  }
});
