import { chromium } from "@playwright/test";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repositoryRoot, "visual-reference/manifest.json");
const committedOutput = resolve(repositoryRoot, "visual-reference");
const baseURL = process.env.SITE_BASE_URL || "http://127.0.0.1:4005";
const checkMode = process.argv.includes("--check");
const explicitOutputIndex = process.argv.indexOf("--output");
const explicitOutput = explicitOutputIndex >= 0 ? process.argv[explicitOutputIndex + 1] : null;

if (explicitOutputIndex >= 0 && !explicitOutput) {
  throw new Error("--output requires a directory");
}

function assertManifest(manifest) {
  if (!manifest || manifest.version !== 1) throw new Error("Unsupported Visual Reference manifest version");
  if (!manifest.viewports || !Array.isArray(manifest.surfaces) || manifest.surfaces.length === 0) {
    throw new Error("Visual Reference manifest must define viewports and surfaces");
  }

  const surfaceIds = new Set();
  for (const surface of manifest.surfaces) {
    if (!surface.id?.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) {
      throw new Error(`Invalid surface id: ${surface.id || "(missing)"}`);
    }
    if (surfaceIds.has(surface.id)) throw new Error(`Duplicate surface id: ${surface.id}`);
    surfaceIds.add(surface.id);
    if (!surface.path?.startsWith("/") || !surface.description || !surface.viewports?.length) {
      throw new Error(`Surface ${surface.id} must define path, description and viewports`);
    }
    for (const viewportName of surface.viewports) {
      const viewport = manifest.viewports[viewportName];
      if (!viewport || !Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)) {
        throw new Error(`Surface ${surface.id} references invalid viewport ${viewportName}`);
      }
    }
  }
}

async function serverResponds() {
  try {
    const response = await fetch(baseURL, { redirect: "manual" });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function ensureServer() {
  if (await serverResponds()) return null;

  const url = new URL(baseURL);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(`Refusing to start a local server for non-local SITE_BASE_URL ${baseURL}`);
  }

  const server = spawn(process.execPath, [resolve(repositoryRoot, "scripts/serve_site.mjs"), url.port || "80"], {
    cwd: repositoryRoot,
    env: { ...process.env, SITE_ROOT: resolve(repositoryRoot, "_site") },
    stdio: "inherit"
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Static server exited with code ${server.exitCode}`);
    if (await serverResponds()) return server;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  server.kill("SIGTERM");
  throw new Error(`Static server did not become ready at ${baseURL}`);
}

async function capture(manifest, outputRoot) {
  const browser = await chromium.launch();
  try {
    for (const surface of manifest.surfaces) {
      for (const viewportName of surface.viewports) {
        const viewport = manifest.viewports[viewportName];
        const context = await browser.newContext({
          viewport,
          reducedMotion: "reduce"
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
          window.localStorage.setItem("site_analytics_consent", JSON.stringify({
            value: "denied",
            updatedAt: Date.now()
          }));
        });
        await page.route("https://fonts.googleapis.com/**", (route) =>
          route.fulfill({ status: 200, contentType: "text/css", body: "" })
        );

        const response = await page.goto(new URL(surface.path, baseURL).toString(), { waitUntil: "domcontentloaded" });
        if (!response || !response.ok()) {
          throw new Error(`${surface.id} (${surface.path}) returned ${response?.status() || "no response"}`);
        }
        await page.addStyleTag({
          content: "*, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }"
        });
        await page.locator("img").evaluateAll((images) => {
          for (const image of images) image.loading = "eager";
        });
        await page.waitForLoadState("networkidle");
        await page.locator("img").evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode().catch(() => undefined)))
        );
        await page.locator("main#top").waitFor({ state: "visible" });

        const destination = join(outputRoot, surface.id, `${viewportName}.webp`);
        await mkdir(dirname(destination), { recursive: true });
        await page.screenshot({ path: destination, type: "webp", fullPage: manifest.capture.fullPage });
        process.stdout.write(`Captured ${surface.id}/${viewportName}.webp\n`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

async function compareReferences(manifest, generatedRoot) {
  const mismatches = [];
  for (const surface of manifest.surfaces) {
    for (const viewportName of surface.viewports) {
      const relative = join(surface.id, `${viewportName}.webp`);
      try {
        const [expected, actual] = await Promise.all([
          readFile(join(committedOutput, relative)),
          readFile(join(generatedRoot, relative))
        ]);
        if (!expected.equals(actual)) mismatches.push(relative);
      } catch (_error) {
        mismatches.push(relative);
      }
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Visual Reference is stale or incomplete:\n- ${mismatches.join("\n- ")}`);
  }
}

await access(resolve(repositoryRoot, "_site/index.html"), constants.R_OK).catch(() => {
  throw new Error("Missing _site/index.html. Build the site before generating the Visual Reference.");
});

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assertManifest(manifest);

let temporaryRoot = null;
const outputRoot = checkMode
  ? await mkdtemp(join(tmpdir(), "site-visual-reference-"))
  : resolve(repositoryRoot, explicitOutput || "visual-reference");
if (checkMode) temporaryRoot = outputRoot;

const server = await ensureServer();
try {
  await capture(manifest, outputRoot);
  if (checkMode) await compareReferences(manifest, outputRoot);
} finally {
  if (server) server.kill("SIGTERM");
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
}

process.stdout.write(checkMode ? "Visual Reference is current.\n" : `Visual Reference written to ${outputRoot}\n`);
