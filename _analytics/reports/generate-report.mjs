#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;
const INTERACTION_EXCLUSIONS = new Set(["page_view", "content_view", "consent_choice"]);
const collectorDirectory = resolve(import.meta.dirname, "../collector");
const localDatabase = "carlo-site-aggregate-analytics-local";

export function parseOptions(args) {
  const local = args.includes("--local");
  const sinceStart = args.includes("--since-start");
  const daysArgument = args.find((value) => value.startsWith("--days="));
  const csvArgument = args.find((value) => value.startsWith("--csv-dir="));

  if (sinceStart && daysArgument) {
    throw new Error("Use either --since-start or --days=N, not both.");
  }

  const requestedDays = Number.parseInt(daysArgument?.split("=")[1] || String(DEFAULT_DAYS), 10);
  const days = Number.isInteger(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), MAX_DAYS)
    : DEFAULT_DAYS;

  return {
    local,
    sinceStart,
    days,
    csvDirectory: csvArgument ? resolve(csvArgument.split("=")[1]) : null
  };
}

export function buildDailyTrend(rows) {
  const days = new Map();

  for (const row of rows) {
    const current = days.get(row.day) || {
      day: row.day,
      page_views: 0,
      content_views: 0,
      interactions: 0
    };
    const total = Number(row.total || 0);

    if (row.event_name === "page_view") current.page_views += total;
    if (row.event_name === "content_view") current.content_views += total;
    if (!INTERACTION_EXCLUSIONS.has(row.event_name)) current.interactions += total;
    days.set(row.day, current);
  }

  return [...days.values()].sort((left, right) => left.day.localeCompare(right.day));
}

export function measurementRange(dailyTrend) {
  if (dailyTrend.length === 0) return null;

  const earliest = dailyTrend[0].day;
  const latest = dailyTrend[dailyTrend.length - 1].day;
  const start = Date.parse(`${earliest}T00:00:00Z`);
  const end = Date.parse(`${latest}T00:00:00Z`);

  return {
    earliest,
    latest,
    calendarDays: Math.floor((end - start) / 86_400_000) + 1,
    recordedDays: dailyTrend.length
  };
}

function displayDate(day) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${day}T00:00:00Z`));
}

function number(value) {
  return new Intl.NumberFormat("en-GB").format(Number(value || 0));
}

function table(headers, rows) {
  if (rows.length === 0) return "_No aggregate data in this period._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

export function renderMarkdown({
  requestedPeriod,
  generatedAt,
  environment,
  dailyTrend,
  eventTotals,
  pageViews,
  paths,
  targets,
  consent,
  campaigns
}) {
  const range = measurementRange(dailyTrend);
  const availability = range
    ? `**Data available:** ${displayDate(range.earliest)} → ${displayDate(range.latest)}  \n**Measurement span:** ${range.calendarDays} calendar ${range.calendarDays === 1 ? "day" : "days"}  \n**Days with recorded activity:** ${range.recordedDays}`
    : "**Data available:** No aggregate data in this period.";

  return `# Aggregate site measurement

**Requested period:** ${requestedPeriod}

${availability}

**Generated:** ${generatedAt}

**Environment:** ${environment}

## Daily trend

${table(
  ["Day", "Page views", "Content views", "Interactions"],
  dailyTrend.map((row) => [
    row.day,
    number(row.page_views),
    number(row.content_views),
    number(row.interactions)
  ])
)}

## Event totals

${table(["Event", "Count"], eventTotals.map((row) => [row.event_name, number(row.total)]))}

## Most viewed pages

${table(["Type", "Page", "Views"], pageViews.map((row) => [row.target_type, row.target_id, number(row.total)]))}

## Most used paths

${table(
  ["Source type", "Source ID", "Target type", "Target ID", "Context", "Count"],
  paths.map((row) => [
    row.source_type,
    row.source_id,
    row.target_type,
    row.target_id,
    row.link_context,
    number(row.total)
  ])
)}

## Most opened targets

${table(["Type", "Target", "Count"], targets.map((row) => [row.target_type, row.target_id, number(row.total)]))}

## Explicit consent choices

${table(["Choice", "Count"], consent.map((row) => [row.choice, number(row.total)]))}

## Campaign landings

${table(
  ["Landing", "Source / medium", "Campaign", "Content", "Count"],
  campaigns.map((row) => [
    `${row.landing_type}:${row.landing_id}`,
    `${row.utm_source} / ${row.utm_medium}`,
    row.utm_campaign,
    row.utm_content,
    number(row.total)
  ])
)}

The daily trend includes only calendar days with recorded aggregate activity. Interactions exclude \`page_view\`, \`content_view\` and \`consent_choice\`, consistently with path and target reporting.

The consent table measures explicit choices only. It is not the percentage of every visitor shown the panel.
`;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatCsv(headers, rows) {
  return `${[headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`;
}

export function buildCsvExports({ dailyTrend, eventTotals, pageViews, paths, targets, consent, campaigns }) {
  return [
    {
      name: "daily-trend",
      headers: ["day", "page_views", "content_views", "interactions"],
      rows: dailyTrend.map((row) => [row.day, row.page_views, row.content_views, row.interactions])
    },
    {
      name: "event-totals",
      headers: ["event_name", "event_count"],
      rows: eventTotals.map((row) => [row.event_name, row.total])
    },
    {
      name: "page-views",
      headers: ["target_type", "target_id", "event_count"],
      rows: pageViews.map((row) => [row.target_type, row.target_id, row.total])
    },
    {
      name: "paths",
      headers: ["source_type", "source_id", "target_type", "target_id", "link_context", "event_count"],
      rows: paths.map((row) => [row.source_type, row.source_id, row.target_type, row.target_id, row.link_context, row.total])
    },
    {
      name: "targets",
      headers: ["target_type", "target_id", "event_count"],
      rows: targets.map((row) => [row.target_type, row.target_id, row.total])
    },
    {
      name: "consent-choices",
      headers: ["choice", "event_count"],
      rows: consent.map((row) => [row.choice, row.total])
    },
    {
      name: "campaign-landings",
      headers: ["landing_type", "landing_id", "utm_source", "utm_medium", "utm_campaign", "utm_content", "event_count"],
      rows: campaigns.map((row) => [row.landing_type, row.landing_id, row.utm_source, row.utm_medium, row.utm_campaign, row.utm_content, row.total])
    }
  ];
}

