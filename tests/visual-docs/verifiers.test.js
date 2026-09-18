import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  verifyTopicMotifReference,
  verifyVisualReference
} from "../../scripts/lib/visual_documentation_verifiers.mjs";

function webp(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

async function write(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function withFixture(run) {
  const root = await mkdtemp(join(tmpdir(), "visual-docs-test-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function visualManifest() {
  return {
    version: 1,
    capture: { fullPage: true, format: "webp", animations: "disabled" },
    viewports: { desktop: { width: 1200, height: 800 } },
    surfaces: [{ id: "home", path: "/", description: "Home", viewports: ["desktop"] }]
  };
}

async function visualFixture(root, manifest = visualManifest()) {
  const manifestPath = join(root, "manifest.json");
  await write(manifestPath, `${JSON.stringify(manifest)}\n`);
  await write(join(root, "home/desktop.webp"), webp(1200, 1400));
  return { manifestPath, referenceRoot: root };
}

test("Visual Reference verifier passes without a browser or site build", async () => {
  await withFixture(async (root) => {
    const result = await verifyVisualReference(await visualFixture(root));
    assert.deepEqual(result, { surfaces: 1 });
  });
});
test("Visual Reference verifier rejects a missing declared image", async () => {
  await withFixture(async (root) => {
    const paths = await visualFixture(root);
    await rm(join(root, "home/desktop.webp"));
    await assert.rejects(verifyVisualReference(paths), /Invalid or missing reference image/);
  });
});

test("Visual Reference verifier rejects an unknown viewport", async () => {
  await withFixture(async (root) => {
    const manifest = visualManifest();
    manifest.surfaces[0].viewports = ["print"];
    await assert.rejects(verifyVisualReference(await visualFixture(root, manifest)), /unknown viewport print/);
  });
});

test("Visual Reference verifier rejects duplicate surface ids", async () => {
  await withFixture(async (root) => {
    const manifest = visualManifest();
    manifest.surfaces.push({ ...manifest.surfaces[0] });
    await assert.rejects(verifyVisualReference(await visualFixture(root, manifest)), /Duplicate surface id: home/);
  });
});

test("Visual Reference verifier rejects an unreadable image", async () => {
  await withFixture(async (root) => {
    const paths = await visualFixture(root);
    await write(join(root, "home/desktop.webp"), "not an image");
    await assert.rejects(verifyVisualReference(paths), /invalid WebP header/);
  });
});

function motifManifest() {
  return {
    version: 1,
    viewports: { desktop: { width: 1200, height: 800 } },
    topics: {
      "product-decisions": { family: "branching", path: "/thinking/product-decisions/" }
    },
    captures: [
      { id: "comparison/balanced/desktop", variant: "balanced", topic: "product-decisions", viewport: "desktop" },
      { id: "comparison/spatial/desktop", variant: "spatial", topic: "product-decisions", viewport: "desktop" },
      { id: "grayscale/product-decisions", variant: "balanced", topic: "product-decisions", viewport: "desktop", grayscale: true }
    ]
  };
}

async function motifFixture(root, manifest = motifManifest()) {
  const manifestPath = join(root, "manifest.json");
  await write(manifestPath, `${JSON.stringify(manifest)}\n`);
  for (const capture of manifest.captures) {
    await write(join(root, `${capture.id}.webp`), webp(1200, 500));
  }
  return { manifestPath, referenceRoot: root };
}

test("Topic motif verifier passes without a browser or site build", async () => {
  await withFixture(async (root) => {
    const result = await verifyTopicMotifReference(await motifFixture(root));
    assert.deepEqual(result, { captures: 3 });
  });
});

test("Topic motif verifier rejects a missing declared capture", async () => {
  await withFixture(async (root) => {
    const paths = await motifFixture(root);
    await rm(join(root, "comparison/spatial/desktop.webp"));
    await assert.rejects(verifyTopicMotifReference(paths), /Invalid or missing reference image/);
  });
});

test("Topic motif verifier rejects duplicate capture ids", async () => {
  await withFixture(async (root) => {
    const manifest = motifManifest();
    manifest.captures.push({ ...manifest.captures[0] });
    await assert.rejects(verifyTopicMotifReference(await motifFixture(root, manifest)), /Duplicate capture id/);
  });
});

test("Topic motif verifier rejects invalid viewport and topic references", async () => {
  await withFixture(async (root) => {
    const invalidViewport = motifManifest();
    invalidViewport.captures[0].viewport = "print";
    await assert.rejects(verifyTopicMotifReference(await motifFixture(root, invalidViewport)), /unknown viewport print/);

    const invalidTopic = motifManifest();
    invalidTopic.captures[0].topic = "missing-topic";
    await assert.rejects(verifyTopicMotifReference(await motifFixture(root, invalidTopic)), /unknown topic missing-topic/);
  });
});
