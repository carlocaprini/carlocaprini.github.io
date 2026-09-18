# Repository operating map

This is a Jekyll editorial site with a small browser runtime and an optional Cloudflare Worker for aggregate analytics. Preserve the simple build: edit canonical source, run the narrow check while iterating, then the complete relevant gate.

## Canonical sources

- Notes: `_thinking/*.md`; Influences: `_influences/*.md`.
- Topics: `_data/topics.yml`; Questions: `_data/questions.yml`; Series: `_data/series.yml` plus the relevant page/layout.
- Curated Home and Thinking selections: `_data/home.yml` and `pages/thinking.md`. These explicit lists are intentional editorial ordering, not disposable duplication.
- Work proposition: `pages/work.md`; presentation: `_layouts/work.html` and `_includes/styles/work.css`. Keep it selective and evidence-led; do not turn Thinking into a commercial funnel.
- Analytics and UTM vocabulary: `contracts/analytics.json`.
- External sitemap delivery: `_config.yml` owns `external_sitemap_url`; `_site/sitemap.xml` remains the generated canonical artifact and `_sitemap/worker/` owns static delivery.
- Visual rules: `docs/design-system.md`; CSS source is grouped by stable domain in `_includes/styles/` and composed by `assets/css/main.css`.
- Validation ownership: `docs/validation.md`.

Do not edit `_site/`. Do not edit either `analytics-contract.generated.js`; regenerate them with `npm run analytics:contract:generate`. Visual Reference images are versioned generated documentation; update them only through `npm run visual-reference:generate` after reviewing an intended rendered change.

## Change map

- Note/front matter/topic: edit the note and canonical data if needed; run `bin/check source`, then `bin/check generated` and relevant browser checks.
- Question reference or curated ordering: edit `_data/questions.yml`, `_data/home.yml` or `pages/thinking.md`; run `bin/check source` and `bin/check generated`.
- Analytics semantics: edit `contracts/analytics.json`, regenerate, then run `bin/check analytics`; use `bin/check analytics-integration` before completion.
- Sitemap delivery: build with `bin/check generated`, then run `bin/check sitemap`; never hand-edit or commit the generated Worker sitemap module.
- Layout/include/CSS: reuse the existing design system; edit the owning `_layouts`/`_includes` file and `_includes/styles/<domain>.css`, then run `bin/check generated`, `bin/check browser` and `bin/check visual-regression`.
- Visual Reference: it is deliberate design documentation, not a merge gate. When a change materially affects a documented surface, build first, run the relevant `npm run visual-reference:generate` or `npm run topic-motif-reference:generate` command, inspect every changed image, then run `bin/check visual-docs`.
- CI/scripts: run the affected `bin/check` command and `bin/check all` before completion when local prerequisites are available.

Browser contracts are organized by behavior under `tests/browser/`: `routes`, `navigation`, `editorial-journeys`, `responsive`, `accessibility`, `analytics`/`privacy-analytics`, and `series`. WebKit smoke and visual regression remain deliberately isolated. Put a new assertion with the behavior it protects; do not recreate a catch-all spec.

Common UI ownership: navigation/header/footer and shared primitives → `foundations.css`; Home → `home.css`; Thinking/Explore → `thinking-and-explore.css`; Work → `work.css`; Article → `_layouts/article.html`, `article-context-sidebar.html`, and `article.css`; Series/featured panels → `featured-and-series.css`; Experience/contact/privacy and responsive overrides have their correspondingly named modules. JSON-LD enters through `structured-data.html` and delegates by schema responsibility under `_includes/structured-data/`.

Never bypass source/generated or sitemap validation, analytics privacy boundaries, semantic event allowlists, responsive checks or deliberate editorial ordering to make a test pass.

## Read deeper

Start with `docs/architecture.md`, `docs/content-model.md` and `docs/testing.md`. Analytics operations belong in `_analytics/README.md`; visual decisions belong in `docs/design-system.md`. Keep these owners distinct rather than copying canonical lists into prose.
