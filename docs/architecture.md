# Architecture

## Build and delivery

Jekyll source lives in collections, `pages/`, `_data/`, `_layouts/` and `_includes/`. `assets/` contains browser CSS, JavaScript and media. Jekyll emits `_site/`, which is generated output and must never be edited manually.

GitHub Actions builds the production site once. Source and generated validators run around that build, then the exact `_site` artifact is shared with independent Chromium, WebKit, visual-regression and Sitemap Worker jobs. Deployment can run only after every blocking category succeeds.

The production page loads a single site stylesheet and small unbundled browser scripts. Canonical CSS rules live in the stable domain files under `_includes/styles/`; `assets/css/main.css` is a small Jekyll composition entry point. `_includes` prevents source modules from leaking as separately served assets. There is no client application framework, CSS runtime import or new asset bundler.

Large Liquid responsibilities are extracted only when they form a stable semantic unit. The Article context rail has an explicit include interface. Structured data keeps one entry point from the document head and delegates to schema-oriented partials under `_includes/structured-data/`. Home, Thinking, Explore and Work remain readable layouts because their single-use sections are already locally grouped; splitting every section would add indirection without independent ownership.

## Analytics boundary

`contracts/analytics.json` owns semantic events and campaign vocabulary. A generator produces browser and Worker representations; those generated files are checked for drift and never edited directly.

The browser has two distinct destinations:

- GA4 receives semantic behavior only after explicit analytics consent and only on the canonical production origin.
- The optional Cloudflare Worker receives deliberately coarse, non-identifying counters. It stores aggregate daily data in D1.

Both are disabled in ordinary local development. The Worker implementation and private reporting workflow live under `_analytics/`; `_analytics/README.md` is the operational owner.

Cross-system measurement configuration and review templates live under `_analytics/measurement/`. They keep GA4 reporting, aggregate counters and private professional outcomes separate. Completed evidence packages and conversation records remain outside the public repository and are never joined to analytics identities.

## Validation layers

`scripts/validate_source.rb` checks canonical repository relationships without Jekyll. `scripts/validate_site.rb` checks the deployable output. Shared parsing mechanics live in `scripts/lib/validation.rb`; business rules stay with their owning layer. Mutation fixtures prove important rules actually fail. See `docs/validation.md`.

## Visual protection

Playwright covers Chromium behavior, a focused WebKit smoke path and curated visual-regression fixtures. `visual-reference/` is separate, versioned full-page documentation generated deterministically from representative routes. Article Topic motifs add dedicated Balanced/Spatial, responsive and grayscale references; the local visual gate compares rendered pixels, while CI checks their platform-neutral source fingerprint. Visual references are updated only when a rendered change is intentional and reviewed.

## Sitemap controls

`jekyll-sitemap` owns the canonical `/sitemap.xml`. During the delivery diagnostic, `robots.txt` advertises the GitHub-hosted XML, the existing text-equivalent `/sitemap.txt`, and the external URL held in `_config.yml` as `external_sitemap_url`. `/sitemap-static.xml` remains an unadvertised minimal diagnostic control.

The dedicated `carlo-site-sitemap` Cloudflare Worker is a delivery layer only. After the production Jekyll build passes validation, its packaging script embeds the exact `_site/sitemap.xml` bytes into the Worker bundle. It has no storage or bindings and never proxies GitHub Pages at request time. GitHub Pages remains the public website host, every sitemap `<loc>` remains canonical to `https://carlocaprini.github.io`, and the two XML delivery paths coexist without redirects. See `_sitemap/README.md` for deployment, zero-cost and Search Console operations.

The root `404.html` is a Jekyll page using the global shell. It is explicitly `noindex, follow` and excluded from both sitemap outputs; generated validation treats noindex pages as intentionally outside the canonical sitemap. Local preview and deployment both serve Jekyll output instead of an environment-specific error screen. An unknown local path returns the exact local `_site/404.html` document with status `404`; deployment publishes the production build of the same source page. Environment-only analytics attributes and asset cache-busters may differ, but the visible recovery content, shell and routing behavior do not.

## RSS controls

The root `feed.xml` is the sole RSS owner. It emits one complete, full-content RSS 2.0 feed at `/feed.xml` from every published `layout: article` Thinking page; `jekyll-feed` is intentionally neither configured nor installed because Thinking is modeled as pages rather than `_posts`. The invariant is: **Thinking article model owns publication; RSS consumes it.** There is no feed manifest, RSS-specific summary or manual item list.

The production build makes the publication boundary concrete. Generated validation derives the expected set from the article pages actually emitted under `/thinking/`, then requires exact equality with feed item URLs and checks canonical links, stable permalink GUIDs, original publication dates, editorial ordering, full rendered content, absolute internal URLs and channel metadata. `lastBuildDate` is the newest `last_modified_at || date` across included notes, so non-editorial builds do not change feed freshness. A literal `]]>` in rendered content is split safely across adjacent CDATA sections by the template.

RSS autodiscovery is global in `_includes/head.html`; the global footer links to the same `/feed.xml` endpoint. Generated validation protects both on every HTML page. Publishing a note therefore requires only valid Thinking front matter and inclusion in the canonical Thinking index: the production build creates the RSS item and CI verifies it without an RSS-specific edit.
