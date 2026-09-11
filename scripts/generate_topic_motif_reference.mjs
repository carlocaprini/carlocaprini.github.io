import { chromium } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sourceFingerprint } from "./lib/topic_motif_source_fingerprint.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const referenceRoot = resolve(repositoryRoot, "visual-reference/article-topic-motifs");
const manifestPath = resolve(referenceRoot, "manifest.json");
const checkMode = process.argv.includes("--check");
const sourceCheckMode = process.argv.includes("--source-check");
const variants = ["balanced", "spatial"];
const buildRoots = Object.fromEntries(
  variants.map((variant) => [variant, resolve(repositoryRoot, `_site-topic-motif-${variant}`)])
);

function run(command, args, environment = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: { ...process.env, ...environment },
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function buildVariant(variant) {
  const config = `_config.yml,_config.article-motif-${variant}.yml`;
  const localJekyll = spawnSync("bundle", ["exec", "jekyll", "--version"], {
    cwd: repositoryRoot,
    stdio: "ignore"
  }).status === 0;

  if (localJekyll) {
    await run("bundle", [
      "exec", "jekyll", "build", "--strict_front_matter",
      "--config", config,
      "--destination", buildRoots[variant]
    ], { JEKYLL_ENV: "production" });
    return;
  }

  await run("docker", [
    "compose", "run", "--rm", "-e", "JEKYLL_ENV=production", "site",
    "bundle", "exec", "jekyll", "build", "--strict_front_matter",
    "--config", config,
    "--destination", `/srv/jekyll/_site-topic-motif-${variant}`
  ]);
}

async function waitForServer(baseURL, server) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Static server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch (_error) {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Static server did not become ready at ${baseURL}`);
}

async function captureVariant(browser, manifest, variant, outputRoot) {
  const port = variant === "balanced" ? 4011 : 4012;
  const baseURL = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [resolve(repositoryRoot, "scripts/serve_site.mjs"), String(port)], {
    cwd: repositoryRoot,
    env: { ...process.env, SITE_ROOT: buildRoots[variant] },
    stdio: "inherit"
  });

  try {
    await waitForServer(baseURL, server);
    for (const capture of manifest.captures.filter((item) => item.variant === variant)) {
      const topic = manifest.topics[capture.topic];
      const viewport = manifest.viewports[capture.viewport];
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.localStorage.setItem("site_analytics_consent", JSON.stringify({
          value: "denied",
          updatedAt: 4102444800000
        }));
      });
      await page.route("https://fonts.googleapis.com/**", (route) =>
        route.fulfill({ status: 200, contentType: "text/css", body: "" })
      );
      const response = await page.goto(new URL(topic.path, baseURL).toString(), { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`${capture.id} returned ${response?.status() || "no response"}`);
      await page.addStyleTag({
        content: `*, *::before, *::after { animation: none !important; transition: none !important; }${capture.grayscale ? ".article-topic-hero { filter: grayscale(1) !important; }" : ""}`
      });

      const hero = page.locator(".article-topic-hero");
      const motif = hero.locator(".article-topic-motif");
      const facts = await hero.evaluate((element) => {
        const motifElement = element.querySelector(".article-topic-motif");
        return {
          topic: element.dataset.primaryTopic,
          variant: element.dataset.motifVariant,
          family: motifElement.dataset.motifFamily,
          ariaHidden: motifElement.getAttribute("aria-hidden"),
          color: getComputedStyle(motifElement).color,
          markerColor: getComputedStyle(element.querySelector(".content-topic-link--primary"), "::before").backgroundColor,
          pointerEvents: getComputedStyle(motifElement).pointerEvents,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });
      if (facts.topic !== capture.topic || facts.variant !== variant || facts.family !== topic.family) {
        throw new Error(`${capture.id} rendered the wrong semantic motif: ${JSON.stringify(facts)}`);
      }
      if (facts.ariaHidden !== "true" || facts.color !== facts.markerColor) {
        throw new Error(`${capture.id} rendered an inaccessible or incorrectly colored motif: ${JSON.stringify(facts)}`);
      }
      if (facts.pointerEvents !== "none" || facts.overflow !== 0) {
        throw new Error(`${capture.id} does not protect content or viewport bounds: ${JSON.stringify(facts)}`);
      }

      const destination = resolve(outputRoot, `${capture.id}.webp`);
      await mkdir(dirname(destination), { recursive: true });
      await hero.screenshot({ path: destination, type: "webp", animations: "disabled" });
      process.stdout.write(`Captured ${capture.id}.webp\n`);
      await context.close();
    }
  } finally {
    server.kill("SIGTERM");
  }
}

async function compare(manifest, generatedRoot) {
  const stale = [];
  for (const capture of manifest.captures) {
    const relative = `${capture.id}.webp`;
    try {
      const [expected, actual] = await Promise.all([
        readFile(resolve(referenceRoot, relative)),
        readFile(resolve(generatedRoot, relative))
      ]);
      if (!expected.equals(actual)) stale.push(relative);
    } catch (_error) {
      stale.push(relative);
    }
  }
  if (stale.length) throw new Error(`Article topic motif references are stale or incomplete:\n- ${stale.join("\n- ")}`);
}

let manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.version !== 1 || !manifest.captures?.length) throw new Error("Unsupported article topic motif manifest");
const currentFingerprint = await sourceFingerprint(manifest, repositoryRoot);

if (sourceCheckMode) {
  if (manifest.sourceFingerprint !== currentFingerprint) {
    throw new Error("Article topic motif references are stale because a visual source changed. Regenerate the motif references and commit the updated manifest/assets.");
  }
  process.stdout.write("Article topic motif reference sources are current.\n");
} else {
  if (checkMode && manifest.sourceFingerprint !== currentFingerprint) {
    throw new Error("Article topic motif references are stale because a visual source changed. Regenerate the motif references and commit the updated manifest/assets.");
  }
  if (!checkMode && manifest.sourceFingerprint !== currentFingerprint) {
    manifest = { ...manifest, sourceFingerprint: currentFingerprint };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const temporaryOutput = checkMode ? await mkdtemp(join(tmpdir(), "topic-motif-reference-")) : null;
  const outputRoot = temporaryOutput || referenceRoot;

  try {
    for (const variant of variants) await buildVariant(variant);
    const browser = await chromium.launch();
    try {
      for (const variant of variants) await captureVariant(browser, manifest, variant, outputRoot);
    } finally {
      await browser.close();
    }
    if (checkMode) await compare(manifest, outputRoot);
  } finally {
    await Promise.all(variants.map((variant) => rm(buildRoots[variant], { recursive: true, force: true })));
    if (temporaryOutput) await rm(temporaryOutput, { recursive: true, force: true });
  }

  process.stdout.write(checkMode ? "Article topic motif references are current.\n" : `Article topic motif references written to ${referenceRoot}\n`);
}
