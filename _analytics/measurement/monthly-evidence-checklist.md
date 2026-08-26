# Monthly evidence checklist

Run this once approximately 5–7 days after month end. Use the exact previous calendar month for every source. Store completed evidence outside this public repository.

## 1. Create the package

Use one directory named `YYYY-MM-site-measurement` with this structure:

```text
YYYY-MM-site-measurement/
├── linkedin/
├── search-console/
├── ga4/
├── aggregate/
├── professional-outcomes.csv
└── monthly-review.md
```

Copy [`templates/professional-outcomes.csv`](templates/professional-outcomes.csv) and [`templates/monthly-review.md`](templates/monthly-review.md) into it. Record the exact inclusive period at the top of the review.

## 2. Collect core monthly evidence

### LinkedIn — Discovery

When one or more publications appeared during the month, save the monthly platform export or a clearly dated manual record covering, where available:

- impressions;
- members reached;
- social interactions;
- link interactions;
- follower development;
- relevant audience observations.

Do not sum LinkedIn impressions with another platform's impressions.

When nothing was published, record that no LinkedIn publication evidence was expected and skip the export.

### Search Console — Discovery

Use the exact calendar month. Save a dated export or record containing clicks, impressions, CTR and average position, plus the leading queries and pages needed to understand what was discovered. Keep Search Console as the authority for Google Search discovery.

### GA4 — Arrival, engagement quality and professional intent

Use the exact calendar month and save a dated high-level GA4 record containing active users, new users, sessions, engaged sessions, engagement rate, average engagement time, views, event count and Key Events. Add only the acquisition, content or professional-intent observations needed to support the month's interpretation.

Treat Direct as unresolved attribution. The **Monthly body of work** Exploration defined in [`ga4-setup.md`](ga4-setup.md) remains available for diagnostics; its five detailed tabs are not required monthly exports.

### Aggregate D1 — Arrival, depth and professional intent

Generate the canonical exact-month report and CSV exports:

```bash
node _analytics/reports/generate-report.mjs \
  --month=YYYY-MM \
  --csv-dir=/private/path/YYYY-MM-site-measurement/aggregate \
  > /private/path/YYYY-MM-site-measurement/aggregate/report.md
```

Keep every generated CSV. Review daily trends, event totals, page views, source-to-target paths, opened targets, consent choices and campaign landings.

Aggregate event ratios are directional comparisons, not user conversion rates. The collector has no visitor or session identity.

### Professional outcomes

Update the private `professional-outcomes.csv` using the canonical template. Zero outcomes is a valid monthly result. Never add names, companies, email addresses, analytics identifiers or visitor histories.

## 3. Collect optional diagnostic evidence

Collect these only when the core evidence raises a specific question worth investigating. Record that question before exporting the drill-down:

- one or more detailed GA4 Exploration exports: `ga4/acquisition.csv`, `ga4/content.csv`, `ga4/depth.csv`, `ga4/professional-intent.csv` or `ga4/audience-diagnostics.csv`;
- GA4 Realtime or DebugView for validating a new configuration;
- city-level geography for a suspected data-quality anomaly;
- rolling aggregate `--days=N` reports during the month;
- a specific LinkedIn publication view;
- Search Console dates, countries, devices or search-appearance exports;
- a filtered Search Console page or query investigation.

Use city only to investigate a clear anomaly and do not infer relevance from geography alone. Label every diagnostic as exploratory and keep it separate from the core evidence. Do not replace the official calendar-month package with it.

## 4. Interpret once

Complete `monthly-review.md` and answer:

1. What became more or less discoverable?
2. What brought visitors to the site?
3. Which content attracted attention?
4. What did visitors explore next?
5. Was there evidence of Experience or Work exploration?
6. Was there professional-intent activity?
7. Did any professional conversations occur?
8. What appears meaningful versus likely noise?
9. What should be observed or tested next?

Preserve platform discrepancies instead of averaging them away. Record known production tests or measurement changes that affect comparison.

## 5. Close the month

- Confirm every core source uses the same exact period.
- Confirm the core evidence, review and professional-outcomes record are present; empty source folders are acceptable when no relevant evidence existed.
- Confirm optional diagnostics state the question they investigated.
- Confirm the review separates Discovery, Arrival, Depth, Professional Intent and Professional Outcome.
- Record unknowns explicitly.
- Do not create a new strategy from one spike.
- Preserve the completed package unchanged for the quarterly review.
