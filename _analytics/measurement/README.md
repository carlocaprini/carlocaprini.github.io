# Measurement operations

This directory turns the site's measurement strategy into a small repeatable operating system. The long-term north star is **qualified professional conversations influenced by Carlo's public body of work**. It is reviewed quarterly, not treated as a monthly growth target.

The evidence model remains deliberately separated:

| Stage | Question | Primary source |
| --- | --- | --- |
| Discovery | Are people encountering the work? | LinkedIn and Search Console |
| Arrival | What brings people to the site? | Aggregate campaign landings and GA4 acquisition |
| Depth | Do visitors explore beyond the initial destination? | Aggregate semantic paths and GA4 engagement |
| Professional intent | Do visitors explore Experience, Work or contact paths? | Aggregate semantic events and GA4 |
| Professional outcome | Did the work influence a useful conversation or collaboration? | Private manual outcome record |

These stages are evidence layers, not one visitor-level funnel. The aggregate collector has no users or sessions, GA4 represents only consenting traffic and professional outcomes must never be connected to analytics identity.

## Files

- [`ga4-setup.md`](ga4-setup.md) and [`ga4-configuration.json`](ga4-configuration.json) define the target GA4 reporting configuration.
- [`internal-and-developer-traffic.md`](internal-and-developer-traffic.md) records production, preview and local measurement boundaries.
- [`monthly-evidence-checklist.md`](monthly-evidence-checklist.md) owns collection and review cadence.
- [`templates/monthly-review.md`](templates/monthly-review.md) keeps monthly interpretation comparable.
- [`templates/quarterly-review.md`](templates/quarterly-review.md) consumes three completed monthly reviews.
- [`professional-outcomes.md`](professional-outcomes.md) and [`templates/professional-outcomes.csv`](templates/professional-outcomes.csv) define the private manual record shape.

## Cadence

- During the month: investigate only specific questions.
- Approximately 5–7 days after month end: collect and analyse the exact previous calendar month once, using the lightweight core evidence set.
- Add detailed platform exports only when the core evidence raises a specific diagnostic question.
- After three completed months: compare the three monthly reviews and classify findings as emerging signals, repeated patterns or strategic evidence.

Evidence packages and professional-outcome records contain private operational information and stay outside this public repository. Copy the templates into the private analysis workspace rather than committing completed records here.
