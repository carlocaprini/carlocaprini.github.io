import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sourcePath = resolve(repositoryRoot, "_site/sitemap.xml");
const outputDirectory = resolve(import.meta.dirname, "../generated");
const outputPath = resolve(outputDirectory, "sitemap.js");
const temporaryPath = `${outputPath}.tmp`;
const verificationDirectory = resolve(import.meta.dirname, "../verification");
const verificationOutputPath = resolve(outputDirectory, "site-verification.js");
const verificationTemporaryPath = `${verificationOutputPath}.tmp`;

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

const verificationFileNames = (await readdir(verificationDirectory))
  .filter((fileName) => /^google[a-z0-9]+\.html$/.test(fileName))
  .sort();

if (verificationFileNames.length === 0) {
  throw new Error(`Missing Google Search Console verification file in ${verificationDirectory}.`);
}

const verificationFiles = Object.fromEntries(
  await Promise.all(
    verificationFileNames.map(async (fileName) => {
      const verificationContent = (await readFile(resolve(verificationDirectory, fileName), "utf8")).trimEnd();
      const expectedContent = `google-site-verification: ${fileName}`;

      if (verificationContent !== expectedContent) {
        throw new Error(`${fileName} must contain exactly ${JSON.stringify(expectedContent)}.`);
      }

      return [`/${fileName}`, verificationContent];
    }),
  ),
);
const generatedVerificationModule = [
  "// Generated from worker/verification by scripts/package-sitemap.mjs. Do not edit.",
  `export const siteVerificationFiles = Object.freeze(${JSON.stringify(verificationFiles)});`,
  "",
].join("\n");

await mkdir(outputDirectory, { recursive: true });
await writeFile(temporaryPath, generatedModule, "utf8");
await rename(temporaryPath, outputPath);
await writeFile(verificationTemporaryPath, generatedVerificationModule, "utf8");
await rename(verificationTemporaryPath, verificationOutputPath);

process.stdout.write(
  `Packaged _site/sitemap.xml as ${sitemapSha256} with ${verificationFileNames.length} site verification file.\n`,
);
