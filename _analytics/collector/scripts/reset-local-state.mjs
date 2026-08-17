import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const stateDirectory = resolve(import.meta.dirname, "../.wrangler/state");
await rm(stateDirectory, { force: true, recursive: true });
process.stdout.write(`Removed local analytics state: ${stateDirectory}\n`);
