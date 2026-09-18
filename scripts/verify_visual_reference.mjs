import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyVisualReference } from "./lib/visual_documentation_verifiers.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const referenceRoot = resolve(repositoryRoot, "visual-reference");
const result = await verifyVisualReference({
  manifestPath: resolve(referenceRoot, "manifest.json"),
  referenceRoot
});

process.stdout.write(`Visual Reference structure is valid (${result.surfaces} surfaces).\n`);
