import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manifest = JSON.parse(fs.readFileSync("legacy/routes.json", "utf8"));

test("route inventory is explicit, unique, and reconciled", () => {
  assert.equal(manifest.routes.length, 38);
  assert.equal(new Set(manifest.routes).size, 38);
  assert.equal(manifest.shared_indexable_route_count, 36);
  assert.deepEqual(manifest.shared_unsitemapped_routes, ["/knowledge/", "/privacy/"]);
  assert.deepEqual(manifest.legacy_only_routes, []);
  assert.deepEqual(manifest.canonical_only_routes, []);
  assert.deepEqual(manifest.fragment_contracts, ["/#contact"]);
  assert.ok(manifest.routes.every((route) => route.startsWith("/") && route.endsWith("/")));
});

test("workflows use artifacts, minimal default permissions, and no direct repository writes", () => {
  for (const file of [".github/workflows/site-checks.yml", ".github/workflows/feed-bridge.yml"]) {
    const workflow = fs.readFileSync(file, "utf8");
    assert.match(workflow, /^permissions:\n  contents: read/m);
    assert.match(workflow, /actions\/upload-pages-artifact@/);
    assert.match(workflow, /actions\/deploy-pages@/);
    assert.doesNotMatch(workflow, /git push|contents: write|pull-requests: write/);
  }
  const feed = fs.readFileSync(".github/workflows/feed-bridge.yml", "utf8");
  assert.match(feed, /cron:/);
  assert.match(feed, /workflow_dispatch:/);
  assert.match(feed, /ruby scripts\/refresh_feed\.rb legacy\/feed\.xml/);
});

test("legacy source contains no analytics runtime or private-repository references", () => {
  const files = [
    "scripts/build_legacy_site.mjs", "README.md", "AGENTS.md",
    ".github/workflows/site-checks.yml", ".github/workflows/feed-bridge.yml"
  ];
  const text = files.map((file) => fs.readFileSync(file, "utf8")).join("\n").toLowerCase();
  const privateRepositoryIdentifier = ["carlocaprini", "site"].join("/");
  for (const forbidden of ["google analytics", "gtag(", "ga4", "cloudflare d1", "repository_dispatch", privateRepositoryIdentifier, "github_pat"]) {
    assert.equal(text.includes(forbidden), false, `found forbidden reference: ${forbidden}`);
  }
});
