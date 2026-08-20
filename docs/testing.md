# Testing and verification

`bin/check` is the repository-owned interface used by humans, agents and CI. Run commands from the repository root.

## Commands

| Command | Purpose | Main prerequisites |
| --- | --- | --- |
| `bin/check source` | Ruby syntax, validator mutation fixtures and source contracts | Ruby |
| `bin/check generated` | Production Jekyll build plus generated-site validation | Ruby; local Bundler/Jekyll or Docker |
| `bin/check analytics` | Generated contract freshness, browser/Worker contract and unit tests | Node dependencies |
| `bin/check analytics-integration` | Browser → Worker → disposable D1 path | Node dependencies, Chromium |
| `bin/check infrastructure` | Docker Compose configuration | Docker |
| `bin/check browser` | Broad Chromium behavior on desktop, mobile and portrait tablet | built `_site`, Chromium |
| `bin/check webkit` | Focused Safari-like smoke paths | built `_site`, WebKit |
| `bin/check visual-regression` | Curated component/page screenshot assertions | built `_site`, Chromium |
| `bin/check visual-reference` | Deterministically compares full-page documentation with committed images | built `_site`, Chromium |
| `bin/check visual` | Visual regression plus Visual Reference freshness | built `_site`, Chromium |
| `bin/check all` | Closest practical local equivalent of the merge gate | all of the above |

`generated` uses the local Bundler/Jekyll environment when available and otherwise falls back to the project’s `site` container. Run `npm ci` before Node/browser checks and install browsers with `npx playwright install chromium webkit`. Browser commands reuse an existing compatible server or start the repository static server for `_site`.

`bin/check all` cannot reproduce GitHub Pages permissions, deployment credentials or Actions artifact transfer. It does run the same repository-owned test commands as the focused CI jobs against one local build.

## Change matrix

| Change | Minimum iteration check | Before completion |
| --- | --- | --- |
| Note/front matter/taxonomy | `source` | `generated`; browser when presentation changes |
| Question or curated list | `source` | `generated` and relevant browser flow |
| Layout/include | `generated` | `browser`, `webkit`, `visual` |
| CSS | relevant browser project | `browser`, `webkit`, `visual` |
| Analytics contract/runtime | `analytics` | `analytics-integration` and privacy browser paths |
| CI/check scripts | affected command | `all` where prerequisites exist, then complete CI |

## CI mapping

The `Site checks` workflow keeps independent jobs for fast feedback:

- Validate site → `bin/check source`, then `bin/check generated` and upload `_site`.
- Analytics → `bin/check analytics` and `bin/check analytics-integration`.
- Infrastructure → `bin/check infrastructure`.
- Chromium/WebKit/Visual → the matching browser command after downloading the same generated artifact.

Draft pull requests do not run the expensive gate. Marking a PR ready triggers it. Deployment waits for every blocking job.

## Browser-test ownership

Chromium behavioral specs are named by domain:

- `routes.spec.js` owns sitemap-derived public-route integrity and overflow.
- `navigation.spec.js` owns primary/mobile navigation and legacy-route behavior.
- `editorial-journeys.spec.js` owns Home, Thinking, Explore, Questions and Influences paths.
- `responsive.spec.js` owns breakpoint-dependent interaction and visibility.
- `accessibility.spec.js` owns focused keyboard/focus basics; it is not a complete accessibility audit.
- `analytics.spec.js` and `privacy-analytics.spec.js` own browser instrumentation, consent and local-safety behavior.
- `series.spec.js` owns Series context, episode navigation and motion behavior.

`support/site-test.js` contains only the shared runtime-error/font fixture and analytics-event capture primitive. `webkit-smoke.spec.js` and `visual.spec.js` are selected by dedicated Playwright projects and must not import the full Chromium inventory.

## Visual updates

Visual-regression fixtures detect unexpected pixels. Visual Reference is navigable documentation. For an intentional rendered change:

1. build with `bin/check generated`;
2. update regression baselines only after inspection;
3. run `npm run visual-reference:generate`;
4. inspect every changed WebP;
5. run `bin/check visual`.

Do not update screenshots merely to silence a failure.
