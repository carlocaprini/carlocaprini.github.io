#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const local = process.argv.includes("--local");
const requiredEnvironment = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLOUDFLARE_API_TOKEN"
];

for (const name of requiredEnvironment) {
  if (!local && !process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
const collectorDirectory = resolve(import.meta.dirname, "../collector");
const localDatabase = "carlo-site-aggregate-analytics-local";
const daysArgument = process.argv.find((value) => value.startsWith("--days="));
const csvArgument = process.argv.find((value) => value.startsWith("--csv-dir="));
const requestedDays = Number.parseInt(daysArgument?.split("=")[1] || "30", 10);
const days = Number.isInteger(requestedDays)
  ? Math.min(Math.max(requestedDays, 1), 366)
  : 30;
const csvDirectory = csvArgument ? resolve(csvArgument.split("=")[1]) : null;

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

async function query(sql) {
  if (local) return queryLocal(sql);

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

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeCsv(name, headers, rows) {
  if (!csvDirectory) return;
  await mkdir(csvDirectory, { recursive: true });
  const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(","));
  await writeFile(resolve(csvDirectory, `${name}.csv`), `${lines.join("\n")}\n`, "utf8");
}

const dateFilter = `day >= date('now', '-${days - 1} days')`;

const [eventTotals, pageViews, paths, targets, consent, campaigns] = await Promise.all([
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

const generatedAt = new Date().toISOString();
const markdown = `# Aggregate site measurement

**Period:** Last ${days} days  
**Generated:** ${generatedAt}  
**Environment:** ${local ? "Local integration" : "Production"}

## Event totals

${table(["Event", "Count"], eventTotals.map((row) => [row.event_name, number(row.total)]))}

## Most viewed pages

${table(["Type", "Page", "Views"], pageViews.map((row) => [row.target_type, row.target_id, number(row.total)]))}

## Most used paths

${table(
  ["Source", "Target", "Context", "Count"],
  paths.map((row) => [
    `${row.source_type}:${row.source_id}`,
    `${row.target_type}:${row.target_id}`,
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

The consent table measures explicit choices only. It is not the percentage of every visitor shown the panel.
`;

await Promise.all([
  writeCsv("event-totals", ["event_name", "event_count"], eventTotals.map((row) => [row.event_name, row.total])),
  writeCsv("page-views", ["target_type", "target_id", "event_count"], pageViews.map((row) => [row.target_type, row.target_id, row.total])),
  writeCsv(
    "paths",
    ["source_type", "source_id", "target_type", "target_id", "link_context", "event_count"],
    paths.map((row) => [row.source_type, row.source_id, row.target_type, row.target_id, row.link_context, row.total])
  ),
  writeCsv("targets", ["target_type", "target_id", "event_count"], targets.map((row) => [row.target_type, row.target_id, row.total])),
  writeCsv("consent-choices", ["choice", "event_count"], consent.map((row) => [row.choice, row.total])),
  writeCsv(
    "campaign-landings",
    ["landing_type", "landing_id", "utm_source", "utm_medium", "utm_campaign", "utm_content", "event_count"],
    campaigns.map((row) => [
      row.landing_type,
      row.landing_id,
      row.utm_source,
      row.utm_medium,
      row.utm_campaign,
      row.utm_content,
      row.total
    ])
  )
]);

process.stdout.write(markdown);
