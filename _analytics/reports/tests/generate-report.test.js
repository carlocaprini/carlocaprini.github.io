import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCsvExports,
  buildDailyTrend,
  formatCsv,
  measurementRange,
  parseOptions,
  renderMarkdown
} from "../generate-report.mjs";

const emptySections = {
  eventTotals: [],
  pageViews: [],
  paths: [],
  targets: [],
  consent: [],
  campaigns: []
};

test("requested window and available measurement range remain distinct", () => {
  const dailyTrend = buildDailyTrend([
    { day: "2026-08-17", event_name: "page_view", total: 3 },
    { day: "2026-08-24", event_name: "page_view", total: 4 }
  ]);
  const markdown = renderMarkdown({
    requestedPeriod: "Last 30 days",
    generatedAt: "2026-08-24T12:00:00.000Z",
    environment: "Production",
    dailyTrend,
    ...emptySections
  });

  assert.match(markdown, /\*\*Requested period:\*\* Last 30 days/);
  assert.match(markdown, /\*\*Data available:\*\* 17 Aug 2026 → 24 Aug 2026/);
  assert.match(markdown, /\*\*Measurement span:\*\* 8 calendar days/);
  assert.match(markdown, /\*\*Days with recorded activity:\*\* 2/);
  assert.deepEqual(measurementRange(dailyTrend), {
    earliest: "2026-08-17",
    latest: "2026-08-24",
    calendarDays: 8,
    recordedDays: 2
  });
});

test("daily trend uses the existing interaction exclusions", () => {
  const dailyTrend = buildDailyTrend([
    { day: "2026-08-18", event_name: "note_open", total: 2 },
    { day: "2026-08-17", event_name: "content_view", total: 3 },
    { day: "2026-08-17", event_name: "page_view", total: 4 },
    { day: "2026-08-17", event_name: "consent_choice", total: 5 },
    { day: "2026-08-17", event_name: "question_open", total: 1 },
    { day: "2026-08-18", event_name: "page_view", total: 6 }
  ]);

  assert.deepEqual(dailyTrend, [
    { day: "2026-08-17", page_views: 4, content_views: 3, interactions: 1 },
    { day: "2026-08-18", page_views: 6, content_views: 0, interactions: 2 }
  ]);
});

test("path dimensions remain independent in Markdown", () => {
  const markdown = renderMarkdown({
    requestedPeriod: "Last 30 days",
    generatedAt: "2026-08-24T12:00:00.000Z",
    environment: "Production",
    dailyTrend: [{ day: "2026-08-24", page_views: 1, content_views: 0, interactions: 1 }],
    ...emptySections,
    paths: [{
      source_type: "home",
      source_id: "/",
      target_type: "question",
      target_id: "ai-and-work",
      link_context: "home_questions",
      total: 2
    }]
  });

  assert.match(markdown, /\| Source type \| Source ID \| Target type \| Target ID \| Context \| Count \|/);
  assert.match(markdown, /\| home \| \/ \| question \| ai-and-work \| home_questions \| 2 \|/);
  assert.doesNotMatch(markdown, /home:\//);
  for (const heading of [
    "## Daily trend",
    "## Event totals",
    "## Most viewed pages",
    "## Most used paths",
    "## Most opened targets",
    "## Explicit consent choices",
    "## Campaign landings"
  ]) assert.match(markdown, new RegExp(heading));
});

test("daily CSV has deterministic headers and values", () => {
  const dailyTrend = [
    { day: "2026-08-17", page_views: 3, content_views: 2, interactions: 0 },
    { day: "2026-08-18", page_views: 4, content_views: 3, interactions: 1 }
  ];
  const exports = buildCsvExports({ dailyTrend, ...emptySections });
  const daily = exports.find((csv) => csv.name === "daily-trend");
  const csv = formatCsv(daily.headers, daily.rows);

  assert.ok(daily);
  assert.deepEqual(exports.map((item) => item.name), [
    "daily-trend",
    "event-totals",
    "page-views",
    "paths",
    "targets",
    "consent-choices",
    "campaign-landings"
  ]);
  assert.equal(csv, [
    "day,page_views,content_views,interactions",
    "2026-08-17,3,2,0",
    "2026-08-18,4,3,1",
    ""
  ].join("\n"));
});

test("empty reporting periods remain explicit and valid", () => {
  const markdown = renderMarkdown({
    requestedPeriod: "Last 30 days",
    generatedAt: "2026-08-24T12:00:00.000Z",
    environment: "Local integration",
    dailyTrend: [],
    ...emptySections
  });

  assert.match(markdown, /\*\*Data available:\*\* No aggregate data in this period\./);
  assert.match(markdown, /## Daily trend\n\n_No aggregate data in this period\._/);
});

test("since-start is explicit and cannot be combined with days", () => {
  assert.deepEqual(parseOptions(["--local", "--since-start"]), {
    local: true,
    sinceStart: true,
    days: 30,
    csvDirectory: null
  });
  assert.throws(
    () => parseOptions(["--since-start", "--days=30"]),
    /Use either --since-start or --days=N/
  );
  assert.equal(parseOptions([]).days, 30);
});