async function writeCsv(csvDirectory, name, headers, rows) {
  if (!csvDirectory) return;
  await mkdir(csvDirectory, { recursive: true });
  await writeFile(resolve(csvDirectory, `${name}.csv`), formatCsv(headers, rows), "utf8");
}

function queryLocal(sql) {
  const result = spawnSync("wrangler", [
    "d1",
    "execute",
    localDatabase,
    "--local",
    "--config",
    "wrangler.local.jsonc",
    "--persist-to",
    ".wrangler/state",
    "--command",
    sql,
    "--json"
  ], {
    cwd: collectorDirectory,
    encoding: "utf8",
    env: { ...process.env, NO_D1_WARNING: "true" }
  });

  if (result.status !== 0) {
    throw new Error(`Local D1 query failed:\n${result.stdout}\n${result.stderr}`);
  }

  const payload = JSON.parse(result.stdout);
  return payload[0]?.results || [];
}

async function remoteQuery({ accountId, databaseId, apiToken }, sql) {
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) throw new Error(`Cloudflare D1 query failed with ${response.status}`);
  const payload = await response.json();
  if (!payload.success) throw new Error("Cloudflare D1 query was not successful");
  return payload.result?.[0]?.results || [];
}

export async function main(args = process.argv.slice(2), environment = process.env) {
  const options = parseOptions(args);
  const requiredEnvironment = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_D1_DATABASE_ID",
    "CLOUDFLARE_API_TOKEN"
  ];

  for (const name of requiredEnvironment) {
    if (!options.local && !environment[name]) throw new Error(`Missing required environment variable: ${name}`);
  }

  const query = options.local
    ? queryLocal
    : (sql) => remoteQuery({
        accountId: environment.CLOUDFLARE_ACCOUNT_ID,
        databaseId: environment.CLOUDFLARE_D1_DATABASE_ID,
        apiToken: environment.CLOUDFLARE_API_TOKEN
      }, sql);
  const dateFilter = options.sinceStart ? "1 = 1" : `day >= date('now', '-${options.days - 1} days')`;

  const [dailyRows, eventTotals, pageViews, paths, targets, consent, campaigns] = await Promise.all([
    query(`
      SELECT day, event_name, SUM(event_count) AS total
      FROM daily_counts
      WHERE ${dateFilter}
      GROUP BY day, event_name
      ORDER BY day, event_name
    `),
    query(`
      SELECT event_name, SUM(event_count) AS total
      FROM daily_counts
      WHERE ${dateFilter}
      GROUP BY event_name
      ORDER BY total DESC, event_name
    `),
    query(`
      SELECT target_type, target_id, SUM(event_count) AS total
      FROM daily_counts
      WHERE ${dateFilter} AND event_name = 'page_view'
      GROUP BY target_type, target_id
      ORDER BY total DESC, target_type, target_id
      LIMIT 25
    `),
    query(`
      SELECT source_type, source_id, target_type, target_id, link_context,
             SUM(event_count) AS total
      FROM daily_counts
      WHERE ${dateFilter} AND event_name NOT IN ('page_view', 'content_view', 'consent_choice')
      GROUP BY source_type, source_id, target_type, target_id, link_context
      ORDER BY total DESC, source_type, source_id
      LIMIT 30
    `),
    query(`
      SELECT target_type, target_id, SUM(event_count) AS total
      FROM daily_counts
      WHERE ${dateFilter} AND event_name NOT IN ('page_view', 'content_view', 'consent_choice')
      GROUP BY target_type, target_id
      ORDER BY total DESC, target_type, target_id
      LIMIT 25
    `),
    query(`
      SELECT target_id AS choice, SUM(event_count) AS total
      FROM daily_counts
      WHERE ${dateFilter} AND event_name = 'consent_choice'
      GROUP BY target_id
      ORDER BY target_id
    `),
    query(`
      SELECT landing_type, landing_id, utm_source, utm_medium, utm_campaign, utm_content,
             SUM(event_count) AS total
      FROM daily_campaign_counts
      WHERE ${dateFilter}
      GROUP BY landing_type, landing_id, utm_source, utm_medium, utm_campaign, utm_content
      ORDER BY total DESC, utm_campaign, utm_content, landing_id
      LIMIT 50
    `)
  ]);

  const dailyTrend = buildDailyTrend(dailyRows);
  const markdown = renderMarkdown({
    requestedPeriod: options.sinceStart ? "Since measurement started" : `Last ${options.days} days`,
    generatedAt: new Date().toISOString(),
    environment: options.local ? "Local integration" : "Production",
    dailyTrend,
    eventTotals,
    pageViews,
    paths,
    targets,
    consent,
    campaigns
  });

  const exports = buildCsvExports({ dailyTrend, eventTotals, pageViews, paths, targets, consent, campaigns });
  await Promise.all(exports.map((csv) => writeCsv(
    options.csvDirectory,
    csv.name,
    csv.headers,
    csv.rows
  )));

  process.stdout.write(markdown);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
