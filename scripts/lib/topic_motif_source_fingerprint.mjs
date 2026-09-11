import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const DIRECT_VISUAL_SOURCE_FILES = [
  "_config.yml",
  "_config.article-motif-balanced.yml",
  "_config.article-motif-spatial.yml",
  "_data/topics.yml",
  "_includes/article-topic-motif.html",
  "_includes/content-topic-items.html",
  "_layouts/article.html",
  "_layouts/default.html",
  "assets/css/main.css",
  "scripts/generate_topic_motif_reference.mjs",
  "scripts/lib/topic_motif_source_fingerprint.mjs"
];

export async function visualSourceFiles(manifest, repositoryRoot) {
  const styleRoot = resolve(repositoryRoot, "_includes/styles");
  const styleFiles = (await readdir(styleRoot))
    .filter((path) => path.endsWith(".css"))
    .map((path) => `_includes/styles/${path}`);
  const articleFiles = Object.values(manifest.topics).map(({ path }) =>
    `pages/thinking/${path.split("/").filter(Boolean).at(-1)}.md`
  );

  // Only include files whose contents can directly change the rendered article
  // topic motif references. Tooling/package versions are intentionally excluded
  // and are validated through the actual visual comparison instead.
  return [...DIRECT_VISUAL_SOURCE_FILES, ...styleFiles, ...articleFiles].sort();
}

export async function sourceFingerprint(manifest, repositoryRoot) {
  const sourceFiles = await visualSourceFiles(manifest, repositoryRoot);
  const hash = createHash("sha256");
  for (const relativePath of sourceFiles) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(resolve(repositoryRoot, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}
