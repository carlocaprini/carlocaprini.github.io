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

## 2. Collect required evidence

### LinkedIn — Discovery

Save the monthly platform export or a clearly dated manual record covering, where available:

- impressions;
- members reached;
- social interactions;
- link interactions;
- follower development;
- relevant audience observations.

Do not sum LinkedIn impressions with another platform's impressions.

### Search Console — Discovery

Use the exact calendar month and export:

- dates;
- queries;
- pages;
- countries;
- devices;
- search appearance.

Record clicks, impressions, CTR and average position. Keep Search Console as the authority for Google Search discovery.

### GA4 — Arrival, engagement quality and professional intent

Use the **Monthly body of work** Exploration defined in [`ga4-setup.md`](ga4-setup.md). Export:

- `ga4/acquisition.csv`;
- `ga4/content.csv`;
- `ga4/depth.csv`;
- `ga4/professional-intent.csv`;
- `ga4/audience-diagnostics.csv`.

Also record active users, new users, sessions, engaged sessions, engagement rate, average engagement time, views, event count and Key Events.

Treat Direct as unresolved attribution. Use city only when investigating a clear anomaly. Do not infer relevance from geography alone.

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

## 3. Optional diagnostics

Use only when a specific question warrants them:

- GA4 Realtime or DebugView for validating a new configuration;
- city-level geography for a suspected data-quality anomaly;
- rolling aggregate `--days=N` reports during the month;
- a specific LinkedIn publication view;
- a filtered Search Console page or query investigation.

Label diagnostics as exploratory. Do not replace the official calendar-month package with them.

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

- Confirm every export uses the same exact period.
- Confirm filenames and source folders are present.
- Confirm the review separates Discovery, Arrival, Depth, Professional Intent and Professional Outcome.
- Record unknowns explicitly.
- Do not create a new strategy from one spike.
- Preserve the completed package unchanged for the quarterly review.
