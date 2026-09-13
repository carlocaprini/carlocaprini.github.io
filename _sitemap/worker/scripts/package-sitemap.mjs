import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sourcePath = resolve(repositoryRoot, "_site/sitemap.xml");
const outputDirectory = resolve(import.meta.dirname, "../generated");
const outputPath = resolve(outputDirectory, "sitemap.js");
const temporaryPath = `${outputPath}.tmp`;

let sitemapXml;
try {
  sitemapXml = await readFile(sourcePath, "utf8");
} catch (error) {
  if (error.code === "ENOENT") {
    throw new Error(`Missing ${sourcePath}. Build the production Jekyll site before packaging the Worker.`);
  }
  throw error;
}

if (sitemapXml.length === 0) {
  throw new Error(`${sourcePath} is empty.`);
}

const sitemapSha256 = createHash("sha256").update(sitemapXml).digest("hex");
const generatedModule = [
  "// Generated from _site/sitemap.xml by scripts/package-sitemap.mjs. Do not edit.",
  `export const sitemapSha256 = ${JSON.stringify(sitemapSha256)};`,
  `export const sitemapXml = ${JSON.stringify(sitemapXml)};`,
  "",
].join("\n");

await mkdir(outputDirectory, { recursive: true });
await writeFile(temporaryPath, generatedModule, "utf8");
await rename(temporaryPath, outputPath);

process.stdout.write(`Packaged _site/sitemap.xml as ${sitemapSha256}.\n`);
