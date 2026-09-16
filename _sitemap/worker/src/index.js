import { sitemapSha256, sitemapXml } from "../generated/sitemap.js";
import { siteVerificationFiles } from "../generated/site-verification.js";

const sitemapHeaders = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "application/xml; charset=utf-8",
  ETag: `"${sitemapSha256}"`,
};

const notFoundHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

const verificationHeaders = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "text/html; charset=utf-8",
};

export default {
  fetch(request) {
    const url = new URL(request.url);
    const readableRequest = request.method === "GET" || request.method === "HEAD";
    const sitemapRequest = url.pathname === "/sitemap.xml" && readableRequest;

    if (sitemapRequest) {
      return new Response(request.method === "HEAD" ? null : sitemapXml, {
        status: 200,
        headers: sitemapHeaders,
      });
    }

    if (readableRequest && Object.hasOwn(siteVerificationFiles, url.pathname)) {
      return new Response(request.method === "HEAD" ? null : siteVerificationFiles[url.pathname], {
        status: 200,
        headers: verificationHeaders,
      });
    }

    return new Response(request.method === "HEAD" ? null : "Not found\n", {
      status: 404,
      headers: notFoundHeaders,
    });
  },
};
