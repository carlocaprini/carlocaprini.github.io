# Repository operating map

This public repository is a redirect-only compatibility layer for the former GitHub Pages site. The canonical site lives at `https://carlocaprini.com`. Keep this repository minimal, deterministic, public-safe, and independent from the canonical site's source repository.

## Canonical sources

- Route inventory and origin contract: `legacy/routes.json`.
- Initial/last-known valid RSS payload: `legacy/feed.xml`.
- Preserved ownership verification: `legacy/googlec7e995389ae6b3dd.html`.
- Static generator: `scripts/build_legacy_site.mjs`.
- Feed validation and atomic refresh: `scripts/lib/legacy_feed.rb` and `scripts/refresh_feed.rb`.
- CI, Pages deployment, and scheduled feed refresh: `.github/workflows/`.

Never edit `_site`; it is generated and ignored. Do not add editorial content, canonical-site layouts or assets, tracking, cookies, consent code, secrets, private repository identifiers, or cross-repository write automation.

## Change map

- Route addition/removal: reconcile the canonical public path, edit `legacy/routes.json`, run `bin/check source`, then `bin/check generated` and `bin/check browser`.
- Redirect behavior or markup: edit `scripts/build_legacy_site.mjs`, preserve the fixed destination origin and accessible fallback, then run `bin/check generated` and `bin/check browser`.
- Feed behavior: edit the Ruby feed code and tests; preserve atomic replacement and last-valid deployment semantics; run `bin/check source` and `bin/check generated`.
- Workflows: retain repository-level `contents: read`; grant `pages: write` and `id-token: write` only to deploy jobs; publish only the validated artifact.

Before completion run `bin/check all` when prerequisites are available. Inspect the full diff for canonical content, private references, credentials, tracking code, and accidentally restored legacy runtime files.

## Release boundary

Use branches and pull requests. A merge to `main` may deploy this compatibility artifact to GitHub Pages, but it never authorizes domain, DNS, canonical hosting, analytics, or search-console changes. Preserve the annotated rollback tag `pre-cloudflare-cutover-2026-10-21`; rollback is a history-preserving restore commit through a pull request, never a reset or force-push.
