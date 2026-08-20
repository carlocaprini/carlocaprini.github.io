# Aggregate site measurement

This directory contains the privacy-preserving measurement service for the public site.

The browser sends a fixed semantic payload to a Cloudflare Worker. The Worker validates it and increments one daily D1 counter. It does not store raw events, IP addresses, user agents, referrers, cookies, users, sessions or precise timestamps.

When a landing URL contains the complete canonical UTM tuple, the browser also sends one aggregate `campaign_landing` event. Missing, partial, duplicated or unknown UTM values are ignored and do not affect the normal page and interaction counters. Campaign attribution is limited to the landing page and is never persisted across navigation.

## Canonical UTM contract

[`contracts/analytics.json`](../contracts/analytics.json) is the machine-readable source of truth for event names, source/target types and the site distribution convention. `npm run analytics:contract:generate` deterministically produces the browser and Worker representations; do not edit the generated files. `npm run analytics:contract:check` fails when either representation is stale.

The table below explains the canonical combinations for humans. Runtime acceptance is derived from the contract rather than maintained independently in this document, the browser adapter or the Worker.

| Scenario | `utm_source` | `utm_medium` | `utm_campaign` | `utm_content` |
| --- | --- | --- | --- | --- |
| LinkedIn post | `linkedin` | `social` | Editorial initiative | `<content_key>_<format>` |
| LinkedIn comment | `linkedin` | `comment` | Editorial initiative | `comment` |
| LinkedIn Featured | `linkedin` | `profile` | `profile` | `featured` |
| LinkedIn About | `linkedin` | `profile` | `profile` | `about` |
| Medium article | `medium` | `referral` | Editorial initiative | `article` |
| Newsletter | `newsletter` | `email` | `monthly_updates` | `article` |
| Manual sharing | `manual` | `direct` | Editorial initiative | `shared_link` |
| QR code | `qr` | `offline` | Editorial initiative | `qr` |

Allowed editorial initiatives are `thinking`, `building_my_ai_operating_system`, `experience` and `explore`. The profile and newsletter scenarios use the dedicated campaign values `profile` and `monthly_updates`.

For LinkedIn posts, `<format>` is one of `text_post`, `single_image` or `carousel`. For example:

```text
utm_source=linkedin
utm_medium=social
utm_campaign=building_my_ai_operating_system
utm_content=episode_05_single_image
```

Do not add UTM tags to internal site navigation or Google Search links. Do not use `utm_term`, recipient-specific values, private August identifiers, sensitive strategy names or advertising click identifiers. Manually shared links must remain identical across recipients and campaign counters must not be joined to contact or qualitative-attribution records.

The website adapter is inactive until `aggregate_analytics_endpoint` is set in `_config.yml`. Local and file previews remain inactive unless the dedicated `_config.analytics-local.yml` configuration is explicitly loaded. Even then, the adapter accepts only a loopback HTTP endpoint whose path is exactly `/v1/measure`.

## Local verification

Unit tests use a fake D1 binding and do not contact Cloudflare:

```bash
npm run test:analytics
```

The integration test starts a local Worker, opens a browser fixture, records normal and UTM-attributed activity in a disposable local D1 database, verifies the counters and deletes the database:

```bash
npm run test:analytics:integration
```

No Cloudflare login, account, API token or remote database is involved. Wrangler runs Worker code and D1 locally by default.

## Persistent local environment

Start the public site and local collector together from the repository root:

```bash
JEKYLL_CONFIG=_config.yml,_config.analytics-local.yml docker compose up site analytics
```

Open `http://127.0.0.1:4000`. The local collector accepts only the loopback origins declared in `collector/wrangler.local.jsonc`; normal site development without the extra Jekyll configuration remains unmeasured.

Inspect the local data with Wrangler's Local Explorer by pressing `e` in the collector terminal, or generate the same private Markdown/CSV reporting shape used in production:

```bash
docker compose run --rm analytics npm run analytics:local:report -- --days=30
```

Reset the persistent local database when a clean scenario is needed:

```bash
docker compose run --rm analytics npm run analytics:local:reset
```

Local state lives under `collector/.wrangler/` and is ignored by Git. Never configure a remote D1 binding in `wrangler.local.jsonc`.

## First Cloudflare setup

1. Create or select the Cloudflare account that will own the service.

2. Authenticate Wrangler:

   ```bash
   cd _analytics/collector
   npx wrangler@4 login
   ```

3. Create the D1 database:

   ```bash
   npx wrangler@4 d1 create carlo-site-aggregate-analytics
   ```

4. Replace `REPLACE_WITH_D1_DATABASE_ID` in `collector/wrangler.jsonc` with the returned database ID.

5. Apply the migrations:

   ```bash
   npx wrangler@4 d1 migrations apply carlo-site-aggregate-analytics --remote
   ```

6. Run the production configuration locally against an isolated D1 simulation if needed:

   ```bash
   npx wrangler@4 dev --local
   ```

7. Deploy it:

   ```bash
   npm run deploy
   ```

8. Verify the deployed endpoint directly with valid and invalid test requests.

9. Add Cloudflare edge rate limiting for `POST /v1/measure`. Do not enable request-body logging. Keep the exact allowed origin `https://carlocaprini.github.io`.

10. Set the resulting HTTPS endpoint in `_config.yml` as `aggregate_analytics_endpoint` and rebuild the production site.

Do not commit Cloudflare API tokens. The D1 database ID and public Worker URL are configuration, not credentials.

## Reporting

Create a scoped API token that can read the D1 database. Export it only in the local shell used to run the report:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_D1_DATABASE_ID=...
export CLOUDFLARE_API_TOKEN=...
node _analytics/reports/generate-report.mjs --days=30 --csv-dir=/tmp/site-analytics
```

The command prints Markdown and optionally writes CSV files, including a separate campaign-landings export when UTM-attributed visits exist. Generated reports stay outside this public repository.

## Retention

The scheduled Worker task deletes normal and campaign daily rows older than 14 calendar months. If longer history is needed later, add an explicitly reviewed monthly-rollup migration before changing retention.
