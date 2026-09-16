# External sitemap delivery

## Architecture and responsibility

Jekyll and `jekyll-sitemap` remain the only sitemap generator. A production build writes the canonical artifact to `_site/sitemap.xml`; the external delivery flow validates that file, generates a JavaScript module containing its exact bytes, and bundles that module into the dedicated `carlo-site-sitemap` Cloudflare Worker.

The public website remains on GitHub Pages at `https://carlocaprini.github.io`. The Worker serves only the sitemap and the static Google Search Console ownership file; it has no route for ordinary pages. It never proxies GitHub Pages, GitHub APIs, raw repository content, or another sitemap endpoint at runtime. The definitive external endpoint is the `external_sitemap_url` value in `_config.yml`; that value is rendered into `robots.txt` and validated before packaging.

The generated modules under `worker/generated/` are ignored by Git. They are recreated from `_site/sitemap.xml` and the committed file under `worker/verification/` for every check and deployment. Packaging validates the ownership filename and token, strips only a trailing editor newline, and serves the exact verification line supplied by Google. This prevents a second manually maintained URL-discovery implementation while keeping the ownership proof stable for Google's periodic reverification.

## Local validation and development

Build the production Jekyll artifact, validate it, package the Worker, run its unit tests, and perform a Wrangler dry-run:

```bash
bin/check generated
bin/check sitemap
```

Start the Worker locally after a production build:

```bash
npm run sitemap:dev
```

In another terminal, exercise only the local endpoint:

```bash
curl -i http://127.0.0.1:8788/sitemap.xml
curl -i http://127.0.0.1:8788/googlec7e995389ae6b3dd.html
curl -i http://127.0.0.1:8788/foo
```

These commands do not need the public website or any runtime network dependency. `GET /sitemap.xml` returns the packaged XML with `Content-Type: application/xml; charset=utf-8` and `Cache-Control: public, max-age=3600`; unknown paths return a plain-text `404`.

## CI and deployment

Pull requests build the production site once, then the Sitemap Worker job downloads that exact `_site` artifact and runs `bin/check sitemap`. It validates sitemap protocol and canonical-host rules, compares the packaged body byte-for-byte with the Jekyll artifact, tests Worker behavior, and runs `wrangler deploy --dry-run`. Pull requests never deploy the Worker.

On pushes to `main` and manual production workflow runs, GitHub Pages deploys only after the Sitemap Worker gate and the other blocking checks pass. The sitemap deployment job then downloads the same generated-site artifact, repeats the sitemap gate, packages it, and runs Wrangler deployment. A failed site build, sitemap validation, Worker test, dry-run, Pages deployment, or production upload leaves the last successfully deployed external sitemap in place.

For an authorized manual deployment from a clean production build:

```bash
npm run sitemap:deploy
```

Do not deploy a generated module from a different repository state than the site artifact.

## Cloudflare setup and permissions

The Worker uses the existing Cloudflare account and its existing `workers.dev` account subdomain. The repository config explicitly enables `workers_dev` and declares no custom route or domain.

Set these GitHub Actions repository or environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`: the existing account ID;
- `CLOUDFLARE_API_TOKEN`: a token restricted to that account.

The minimum intended token scope is Account / Workers Scripts / Edit plus Account / Account Settings / Read. No zone permission is required because the Worker uses no custom-domain route. Do not add KV, R2, D1, Queues, Durable Objects, DNS, or Workers Routes permissions. If an existing CI token already has the required account-scoped permissions, reuse it rather than creating a broader token.

The account must already have its `workers.dev` subdomain enabled. The existing analytics Worker URL in `_config.yml` indicates that this account-level setup exists; if deployment reports otherwise, configure the account subdomain manually in Cloudflare and keep the endpoint in `_config.yml` synchronized. No custom domain is needed.

## Zero-cost guardrail

| Property | Configuration |
| --- | --- |
| Worker type | Standard module Worker on `workers.dev` |
| Runtime bindings | None |
| Persistent storage | None |
| Database | None |
| Scheduled work | None |
| Custom domain | None |
| Expected traffic | Sitemap crawler requests only; negligible relative to the Free daily allowance |
| Mandatory recurring cost | **€0/month** |

Keep the account on Workers Free for this experiment. Cloudflare currently documents 100,000 Worker requests per day and 10 ms CPU per invocation on Free; exceeding the daily request limit fails requests instead of creating usage charges. The Worker performs only URL matching and returns an in-bundle string, so it needs no paid capability. If the account is deliberately moved to Workers Paid, that account-level choice can enable billable overages, but it is not required by this implementation. Recheck the official [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [limits](https://developers.cloudflare.com/workers/platform/limits/) before changing the runtime architecture.

## Search Console ownership and diagnostic experiment

Google Search Console scopes sitemap submission to a property. Because the sitemap is hosted on `workers.dev`, the same Google account must own both URL-prefix properties before Google can accept URLs from the GitHub Pages property in a sitemap submitted under the Worker property.

After deploying the ownership file:

1. Confirm the Worker name and `workers.dev` URL from the successful Wrangler/GitHub Actions deployment output and the `external_sitemap_url` value in `_config.yml`. Do not crawl the public website as part of this confirmation.
2. In Search Console, open the URL-prefix property `https://carlo-site-sitemap.carlo-site-aggregate-analytics.workers.dev/`.
3. Choose the HTML-file verification method and verify `https://carlo-site-sitemap.carlo-site-aggregate-analytics.workers.dev/googlec7e995389ae6b3dd.html`. Keep this file deployed: Google checks ownership periodically.
4. Confirm that the same Google account still owns the existing URL-prefix property `https://carlocaprini.github.io/`.
5. While the Worker property is selected, open **Sitemaps** and submit `sitemap.xml`. Do not submit the external URL from the GitHub Pages property: Search Console rejects a sitemap host outside that property's prefix before ownership of the sitemap host is established.
6. Keep the existing GitHub-hosted `/sitemap.xml` submitted during the experiment. `robots.txt` also retains `/sitemap.txt` as an additional diagnostic endpoint.
7. Record the submission date, status, Last read value, and discovered-page count below or in the private operational record.

| Submission date | Endpoint | Status | Last read | Discovered pages |
| --- | --- | --- | --- | --- |
| 2026-09-16 | `https://carlo-site-sitemap.carlo-site-aggregate-analytics.workers.dev/sitemap.xml` | Success | 2026-09-16 | 32 |

This successful read used the deployed sitemap before the privacy-page exclusion. The next production deployment is expected to contain 31 URLs; that count change is intentional and does not alter the delivery experiment.

The product-level experiment succeeds only after Search Console reports `Success`, a valid Last read value, and more than zero discovered pages. Until then, retain all three advertised sitemap delivery paths and do not redirect or proxy between them.
