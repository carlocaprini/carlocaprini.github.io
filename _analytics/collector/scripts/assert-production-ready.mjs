import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const configPath = resolve(import.meta.dirname, "../wrangler.jsonc");
const config = JSON.parse(await readFile(configPath, "utf8"));
const database = config.d1_databases?.find((entry) => entry.binding === "DB");
const databaseId = database?.database_id || "";
const allowedOrigin = config.vars?.ALLOWED_ORIGIN || "";

if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId)) {
  throw new Error("Production deploy blocked: replace the D1 database ID placeholder first.");
}

if (allowedOrigin !== "https://carlocaprini.github.io") {
  throw new Error("Production deploy blocked: ALLOWED_ORIGIN must be the canonical public site.");
}

process.stdout.write("Production analytics configuration is ready for deployment.\n");
