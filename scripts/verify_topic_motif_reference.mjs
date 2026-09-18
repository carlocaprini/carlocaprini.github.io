import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyTopicMotifReference } from "./lib/visual_documentation_verifiers.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const referenceRoot = resolve(repositoryRoot, "visual-reference/article-topic-motifs");
const result = await verifyTopicMotifReference({
  manifestPath: resolve(referenceRoot, "manifest.json"),
  referenceRoot
});

process.stdout.write(`Article topic motif reference structure is valid (${result.captures} captures).\n`);
