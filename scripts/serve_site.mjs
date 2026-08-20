import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.env.SITE_ROOT || "_site");
const port = Number.parseInt(process.env.SITE_PORT || process.argv[2] || "4000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid SITE_PORT: ${process.env.SITE_PORT || process.argv[2] || ""}`);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"]
]);

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^[/\\]+/, "");
  const candidate = resolve(join(root, relative));
  return candidate === root || candidate.startsWith(`${root}${sep}`) ? candidate : null;
}

async function resolveFile(pathname) {
  const candidate = safePath(pathname);
  if (!candidate) return null;

  try {
    const candidateStat = await stat(candidate);
    if (candidateStat.isDirectory()) return join(candidate, "index.html");
    if (candidateStat.isFile()) return candidate;
  } catch (_error) {
    if (!extname(candidate)) {
      const indexFile = join(candidate, "index.html");
      try {
        if ((await stat(indexFile)).isFile()) return indexFile;
      } catch (_nestedError) {
        return null;
      }
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const file = await resolveFile(url.pathname);
    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found\n");
      return;
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes.get(extname(file).toLowerCase()) || "application/octet-stream"
    });
    createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Server error: ${error.message}\n`);
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Serving ${root} at http://127.0.0.1:${port}\n`);
});
