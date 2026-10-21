import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("_site");
const port = Number(process.env.PORT || 4173);
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let candidate = path.join(root, pathname);
  if (pathname.endsWith("/")) candidate = path.join(candidate, "index.html");
  if (!candidate.startsWith(root) || !fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) {
    candidate = path.join(root, "404.html");
    response.statusCode = 404;
  }
  const types = { ".html": "text/html; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
  response.setHeader("content-type", types[path.extname(candidate)] || "application/octet-stream");
  fs.createReadStream(candidate).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`Legacy site listening on http://127.0.0.1:${port}`));
