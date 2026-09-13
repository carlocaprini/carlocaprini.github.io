import { sitemapSha256, sitemapXml } from "../generated/sitemap.js";

const sitemapHeaders = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "application/xml; charset=utf-8",
  ETag: `"${sitemapSha256}"`,
};

const notFoundHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

export default {
  fetch(request) {
    const url = new URL(request.url);
    const sitemapRequest = url.pathname === "/sitemap.xml" && (request.method === "GET" || request.method === "HEAD");

    if (sitemapRequest) {
      return new Response(request.method === "HEAD" ? null : sitemapXml, {
        status: 200,
        headers: sitemapHeaders,
      });
    }

    return new Response(request.method === "HEAD" ? null : "Not found\n", {
      status: 404,
      headers: notFoundHeaders,
    });
  },
};
