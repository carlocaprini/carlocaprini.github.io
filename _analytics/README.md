# Aggregate site measurement

This directory contains the privacy-preserving measurement service for the public site.

The browser sends a fixed semantic payload to a Cloudflare Worker. The Worker validates it and increments one daily D1 counter. It does not store raw events, IP addresses, user agents, referrers, cookies, users, sessions or precise timestamps.

Work uses the same semantic contract as the rest of the site. `work_open` records which site context led to `/work/`; `work_section_view` records a first meaningful view of Review or Advisory; `contact_open` with `work_contact` identifies the outbound conversation path. These remain coarse allowlisted transitions and never include problem descriptions or other visitor prose.

`social_profile_open` records a deliberate move to an author's external profile and preserves the allowlisted platform plus the site context that prompted it. It is relationship exploration, not contact intent: `contact_open` remains reserved for opening an actual contact channel.

## Semantic coverage

The site measures meaningful transitions rather than every click:

- page and content views establish which public destinations were reached;
- global navigation and in-page entry points distinguish movement into Thinking, Explore, Influences, Experience and Work;
- note, question, series, topic and external-reading events preserve the discovery context that led to them;
- Work-section visibility and contact events separate professional exploration from opening a contact channel;
- social-profile events keep relationship exploration distinct from direct contact intent;
- series visuals and RSS have dedicated events because their destination is not adequately described by a page view.

Home and brand links, back links, skip links, Privacy, consent-settings reopening and purely visual interactions intentionally have no semantic navigation event. Their destination page view or dedicated consent behavior is sufficient, and adding click events would create noise without answering a measurement question. Desktop and mobile navigation use the same destination semantics while retaining separate `primary_navigation` and `mobile_navigation` contexts.

Cross-system measurement operations live under [`measurement/`](measurement/README.md). That directory owns the GA4 reporting target, internal/developer traffic handling, professional-outcome structure and repeatable monthly/quarterly evidence workflow. It does not introduce another telemetry destination.

When a landing URL matches a canonical UTM combination, the browser also sends one aggregate `campaign_landing` event. Missing required, duplicated or unknown UTM values are ignored and do not affect the normal page and interaction counters. Campaign attribution is limited to the landing page and is never persisted across navigation.

## Canonical UTM contract

[`contracts/analytics.json`](../contracts/analytics.json) is the machine-readable source of truth for event names, source/target types and the site distribution convention. `npm run analytics:contract:generate` deterministically produces the browser and Worker representations; do not edit the generated files. `npm run analytics:contract:check` fails when either representation is stale.

The table below explains the canonical combinations for humans. Runtime acceptance is derived from the contract rather than maintained independently in this document, the browser adapter or the Worker.

| Scenario | `utm_source` | `utm_medium` | `utm_campaign` | `utm_content` |
| --- | --- | --- | --- | --- |
| LinkedIn post | `linkedin` | `social` | Editorial initiative | `<content_key>_<format>` |
| LinkedIn comment | `linkedin` | `comment` | Editorial initiative | `comment` |
| LinkedIn Featured | `linkedin` | `profile` | `profile` | `featured` |
| LinkedIn About | `linkedin` | `profile` | `profile` | `about` |
| LinkedIn Premium website button | `linkedin` | `profile` | `premium_subscription` | `website_button` |
| Medium article | `medium` | `referral` | Editorial initiative | `article` |
| Newsletter | `newsletter` | `email` | `monthly_updates` | `article` |
| Manual sharing | `manual` | `direct` | Editorial initiative | `shared_link` |
| QR code | `qr` | `offline` | Editorial initiative | `qr` |

Allowed editorial initiatives are `thinking`, `building_my_ai_operating_system`, `experience` and `explore`. The profile and newsletter scenarios use the dedicated campaign values `profile` and `monthly_updates`.

The Premium website-button combination requires all four UTM parameters, like every other scenario. It reuses the `profile` medium while distinguishing the subscription campaign and the specific website button. Featured/About remain on the `profile` campaign; these content values are not interchangeable with `website_button`. No schema migration is needed. These counters measure attributed landing events, not LinkedIn-side clicks or unique people. Deploy the updated collector contract as well as the site before using the link in production. GA4 attribution remains consent-dependent; ordinary local previews remain excluded.

Website-button URL: `https://carlocaprini.github.io/?utm_source=linkedin&utm_medium=profile&utm_campaign=premium_subscription&utm_content=website_button`.

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

The Markdown distinguishes the requested window from the dates that actually contain aggregate data, then shows a daily trend for page views, content views and interactions. Interactions exclude `page_view`, `content_view` and `consent_choice`, consistently with path and target reporting. Only days with recorded activity are listed; missing calendar days are not presented as zero-traffic days.

Use the complete retained measurement history instead of a rolling window with:

```bash
node _analytics/reports/generate-report.mjs --since-start
```

`--since-start` and `--days=N` are mutually exclusive; the default remains `--days=30`. CSV output includes `daily-trend.csv` alongside the existing exports, including the separate campaign-landings file when UTM-attributed visits exist. Generated reports stay outside this public repository.

Official monthly reports must use an exact immutable calendar period. The month shortcut resolves month boundaries, including leap years:

```bash
node _analytics/reports/generate-report.mjs --month=2026-08 --csv-dir=/tmp/site-analytics/2026-08
```

Use an inclusive custom range when a calendar month is not the intended period:

```bash
node _analytics/reports/generate-report.mjs --from=2026-08-01 --to=2026-08-31 --csv-dir=/tmp/site-analytics/2026-08
```

`--month` and `--from`/`--to` cannot be combined with `--days` or `--since-start`. Markdown and every CSV export are generated from the same date filter. Rolling windows remain available only for informal investigation.

## Retention

The scheduled Worker task deletes normal and campaign daily rows older than 14 calendar months. If longer history is needed later, add an explicitly reviewed monthly-rollup migration before changing retention.

## Semantic parameter safety and note links

`contracts/analytics.json` owns the common and per-event parameter allowlists. The browser filters both DOM attributes and programmatic events before sending them to GA4 or the semantic event bus. Technical configuration, unknown parameters, objects and free prose are discarded. The consent-ready content event uses the same filter. This boundary concerns custom semantic events, not Google's independently collected native fields.

Automatic note-body tracking distinguishes collection indexes from individual notes/questions/series and recognizes Work and Experience. Same-page links, unsupported internal routes and non-HTTP links are not automatically tracked. External reading destinations preserve the public origin and path to distinguish publishers, but omit credentials, query strings and fragments. Existing explicit event annotations take precedence.
