import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(fs.readFileSync("legacy/routes.json", "utf8"));
const outputFor = (route) => route === "/" ? "_site/index.html" : path.join("_site", route.slice(1), "index.html");

test("every known route has a minimal fixed-origin redirect stub", () => {
  for (const route of manifest.routes) {
    const file = outputFor(route);
    assert.ok(fs.existsSync(file), `missing ${file}`);
    const html = fs.readFileSync(file, "utf8");
    const target = new URL(route, manifest.canonical_origin).href;
    assert.match(html, new RegExp(`<meta http-equiv="refresh" content="0; url=${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
    assert.ok(html.includes(`<link rel="canonical" href="${target}">`));
    assert.ok(html.includes(`href="${target}"`));
    assert.match(html, /target\.search=location\.search;target\.hash=location\.hash/);
    assert.match(html, /location\.replace\(target\.href\)/);
    assert.doesNotMatch(html, /name="robots" content="noindex/i);
    assert.doesNotMatch(html, /analytics|cookie|consent|carlocaprini\.github\.io\/assets/i);
  }
});

test("generated surface is allowlisted and contains no old runtime assets", () => {
  const topLevel = fs.readdirSync("_site").sort();
  assert.deepEqual(topLevel, [
    ".nojekyll", "404.html", "experience", "explore", "feed.xml", "googlec7e995389ae6b3dd.html",
    "industry-expertise", "influences", "knowledge", "privacy", "robots.txt", "series",
    "sitemap-static.xml", "sitemap.txt", "sitemap.xml", "thinking", "work", "index.html"
  ].sort());
  assert.equal(fs.readFileSync("_site/googlec7e995389ae6b3dd.html", "utf8").trim(), "google-site-verification: googlec7e995389ae6b3dd.html");
});


test("404 keeps a true fallback document and constructs only a fixed-origin target", () => {
  const html = fs.readFileSync("_site/404.html", "utf8");
  assert.doesNotMatch(html, /http-equiv="refresh"/i);
  assert.match(html, /new URL\("https:\/\/carlocaprini\.com"\)/);
  assert.match(html, /target\.pathname=location\.pathname/);
  assert.match(html, /noindex,follow/);
  assert.doesNotMatch(html, /location\.href\s*\+|URLSearchParams|redirect=/);
});

test("sitemaps and robots describe only the legacy compatibility routes", () => {
  const sitemap = fs.readFileSync("_site/sitemap.xml", "utf8");
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(listed, manifest.routes.map((route) => new URL(route, manifest.legacy_origin).href));
  assert.equal(fs.readFileSync("_site/robots.txt", "utf8"), "User-agent: *\nAllow: /\nSitemap: https://carlocaprini.github.io/sitemap.xml\n");
});
