# Visual Reference

This directory is a compact visual description of the intended current site. It helps humans and repository-aware agents inspect representative layouts and responsive states without inferring the result from Liquid and CSS or visiting production.

It is documentation, not a second visual-regression suite. The regression fixtures under `tests/browser/` answer whether a protected surface changed unexpectedly; these images answer what the current site looks like and should be updated deliberately in the same pull request as a relevant UI or content change.

## Generation

Build the production site, then generate every configured reference from that local `_site` output:

```bash
JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter
npm run visual-reference:generate
```

The generator uses the pinned Playwright Chromium version, denies analytics consent, avoids external font requests, disables animation and captures lossless full-page WebP files. It fails when a configured route does not return a successful response.

Structural integrity can be checked without a site build or browser:

```bash
bin/check visual-docs
```

This validates both full-page and Article Topic-motif manifests, required files, image encodings and viewport widths. It deliberately does not re-render pages or compare encoded WebP bytes. Ordinary pull-request CI therefore does not reject unrelated work because documentation captures differ byte-for-byte or have not been regenerated.

For deliberate same-machine diagnostics, build the site and explicitly render-compare every full-page reference:

```bash
npm run visual-reference:compare
```

Article Topic motif references have equivalent `topic-motif-reference:generate`, `topic-motif-reference:verify` and `topic-motif-reference:compare` commands. Generation and comparison retain semantic motif checks in addition to screenshots.

Routes, descriptions and viewport membership live only in [`manifest.json`](manifest.json). The canonical viewports are desktop (1440 × 900), portrait tablet (834 × 1112) and mobile (390 × 844). Full-page capture makes page density and section order visible; the viewport height still controls the responsive state.

## Surfaces

### Home — main discovery-oriented landing page

- [Desktop](home/desktop.webp)
- [Portrait tablet](home/tablet.webp)
- [Mobile](home/mobile.webp)

### Thinking — discovery and note index

- [Desktop](thinking/desktop.webp)
- [Mobile](thinking/mobile.webp)

### Explore — curated Questions and topic entry points

- [Desktop](explore/desktop.webp)
- [Mobile](explore/mobile.webp)

### Question detail — representative Question path

- [Desktop](question-detail/desktop.webp)
- [Mobile](question-detail/mobile.webp)

### Experience — evidence and career context

- [Desktop](experience/desktop.webp)
- [Mobile](experience/mobile.webp)

### Work — Product & Engineering proposition

- [Desktop](work/desktop.webp)
- [Portrait tablet](work/tablet.webp)
- [Mobile](work/mobile.webp)

### 404 — missing-page recovery

- [Desktop](404/desktop.webp)
- [Portrait tablet](404/tablet.webp)
- [Mobile](404/mobile.webp)

### Standard article — representative standalone Thinking note

- [Desktop](standard-article/desktop.webp)
- [Portrait tablet](standard-article/tablet.webp)
- [Mobile](standard-article/mobile.webp)

### AI-series article — representative article with contextual navigation

- [Desktop](ai-series-article/desktop.webp)
- [Portrait tablet](ai-series-article/tablet.webp)
- [Mobile](ai-series-article/mobile.webp)

### Product-series article — representative Product Judgment episode

- [Desktop](product-series-article/desktop.webp)
- [Portrait tablet](product-series-article/tablet.webp)
- [Mobile](product-series-article/mobile.webp)

### Product series — decision-loop series landing

- [Desktop](product-series/desktop.webp)
- [Portrait tablet](product-series/tablet.webp)
- [Mobile](product-series/mobile.webp)

### AI series — series landing

- [Desktop](ai-series/desktop.webp)
- [Portrait tablet](ai-series/tablet.webp)
- [Mobile](ai-series/mobile.webp)

## Maintenance

Regenerate the collection when an intentional change materially affects one of these surfaces. Review every changed image and commit it with the change; CI must never write screenshot commits back to `main`. Keep the matrix curated: add a surface only when it represents a genuinely different layout or responsive decision. Do not update screenshots merely to silence a failure.
