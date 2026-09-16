import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import worker from "../src/index.js";
import { sitemapSha256, sitemapXml } from "../generated/sitemap.js";
import { siteVerificationFiles } from "../generated/site-verification.js";

const repositoryRoot = new URL("../../../", import.meta.url);
const canonicalOrigin = "https://carlocaprini.github.io";
const expectedSitemap = await readFile(new URL("_site/sitemap.xml", repositoryRoot), "utf8");
const verificationFileName = "googlec7e995389ae6b3dd.html";
const verificationSource = await readFile(new URL(`../verification/${verificationFileName}`, import.meta.url), "utf8");
const expectedVerification = `google-site-verification: ${verificationFileName}`;
const siteConfiguration = await readFile(new URL("_config.yml", repositoryRoot), "utf8");
const workerConfiguration = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const externalUrlMatch = siteConfiguration.match(/^external_sitemap_url:\s*["']?([^"'\n]+)["']?$/m);

assert.ok(externalUrlMatch, "_config.yml must define external_sitemap_url");
const externalSitemapUrl = new URL(externalUrlMatch[1]);

test("canonical external URL matches the dedicated Worker configuration", () => {
  assert.equal(externalSitemapUrl.pathname, "/sitemap.xml");
  assert.equal(externalSitemapUrl.hostname.split(".")[0], workerConfiguration.name);
  assert.equal(workerConfiguration.workers_dev, true);
  assert.deepEqual(Object.keys(workerConfiguration).filter((key) => /kv|d1|r2|queue|durable|route|trigger|binding/i.test(key)), []);
});

test("packaged module is an exact copy of the generated Jekyll sitemap", () => {
  assert.equal(sitemapXml, expectedSitemap);
  assert.equal(sitemapSha256, createHash("sha256").update(expectedSitemap).digest("hex"));
});

test("packaged site verification preserves the exact Google token", () => {
  assert.equal(verificationSource.trimEnd(), expectedVerification);
  assert.deepEqual(Object.keys(siteVerificationFiles), [`/${verificationFileName}`]);
  assert.equal(siteVerificationFiles[`/${verificationFileName}`], expectedVerification);
});

test("GET /sitemap.xml returns cacheable XML with production URLs", async () => {
  const response = await worker.fetch(new Request("http://localhost:8788/sitemap.xml"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(await response.text(), expectedSitemap);
  assert.match(expectedSitemap, /<loc>https:\/\/carlocaprini\.github\.io\/<\/loc>/);
  assert.match(expectedSitemap, /<loc>https:\/\/carlocaprini\.github\.io\/thinking\/<\/loc>/);
});

test("every sitemap location keeps the production website origin", async () => {
  const response = await worker.fetch(new Request("http://localhost:8788/sitemap.xml"));
  const body = await response.text();
  const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.ok(locations.length > 0);
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, canonicalOrigin);
    assert.notEqual(url.host, externalSitemapUrl.host);
    assert.equal(url.host.endsWith(".workers.dev"), false);
  }
});

test("HEAD /sitemap.xml returns equivalent headers without a body", async () => {
  const response = await worker.fetch(new Request("http://localhost:8788/sitemap.xml", { method: "HEAD" }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(await response.text(), "");
});

test("Google Search Console verification file is served unchanged", async () => {
  const response = await worker.fetch(new Request(`http://localhost:8788/${verificationFileName}`));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(await response.text(), expectedVerification);
});

test("HEAD for the Google verification file returns equivalent headers without a body", async () => {
  const response = await worker.fetch(
    new Request(`http://localhost:8788/${verificationFileName}`, { method: "HEAD" }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(await response.text(), "");
});

test("unknown paths return a minimal plain-text 404", async () => {
  const response = await worker.fetch(new Request("http://localhost:8788/foo"));

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), "Not found\n");
});

test("serving static sitemap artifacts performs no runtime network request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected runtime network request");
  };

  try {
    for (const path of ["/sitemap.xml", `/${verificationFileName}`]) {
      const response = await worker.fetch(new Request(`http://localhost:8788${path}`));
      assert.equal(response.status, 200);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /raw\.githubusercontent\.com|api\.github\.com|https:\/\/carlocaprini\.github\.io/);
});
