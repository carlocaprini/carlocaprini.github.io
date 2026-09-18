# Testing and verification

`bin/check` is the repository-owned interface used by humans, agents and CI. Run commands from the repository root.

## Commands

| Command | Purpose | Main prerequisites |
| --- | --- | --- |
| `bin/check source` | Ruby syntax, validator mutation fixtures and source contracts | Ruby |
| `bin/check generated` | Production Jekyll build plus generated-site validation | Ruby; local Bundler/Jekyll or Docker |
| `bin/check sitemap` | Sitemap protocol/origin validation, static packaging, Worker tests and Wrangler dry-run | built `_site`, Ruby, Node dependencies |
| `bin/check analytics` | Generated contract freshness, browser/Worker contract, reporting periods and measurement-operation tests | Node dependencies |
| `bin/check analytics-integration` | Browser → Worker → disposable D1 path | Node dependencies, Chromium |
| `bin/check infrastructure` | Docker Compose configuration | Docker |
| `bin/check browser` | Broad Chromium behavior on desktop, mobile and portrait tablet | built `_site`, Chromium |
| `bin/check webkit` | Focused Safari-like smoke paths | built `_site`, WebKit |
| `bin/check visual-regression` | Blocking screenshot regression on curated production-representative surfaces | built `_site`, Chromium |
| `bin/check visual-docs` | Structural integrity of full-page and Topic-motif visual documentation | Node.js |
| `bin/check visual` | Backward-compatible alias for `visual-regression` | built `_site`, Chromium |
| `bin/check all` | Closest practical local equivalent of the merge gate, including visual regression but not visual-documentation freshness | merge-gate prerequisites |

`generated` uses the local Bundler/Jekyll environment when available and otherwise falls back to the project’s `site` container. Run `npm ci` before Node/browser checks and install browsers with `npx playwright install chromium webkit`. Browser commands reuse an existing compatible server or start the repository static server for `_site`.

`bin/check all` cannot reproduce GitHub Pages permissions, deployment credentials or Actions artifact transfer. It does run the same repository-owned test commands as the focused CI jobs against one local build. It intentionally does not regenerate or render-compare visual documentation.

## Change matrix

| Change | Minimum iteration check | Before completion |
| --- | --- | --- |
| Note/front matter/taxonomy | `source` | `generated`; browser when presentation changes |
| Question or curated list | `source` | `generated` and relevant browser flow |
| Layout/include | `generated` | `browser`, `webkit`, `visual-regression`; regenerate affected visual documentation when the rendered design materially changes |
| CSS | relevant browser project | `browser`, `webkit`, `visual-regression`; regenerate affected visual documentation when the rendered design materially changes |
| Analytics contract/runtime | `analytics` | `analytics-integration` and privacy browser paths |
| Sitemap delivery | `sitemap` | `generated`, `sitemap`, then complete CI |
| CI/check scripts | affected command | `all` where prerequisites exist, then complete CI |

## CI mapping

The `Site checks` workflow keeps independent jobs for fast feedback:

- Validate site → `bin/check source`, then `bin/check generated` and upload `_site`.
- Analytics → `bin/check analytics` and `bin/check analytics-integration`.
- Infrastructure → `bin/check infrastructure`.
- Sitemap Worker → download the same generated artifact, then `bin/check sitemap`; pull requests stop after the dry-run.
- Chromium/WebKit/Visual regression → the matching browser command after downloading the same generated artifact.

On production runs, GitHub Pages waits for the Sitemap Worker check alongside every other blocking category. The external Worker deployment starts only after Pages succeeds, downloads the same `_site` artifact, repeats the sitemap gate, and then deploys with account-scoped Cloudflare credentials.

Draft pull requests do not run the expensive gate. Marking a PR ready triggers it. Deployment waits for every blocking job.

## Browser-test ownership

Chromium behavioral specs are named by domain:

- `routes.spec.js` owns sitemap-derived public-route integrity and overflow.
- `navigation.spec.js` owns primary/mobile navigation and legacy-route behavior.
- `editorial-journeys.spec.js` owns Home, Thinking, Explore, Questions, Influences and the Work proposition.
- `responsive.spec.js` owns breakpoint-dependent interaction and visibility.
- `accessibility.spec.js` owns focused keyboard/focus basics; it is not a complete accessibility audit.
- `analytics.spec.js` and `privacy-analytics.spec.js` own browser instrumentation, consent and local-safety behavior.
- `not-found.spec.js` owns the generated 404 recovery page, its non-indexable metadata, removable inline motif, real unknown-route fallback and onward routes.
- `series.spec.js` owns Series context, episode navigation and motion behavior.

