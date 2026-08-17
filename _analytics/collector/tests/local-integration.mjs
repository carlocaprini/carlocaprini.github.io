import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { chromium } from "@playwright/test";

const collectorDirectory = resolve(import.meta.dirname, "..");
const repositoryDirectory = resolve(collectorDirectory, "../..");
const configFile = "wrangler.local.jsonc";
const databaseName = "carlo-site-aggregate-analytics-local";
const workerOrigin = "http://127.0.0.1:8791";
const siteOrigin = "http://127.0.0.1:4199";
const persistenceDirectory = await mkdtemp(join(tmpdir(), "carlo-site-analytics-"));
const adapter = await readFile(resolve(repositoryDirectory, "assets/js/aggregate-analytics.js"), "utf8");

function runWrangler(argumentsList) {
  const result = spawnSync("wrangler", argumentsList, {
    cwd: collectorDirectory,
    encoding: "utf8",
    env: { ...process.env, CI: "true", NO_D1_WARNING: "true" }
  });

  if (result.status !== 0) {
    throw new Error(`Wrangler failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

async function waitForWorker(worker, output) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (worker.exitCode !== null) {
      throw new Error(`Local Worker stopped before becoming ready:\n${output.join("")}`);
    }
    try {
      await fetch(`${workerOrigin}/`);
      return;
    } catch (_error) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
  }
  throw new Error(`Timed out waiting for local Worker:\n${output.join("")}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => child.once("exit", resolvePromise)),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 3_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function query(sql) {
  const output = runWrangler([
    "d1",
    "execute",
    databaseName,
    "--local",
    "--config",
    configFile,
    "--persist-to",
    persistenceDirectory,
    "--command",
    sql,
    "--json"
  ]);
  const parsed = JSON.parse(output);
  return parsed[0]?.results || [];
}

const html = `<!doctype html>
<html lang="en">
  <body
    data-analytics-page-type="note"
    data-analytics-page-id="/thinking/local-integration/"
    data-analytics-content="true"
    data-aggregate-analytics-enabled="true"
    data-aggregate-analytics-local="true"
    data-aggregate-analytics-endpoint="${workerOrigin}/v1/measure"
  >
    <script src="/aggregate-analytics.js" defer></script>
  </body>
</html>`;

let worker;
let server;
let browser;

try {
  runWrangler([
    "d1",
    "migrations",
    "apply",
    databaseName,
    "--local",
    "--config",
    configFile,
    "--persist-to",
    persistenceDirectory
  ]);

  const workerOutput = [];
  worker = spawn("wrangler", [
    "dev",
    "--local",
    "--config",
    configFile,
    "--port",
    "8791",
    "--persist-to",
    persistenceDirectory
  ], {
    cwd: collectorDirectory,
    env: { ...process.env, CI: "true", NO_D1_WARNING: "true" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  worker.stdout.on("data", (chunk) => workerOutput.push(chunk.toString()));
  worker.stderr.on("data", (chunk) => workerOutput.push(chunk.toString()));
  await waitForWorker(worker, workerOutput);

  server = createServer((request, response) => {
    if (request.url?.startsWith("/aggregate-analytics.js")) {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(adapter);
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(4199, "127.0.0.1", resolvePromise);
  });

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36"
  });
  await page.goto(`${siteOrigin}/?utm_source=linkedin&utm_medium=social&utm_campaign=thinking&utm_content=local_test_single_image`);
  await page.waitForFunction(() => window.siteAggregateAnalytics?.enabled === true);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("site:analytics", {
      detail: {
        name: "note_open",
        parameters: {
          page_type: "note",
          page_id: "/thinking/local-integration/",
          note_id: "/thinking/target-note/",
          link_context: "integration_test"
        }
      }
    }));
  });
  await page.waitForTimeout(500);
  await browser.close();
  browser = null;
  await new Promise((resolvePromise) => server.close(resolvePromise));
  server = null;
  await stopProcess(worker);
  worker = null;

  const eventRows = query(`
    SELECT event_name, SUM(event_count) AS total
    FROM daily_counts
    GROUP BY event_name
    ORDER BY event_name
  `);
  assert.deepEqual(eventRows, [
    { event_name: "content_view", total: 1 },
    { event_name: "note_open", total: 1 },
    { event_name: "page_view", total: 1 }
  ]);

  const campaignRows = query(`
    SELECT landing_id, utm_source, utm_medium, utm_campaign, utm_content, event_count
    FROM daily_campaign_counts
  `);
  assert.deepEqual(campaignRows, [{
    landing_id: "/thinking/local-integration/",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "thinking",
    utm_content: "local_test_single_image",
    event_count: 1
  }]);

  process.stdout.write("Local analytics integration passed: browser → Worker → D1.\n");
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolvePromise) => server.close(resolvePromise));
  await stopProcess(worker);
  await rm(persistenceDirectory, { force: true, recursive: true });
}
