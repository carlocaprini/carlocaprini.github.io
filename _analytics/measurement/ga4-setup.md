# GA4 reporting configuration

This is the repository-owned target configuration for the optional, consent-based GA4 property. The machine-readable inventory lives in [`ga4-configuration.json`](ga4-configuration.json). The browser already sends these semantic events and parameters; this guide does not require new site telemetry.

GA4 configuration is external state. Apply these steps manually in the production property, record the completion date in the monthly evidence notes and recheck the configuration after material GA4 interface changes.

## 1. Verify the production stream

- Confirm that the web stream points to `https://carlocaprini.github.io`.
- Confirm in Realtime or DebugView that events appear only after analytics consent on the canonical HTTPS hostname.
- Confirm that ordinary local development on `localhost` or `127.0.0.1` produces no GA4 request.
- Use page path and landing page as longitudinal page identity. Treat page title as descriptive metadata because titles can change.

## 2. Register event-scoped custom dimensions

In **Admin → Data display → Custom definitions**, create each entry in `custom_dimensions` from [`ga4-configuration.json`](ga4-configuration.json). Use the listed name, Event scope and exact case-sensitive event parameter.

The selected dimensions cover:

- stable page and content context;
- source-to-target navigation context;
- topic, question, series and reading exploration;
- Work section visibility;
- outbound contact method;
- social-profile platform.

Do not create custom definitions for native GA4 dimensions listed in `native_dimensions`. Do not register every incidental parameter merely because it exists. Custom dimensions are not retroactive and may take time to become available in reports.

## 3. Create the Work-contact event

In **Admin → Data display → Events**, generate a new event from the existing event:

| Setting | Value |
| --- | --- |
| Custom event name | `work_contact_open` |
| Condition 1 | `event_name` equals `contact_open` |
| Condition 2 | `link_context` equals `work_contact` |
| Copy parameters from source event | Yes |

Mark `work_contact_open` as the only site-navigation-related **Key Event**. Keep `work_open`, `work_section_view`, `experience_open` and ordinary `contact_open` as exploratory events, not Key Events.

The generated event is forward-looking and does not rewrite historical data. Verify one consented production test after configuration, then annotate that test in the next monthly review so it is not mistaken for external intent.

## 4. Create the monthly Exploration

Create one free-form Exploration named **Monthly body of work**. Change its date range to the exact calendar month whenever collecting the evidence package.

Use separate tabs rather than one artificial funnel:

1. **Acquisition** — Landing page + query string, Session source / medium; Sessions, Engaged sessions and Average engagement time.
2. **Content** — Page path and screen class, Page type, Page ID and Page topic; Views, Sessions, Engaged sessions and Average engagement time.
3. **Depth** — Event name, Link context, Social platform and the relevant target dimension; Event count. Include `social_profile_open` here as relationship exploration rather than contact intent.
4. **Professional intent** — Event name, Work section, Link context and Contact method; Event count and Key events. Filter event name to `experience_open`, `work_open`, `work_section_view`, `contact_section_open`, `contact_open` and `work_contact_open`.
5. **Audience diagnostics** — Device category and Country; Active users and Sessions. Use city only to investigate an anomaly.

Export each tab for the exact month. Do not blend GA4 users or sessions with aggregate D1 counters.

## 5. Internal traffic

Follow [`internal-and-developer-traffic.md`](internal-and-developer-traffic.md) before treating the monthly property as clean. Start any GA4 internal-traffic filter in **Testing** state, verify the `traffic_type` result and only then activate exclusion. Filters do not repair historical data.

## Official references

- [Create event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696)
- [Generate events from existing events](https://support.google.com/analytics/answer/10085872)
- [About Key Events](https://support.google.com/analytics/answer/9267568)
- [Filter internal traffic](https://support.google.com/analytics/answer/10104470)
