# Architecture

## Build and delivery

Jekyll source lives in collections, `pages/`, `_data/`, `_layouts/` and `_includes/`. `assets/` contains browser CSS, JavaScript and media. Jekyll emits `_site/`, which is generated output and must never be edited manually.

GitHub Actions builds the production site once. Source and generated validators run around that build, then the exact `_site` artifact is shared with independent Chromium, WebKit and visual-regression jobs. Deployment can run only after every blocking category succeeds.

The production page loads a single site stylesheet and small unbundled browser scripts. There is no client application framework. Keep runtime dependencies and build composition simple.

## Analytics boundary

`contracts/analytics.json` owns semantic events and campaign vocabulary. A generator produces browser and Worker representations; those generated files are checked for drift and never edited directly.

The browser has two distinct destinations:

- GA4 receives semantic behavior only after explicit analytics consent and only on the canonical production origin.
- The optional Cloudflare Worker receives deliberately coarse, non-identifying counters. It stores aggregate daily data in D1.

Both are disabled in ordinary local development. The Worker implementation and private reporting workflow live under `_analytics/`; `_analytics/README.md` is the operational owner.

## Validation layers

`scripts/validate_source.rb` checks canonical repository relationships without Jekyll. `scripts/validate_site.rb` checks the deployable output. Shared parsing mechanics live in `scripts/lib/validation.rb`; business rules stay with their owning layer. Mutation fixtures prove important rules actually fail. See `docs/validation.md`.

## Visual protection

Playwright covers Chromium behavior, a focused WebKit smoke path and curated visual-regression fixtures. `visual-reference/` is separate, versioned full-page documentation generated deterministically from representative routes. It is updated only when a rendered change is intentional and reviewed.

## Sitemap controls

`jekyll-sitemap` owns `/sitemap.xml`; `/sitemap.txt` is the text equivalent. `/sitemap-static.xml` is a deliberately minimal diagnostic control, not a second canonical sitemap. If Search Console retrieves the control but not the canonical sitemap, investigate generated content or cached state. If neither is retrievable, investigate the exact Search Console property or Google retrieval rather than adding another generator.
