# carlocaprini.github.io legacy compatibility

This repository is the compatibility layer for links previously published under `https://carlocaprini.github.io`. The complete site is served from `https://carlocaprini.com`; this repository intentionally contains no editorial source, site presentation, analytics runtime, cookies, or application assets.

## Redirect contract

`legacy/routes.json` is the versioned route manifest. It records the reconciled public route set and the fixed canonical origin. `scripts/build_legacy_site.mjs` produces:

- one minimal HTML redirect document for every known route;
- an accessible visible fallback link;
- an immediate meta refresh and a canonical link;
- a small fixed-origin script that preserves query parameters and fragments;
- a genuine `404.html` fallback that tries the same unknown path on the canonical origin;
- legacy sitemaps, robots policy, the Google verification file, and the RSS bridge.

Known redirect pages remain indexable so search engines can process the canonical relationship. Only the 404 document uses `noindex`. The redirect destination cannot be supplied by a query parameter or another external input.

## Development and pull requests

All changes use a branch and pull request. Update `legacy/routes.json` only after reconciling the public path with the canonical site. Run the narrow check while editing, then the complete gate:

```sh
bin/check source
bin/check generated
bin/check all
```

`bin/check generated` recreates `_site`; never edit `_site` directly. Pull requests validate source, generated output, desktop behavior, and mobile behavior. A merge to `main` publishes the exact validated `_site` artifact to GitHub Pages. Repository contents are read-only in CI; only the deployment job receives temporary Pages and identity permissions.

## Feed bridge

GitHub Pages continues to expose `/feed.xml`. The checked-in `legacy/feed.xml` is a valid initial canonical feed. Every six hours, and on manual dispatch, `.github/workflows/feed-bridge.yml` fetches only `https://carlocaprini.com/feed.xml`, verifies RSS 2.0 and canonical absolute URLs, rebuilds the complete compatibility artifact, and deploys it.

The replacement is atomic. A network, HTTP, XML, or URL validation failure stops the workflow before deployment, so the last valid Pages artifact remains live. The workflow does not commit generated feed changes to `main`.

## Release and rollback

Deployment is deliberately separate from DNS or canonical-site cutover. Merging a pull request changes only this repository and starts the GitHub Pages workflow; it does not modify domain configuration.

The complete pre-cutover public site is preserved by the annotated tag `pre-cloudflare-cutover-2026-10-21`. Restore it without rewriting history:

```sh
git switch main
git pull --ff-only
git switch -c restore/pre-cloudflare-cutover
git restore --source pre-cloudflare-cutover-2026-10-21 -- .
git add -A
git commit -m "Restore the pre-cutover GitHub Pages site"
git push -u origin restore/pre-cloudflare-cutover
```

Then open, review, and merge a normal pull request. Do not reset `main`, force-push, or delete the rollback tag.
