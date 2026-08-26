# Internal and developer traffic

This document records the current measurement boundary and the remaining production-account configuration. It applies prospectively; historical data remains labelled according to the controls that existed when it was collected.

## Site-enforced protections

### GA4

GA4 loads only when all of these conditions are true:

- the page uses HTTPS;
- the hostname exactly matches `carlocaprini.github.io`;
- the production Jekyll build rendered analytics as enabled;
- the visitor granted analytics consent;
- a measurement ID is configured.

Localhost, loopback addresses, file previews, LAN addresses and non-canonical preview hosts cannot load GA4 even when they render a production build. Browser tests protect this invariant.

### Aggregate measurement

The production aggregate adapter also requires the exact canonical hostname and HTTPS. Local measurement requires the dedicated local Jekyll configuration and accepts only a loopback HTTP endpoint ending in `/v1/measure`.

The Worker accepts only the canonical production origin, omits credentials and referrers, and rejects common bot, crawler, social-preview, Lighthouse and PageSpeed user agents. GitHub Actions tests the local generated artifact and does not send measurement to production.

## Carlo's use of the live site

Opening the production site from the Mac mini is genuine production traffic:

- GA4 can record it only after consent;
- the aggregate collector can record it because it deliberately has no visitor identity or durable exclusion mechanism.

For GA4, define Carlo's current public IP as internal traffic with `traffic_type=internal`, then create an Internal Traffic exclusion filter. Keep the filter in **Testing** until the test-data dimension confirms the rule, then activate it. Recheck the rule after ISP or network changes.

As a device-level fallback, keep analytics consent denied or use Google's Analytics opt-out mechanism in the browsers used for routine production checks. This fallback does not affect aggregate counters.

Do not add an identity cookie, secret query parameter, persistent device ID or IP allowlist to the aggregate collector merely to remove Carlo's visits. Those mechanisms would weaken the collector's privacy boundary. Instead:

- use the isolated local collector for deliberate testing;
- avoid unnecessary production test navigation;
- annotate known production verification in the relevant monthly review;
- treat small aggregate totals with appropriate uncertainty.

## Known automated traffic

- Search and social preview crawlers normally do not execute the consented GA4 path.
- Recognised bot user agents are rejected by the aggregate Worker.
- An automated client that mimics a normal browser can still increment aggregate counters; investigate only when a clear anomaly appears.
- Search Console sitemap retrieval does not load site JavaScript and therefore produces no site analytics event.

No historical counters should be deleted or rewritten to estimate internal traffic.
