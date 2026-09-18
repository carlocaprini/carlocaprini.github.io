import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readImageDimensions } from "./image_dimensions.mjs";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAPTURE_ID_PATTERN = /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/;
const MOTIF_VARIANTS = new Set(["balanced", "spatial"]);

function assertViewport(name, viewport) {
  if (!ID_PATTERN.test(name) || !Number.isInteger(viewport?.width) || viewport.width <= 0 ||
      !Number.isInteger(viewport?.height) || viewport.height <= 0) {
    throw new Error(`Invalid viewport ${name}`);
  }
}

async function loadManifest(manifestPath) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read manifest ${manifestPath}: ${error.message}`);
  }
  if (manifest?.version !== 1) throw new Error(`Unsupported manifest version in ${manifestPath}`);
  if (!manifest.viewports || typeof manifest.viewports !== "object") {
    throw new Error(`Manifest ${manifestPath} must define viewports`);
  }
  for (const [name, viewport] of Object.entries(manifest.viewports)) assertViewport(name, viewport);
  return manifest;
}

async function assertImage(path, expectedWidth) {
  let dimensions;
  try {
    dimensions = await readImageDimensions(path);
  } catch (error) {
    throw new Error(`Invalid or missing reference image ${path}: ${error.message}`);
  }
  if (dimensions.width !== expectedWidth) {
    throw new Error(`Reference image ${path} is ${dimensions.width}px wide; expected ${expectedWidth}px`);
  }
}

export async function verifyVisualReference({ manifestPath, referenceRoot }) {
  const manifest = await loadManifest(manifestPath);
  if (!Array.isArray(manifest.surfaces) || manifest.surfaces.length === 0) {
    throw new Error("Visual Reference manifest must define surfaces");
  }
  if (manifest.capture?.format !== "webp" || manifest.capture?.fullPage !== true) {
    throw new Error("Visual Reference capture must use full-page WebP images");
  }

  const surfaceIds = new Set();
  for (const surface of manifest.surfaces) {
    if (!ID_PATTERN.test(surface.id || "")) throw new Error(`Invalid surface id: ${surface.id || "(missing)"}`);
    if (surfaceIds.has(surface.id)) throw new Error(`Duplicate surface id: ${surface.id}`);
    surfaceIds.add(surface.id);
    if (!surface.path?.startsWith("/") || !surface.description || !Array.isArray(surface.viewports) || surface.viewports.length === 0) {
      throw new Error(`Surface ${surface.id} must define path, description and viewports`);
    }

    const viewportNames = new Set();
    for (const viewportName of surface.viewports) {
      if (viewportNames.has(viewportName)) throw new Error(`Surface ${surface.id} repeats viewport ${viewportName}`);
      viewportNames.add(viewportName);
      const viewport = manifest.viewports[viewportName];
      if (!viewport) throw new Error(`Surface ${surface.id} references unknown viewport ${viewportName}`);
      await assertImage(join(referenceRoot, surface.id, `${viewportName}.webp`), viewport.width);
    }
  }

  return { surfaces: surfaceIds.size };
}

export async function verifyTopicMotifReference({ manifestPath, referenceRoot }) {
  const manifest = await loadManifest(manifestPath);
  if (!manifest.topics || typeof manifest.topics !== "object" || Object.keys(manifest.topics).length === 0) {
    throw new Error("Topic motif manifest must define topics");
  }
  if (!Array.isArray(manifest.captures) || manifest.captures.length === 0) {
    throw new Error("Topic motif manifest must define captures");
  }

  for (const [topicId, topic] of Object.entries(manifest.topics)) {
    if (!ID_PATTERN.test(topicId) || !topic?.family || !topic.path?.startsWith("/")) {
      throw new Error(`Invalid topic ${topicId}`);
    }
  }

  const captureIds = new Set();
  const representedTopics = new Set();
  const representedVariants = new Set();
  for (const capture of manifest.captures) {
    if (!CAPTURE_ID_PATTERN.test(capture.id || "")) throw new Error(`Invalid capture id: ${capture.id || "(missing)"}`);
    if (captureIds.has(capture.id)) throw new Error(`Duplicate capture id: ${capture.id}`);
    captureIds.add(capture.id);
    if (!manifest.topics[capture.topic]) throw new Error(`Capture ${capture.id} references unknown topic ${capture.topic}`);
    if (!MOTIF_VARIANTS.has(capture.variant)) throw new Error(`Capture ${capture.id} references invalid variant ${capture.variant}`);
    const viewport = manifest.viewports[capture.viewport];
    if (!viewport) throw new Error(`Capture ${capture.id} references unknown viewport ${capture.viewport}`);
    if (capture.grayscale !== undefined && capture.grayscale !== true) {
      throw new Error(`Capture ${capture.id} has an invalid grayscale flag`);
    }

    representedTopics.add(capture.topic);
    representedVariants.add(capture.variant);
    await assertImage(resolve(referenceRoot, `${capture.id}.webp`), viewport.width);
  }

  for (const topicId of Object.keys(manifest.topics)) {
    if (!representedTopics.has(topicId)) throw new Error(`Topic ${topicId} has no reference capture`);
  }
  for (const variant of MOTIF_VARIANTS) {
    if (!representedVariants.has(variant)) throw new Error(`Topic motif references do not include ${variant}`);
  }

  return { captures: captureIds.size };
}