`support/site-test.js` contains only the shared runtime-error/font fixture and analytics-event capture primitive. `webkit-smoke.spec.js` and `visual.spec.js` are selected by dedicated Playwright projects and must not import the full Chromium inventory.

The repository static server and Docker development both serve `_site` directly rather than Jekyll's development error screen. A nonexistent local path returns the exact local `/404.html` body with status `404`; browser coverage opens clearly nonexistent routes and compares the response with that artifact so the fallback cannot silently regress. CI repeats the browser contract against its production-built `_site` artifact. Production-only analytics attributes and build-time asset cache-busters are intentionally outside byte-for-byte parity, while the visible recovery experience and HTTP missing-page status remain the same.

## Visual testing responsibilities

### Visual regression

The curated Playwright suite in `tests/browser/visual.spec.js` detects unexpected rendered changes on production-representative surfaces. It is browser-rendered, compares screenshots, runs in pull-request CI and blocks deployment. `bin/check visual-regression` is the canonical command; `bin/check visual` is only an alias. Keep the suite intentionally small: add a screenshot for a genuinely new rendering model such as a top-level layout, article type or materially different responsive component, not for another route using an existing layout.

The tests use fixed viewports, deny analytics consent, wait for the repository-owned Inter font and visible images, and disable animation and transitions before capture. The site and tests load the same versioned WOFF2 asset, so runner font availability cannot silently select a different primary typeface. Platform-specific Darwin and Linux baselines remain deliberate for the remaining browser rasterization differences. Screenshot comparisons stay strict; do not add broad pixel tolerances to mask failures.

### Visual Reference

`visual-reference/` is navigable, full-page design documentation for humans and repository-aware agents. It is committed and deliberately regenerated, but it is not a second merge gate. `bin/check visual-docs` verifies the manifest, viewport relationships, required files, supported image encoding and dimensions without building Jekyll or launching a browser. It does not claim that committed images match the latest rendering.

The separate `Visual documentation` GitHub Actions workflow exposes the same structural check through `workflow_dispatch`. It is manual, has no pull-request trigger and is not a deployment dependency. Its purpose is to detect verifier or documentation-structure rot on demand without restoring documentation freshness to the merge gate.

Use `npm run visual-reference:generate` when an intentional change materially alters a documented surface. `npm run visual-reference:compare` is an opt-in same-machine diagnostic that renders every configured page and performs a strict byte comparison; it is not part of `bin/check all` or pull-request CI.

### Article Topic motif reference

`visual-reference/article-topic-motifs/` documents Balanced and Spatial compositions, responsive crops, all Topic families and grayscale distinctions. It is design/reference material, not a generic merge gate. `bin/check visual-docs` validates its manifest and committed image structure without a site build or browser. The reference manifest has no source fingerprint: predicted staleness does not substitute for an actual visual regression.

`npm run topic-motif-reference:generate` deliberately builds both variants and keeps the useful rendered semantic checks for Topic, variant, motif family, color relationship, accessibility, pointer behavior and horizontal overflow. `npm run topic-motif-reference:compare` repeats that generation in a temporary location and strictly compares the result with committed references for explicit design diagnostics. Neither command runs in ordinary CI.

## Intentional visual changes

Use this sequence when rendered output is expected to change:

1. build `_site` with `bin/check generated`;
2. run `bin/check visual-regression` and inspect the screenshot diff;
3. if the change is intended, update only the affected Playwright baselines;
4. rerun `bin/check visual-regression`;
5. if a documented surface materially changed, run the relevant `npm run visual-reference:generate` or `npm run topic-motif-reference:generate` command;
6. inspect every changed documentation image before committing it;
7. run `bin/check visual-docs` to verify documentation structure.

Do not update snapshots merely to silence a failure. Metadata, SEO, analytics, sitemap and backend-only changes do not require Visual Reference regeneration when rendered output is unchanged.

Generated-site validation also enforces one canonical local stylesheet link per page. This protects the build-time CSS composition from accidentally becoming multiple runtime requests or omitting `main.css`; visual checks protect rule order and rendered equivalence.
