import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "_site");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "legacy/routes.json"), "utf8"));

const expectedOrigins = {
  legacy_origin: "https://carlocaprini.github.io",
  canonical_origin: "https://carlocaprini.com"
};
for (const [key, value] of Object.entries(expectedOrigins)) {
  if (manifest[key] !== value) throw new Error(`${key} must be ${value}`);
}
if (manifest.schema_version !== 1) throw new Error("Unsupported manifest schema");
if (!Array.isArray(manifest.routes) || new Set(manifest.routes).size !== manifest.routes.length) {
  throw new Error("Routes must be a unique array");
}
for (const route of manifest.routes) {
  if (!/^\/(?:[^?#]*\/)?$/.test(route) || route.includes("//")) throw new Error(`Invalid route: ${route}`);
}

const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const shell = ({ title, canonical, heading, message, script, robots = "" }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${robots}<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)}</title><link rel="canonical" href="${escapeHtml(canonical)}">
<style>html{font-family:system-ui,sans-serif;color:#17202a;background:#f7f5ef}body{max-width:42rem;margin:12vh auto;padding:1.5rem;line-height:1.55}a{color:#174e78}a:focus{outline:3px solid #efb100;outline-offset:3px}</style></head>
<body><main><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p><p><a id="destination" href="${escapeHtml(canonical)}">Continue to carlocaprini.com</a></p></main>
<script>${script}</script></body></html>`;

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, ".nojekyll"), "");

for (const route of manifest.routes) {
  const destination = new URL(route, manifest.canonical_origin).href;
  const html = shell({
    title: "This page has moved — Carlo Caprini",
    canonical: destination,
    heading: "This page has moved",
    message: "Carlo Caprini's site now lives at carlocaprini.com. You will be redirected automatically.",
    script: `const target=new URL(${JSON.stringify(destination)});target.search=location.search;target.hash=location.hash;document.getElementById("destination").href=target.href;location.replace(target.href);`
  }).replace("<title>", `<meta http-equiv="refresh" content="0; url=${escapeHtml(destination)}"><title>`);
  const directory = route === "/" ? output : path.join(output, route.slice(1));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), html);
}

const notFoundDestination = `${manifest.canonical_origin}/`;
const notFound = shell({
  title: "Page moved — Carlo Caprini",
  canonical: notFoundDestination,
  heading: "This page may have moved",
  message: "Try the same address on carlocaprini.com, or use the link below.",
  robots: '<meta name="robots" content="noindex,follow">',
  script: `const target=new URL(${JSON.stringify(manifest.canonical_origin)});target.pathname=location.pathname;target.search=location.search;target.hash=location.hash;document.getElementById("destination").href=target.href;location.replace(target.href);`
});
fs.writeFileSync(path.join(output, "404.html"), notFound);

for (const file of ["feed.xml", "googlec7e995389ae6b3dd.html"]) {
  fs.copyFileSync(path.join(root, "legacy", file), path.join(output, file));
}
const oldUrls = manifest.routes.map((route) => new URL(route, manifest.legacy_origin).href);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${oldUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(output, "sitemap.xml"), xml);
fs.writeFileSync(path.join(output, "sitemap-static.xml"), xml);
fs.writeFileSync(path.join(output, "sitemap.txt"), `${oldUrls.join("\n")}\n`);
fs.writeFileSync(path.join(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${manifest.legacy_origin}/sitemap.xml\n`);
