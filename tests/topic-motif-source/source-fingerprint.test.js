import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  sourceFingerprint,
  visualSourceFiles
} from "../../scripts/lib/topic_motif_source_fingerprint.mjs";

const manifest = {
  topics: {
    "product-decisions": {
      path: "/thinking/product-decisions-are-mostly-trade-offs/"
    }
  }
};

async function writeFixtureFile(repositoryRoot, relativePath, content = `fixture:${relativePath}\n`) {
  const path = resolve(repositoryRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function createFixture() {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "topic-motif-source-test-"));
  await writeFixtureFile(repositoryRoot, "_includes/styles/article.css");
  const sourceFiles = await visualSourceFiles(manifest, repositoryRoot);
  await Promise.all(sourceFiles.map((path) => writeFixtureFile(repositoryRoot, path)));
  await writeFixtureFile(repositoryRoot, "package.json", JSON.stringify({ devDependencies: {} }));
  await writeFixtureFile(repositoryRoot, "package-lock.json", JSON.stringify({ packages: {} }));
  return repositoryRoot;
}

async function fingerprintAfterChange(relativePath, before, after) {
  const repositoryRoot = await createFixture();
  try {
    await writeFixtureFile(repositoryRoot, relativePath, before);
    const initial = await sourceFingerprint(manifest, repositoryRoot);
    await writeFixtureFile(repositoryRoot, relativePath, after);
    return { initial, changed: await sourceFingerprint(manifest, repositoryRoot) };
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
}

async function assertIgnored(relativePath, before, after) {
  const fingerprints = await fingerprintAfterChange(relativePath, before, after);
  assert.equal(fingerprints.changed, fingerprints.initial);
}

async function assertInvalidates(relativePath) {
  const fingerprints = await fingerprintAfterChange(relativePath, "before\n", "after\n");
  assert.notEqual(fingerprints.changed, fingerprints.initial);
}

test("an unrelated package version change does not invalidate motif references", async () => {
  await assertIgnored(
    "package.json",
    JSON.stringify({ devDependencies: { eslint: "1.0.0" } }),
    JSON.stringify({ devDependencies: { eslint: "1.0.1" } })
  );
});

test("a package-lock change does not invalidate motif references", async () => {
  await assertIgnored(
    "package-lock.json",
    JSON.stringify({ lockfileVersion: 3, packages: { eslint: "1.0.0" } }),
    JSON.stringify({ lockfileVersion: 3, packages: { eslint: "1.0.1" } })
  );
});

test("a Wrangler-only dependency change does not invalidate motif references", async () => {
  await assertIgnored(
    "package.json",
    JSON.stringify({ devDependencies: { wrangler: "4.40.0" } }),
    JSON.stringify({ devDependencies: { wrangler: "4.41.0" } })
  );
});

test("a Playwright-only dependency change does not invalidate motif references", async () => {
  await assertIgnored(
    "package.json",
    JSON.stringify({ devDependencies: { "@playwright/test": "1.62.0" } }),
    JSON.stringify({ devDependencies: { "@playwright/test": "1.62.1" } })
  );
});

test("a motif template change invalidates motif references", async () => {
  await assertInvalidates("_includes/article-topic-motif.html");
});

test("a topic visual metadata change invalidates motif references", async () => {
  await assertInvalidates("_data/topics.yml");
});

test("an article hero CSS change invalidates motif references", async () => {
  await assertInvalidates("_includes/styles/article.css");
});

test("a reference article content change invalidates motif references", async () => {
  await assertInvalidates("pages/thinking/product-decisions-are-mostly-trade-offs.md");
});

test("a generator logic change invalidates motif references", async () => {
  await assertInvalidates("scripts/generate_topic_motif_reference.mjs");
});
