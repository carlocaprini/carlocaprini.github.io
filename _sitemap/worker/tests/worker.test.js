import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import worker from "../src/index.js";
import { sitemapSha256, sitemapXml } from "../generated/sitemap.js";

const repositoryRoot = new URL("../../../", import.meta.url);
const canonicalOrigin = "https://carlocaprini.github.io";
const expectedSitemap = await readFile(new URL("_site/sitemap.xml", repositoryRoot), "utf8");
const siteConfiguration = await readFile(new URL("_config.yml", repositoryRoot), "utf8");
const externalUrlMatch = siteConfiguration.match(/^external_sitemap_url:\s*["']?([^"'\n]+)["']?$/m);

assert.ok(externalUrlMatch, "_config.yml must define external_sitemap_url");
const externalSitemapUrl = new URL(externalUrlMatch[1]);

test("packaged module is an exact copy of the generated Jekyll sitemap", () => {
  assert.equal(sitemapXml, expectedSitemap);
  assert.equal(sitemapSha256, createHash("sha256").update(expectedSitemap).digest("hex"));
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

test("unknown paths return a minimal plain-text 404", async () => {
  const response = await worker.fetch(new Request("http://localhost:8788/foo"));

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), "Not found\n");
});

test("serving the sitemap performs no runtime network request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected runtime network request");
  };

  try {
    const response = await worker.fetch(new Request("http://localhost:8788/sitemap.xml"));
    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /raw\.githubusercontent\.com|api\.github\.com|https:\/\/carlocaprini\.github\.io/);
});
