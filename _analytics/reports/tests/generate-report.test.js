import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCsvExports,
  buildDailyTrend,
  dateFilterFor,
  formatCsv,
  measurementRange,
  parseOptions,
  periodForMonth,
  periodForRange,
  requestedPeriodFor,
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
    exactPeriod: null,
    csvDirectory: null
  });
  assert.throws(
    () => parseOptions(["--since-start", "--days=30"]),
    /Use either --since-start or --days=N/
  );
  assert.equal(parseOptions([]).days, 30);
});

test("month periods cover the complete calendar month including leap years", () => {
  assert.deepEqual(periodForMonth("2026-08"), {
    from: "2026-08-01",
    to: "2026-08-31"
  });
  assert.deepEqual(periodForMonth("2024-02"), {
    from: "2024-02-01",
    to: "2024-02-29"
  });
  assert.deepEqual(periodForMonth("2026-02"), {
    from: "2026-02-01",
    to: "2026-02-28"
  });
});

test("explicit date ranges are inclusive and reject invalid order or dates", () => {
  assert.deepEqual(periodForRange("2026-08-01", "2026-08-31"), {
    from: "2026-08-01",
    to: "2026-08-31"
  });
  assert.throws(() => periodForRange("2026-08-31", "2026-08-01"), /must not be after/);
  assert.throws(() => periodForRange("2026-02-29", "2026-03-01"), /Invalid --from date/);
  assert.throws(() => periodForMonth("2026-13"), /Invalid --month value/);
});

test("exact-period options are complete and mutually exclusive", () => {
  const month = parseOptions(["--local", "--month=2026-08", "--csv-dir=tmp/export"]);
  assert.deepEqual(month.exactPeriod, { from: "2026-08-01", to: "2026-08-31" });
  assert.equal(dateFilterFor(month), "day >= '2026-08-01' AND day <= '2026-08-31'");
  assert.equal(requestedPeriodFor(month), "2026-08-01 → 2026-08-31 (inclusive)");

  assert.throws(() => parseOptions(["--from=2026-08-01"]), /Use --from=.*and --to=/);
  assert.throws(() => parseOptions(["--to=2026-08-31"]), /Use --from=.*and --to=/);
  assert.throws(
    () => parseOptions(["--month=2026-08", "--days=30"]),
    /Exact periods .* cannot be combined/
  );
  assert.throws(
    () => parseOptions(["--month=2026-08", "--since-start"]),
    /Exact periods .* cannot be combined/
  );
  assert.throws(
    () => parseOptions(["--month=2026-08", "--from=2026-08-01", "--to=2026-08-31"]),
    /Use either --month=.*or --from\/--to/
  );
});
