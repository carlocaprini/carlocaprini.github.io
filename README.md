# carlocaprini.github.io

Personal site. Jekyll, GitHub Pages, dark theme.

## Running locally

I use Docker so I don't have to deal with Ruby versions or native gems.

```bash
docker compose up site
```

Then open [http://localhost:4000](http://localhost:4000). Changes to content or layouts trigger a rebuild; the browser refreshes via LiveReload.

To stop: `Ctrl+C`.

To run the site with the isolated aggregate-measurement environment, use:

```bash
JEKYLL_CONFIG=_config.yml,_config.analytics-local.yml docker compose up site analytics
```

Then open `http://127.0.0.1:4000`. This explicit configuration sends only to the loopback Worker on port `8787` and stores counters in the local D1 simulation. Ordinary `docker compose up site` continues to disable all measurement. Reset the local counters with `docker compose run --rm analytics npm run analytics:local:reset`.

## Browser and visual checks

Build `_site` before running browser checks, then use the focused commands below. The Playwright server reuses an existing local server when one is available.

```bash
npm run test:browser
npm run test:browser:webkit
npm run test:browser:visual
```

`test:browser` is the broad sitemap-driven Chromium suite across desktop, mobile and portrait tablet. `test:browser:webkit` is a deliberately small desktop/mobile Safari-like smoke suite. `test:browser:visual` compares a curated set of design-system surfaces with lossless, platform-specific WebP baselines stored beside the visual spec. Run `npm run test:browser:all` to execute all three categories.

Update visual baselines only after reviewing the rendered change:

```bash
npx playwright test --project=visual-chromium --update-snapshots
```

CI keeps one isolated retry, emits an HTML report and uploads traces, failure screenshots and visual diffs only when a browser category fails. The `Site checks` workflow builds and validates the site once, then shares that exact generated `_site` artifact with independent Chromium, WebKit and visual-regression jobs. Analytics and infrastructure checks also run independently; deployment waits for every blocking category to pass.

The versioned [Visual Reference](visual-reference/README.md) is separate documentation: its curated full-page screenshots show what representative site surfaces currently look like. Visual-regression fixtures detect unexpected changes; update the Visual Reference deliberately in the same pull request as a material rendered change.

## Topics (Thinking notes & Influences)

Notes and external references are tagged with a `topics` array in front matter, using **only** the four canonical slugs below. **Shared topics** drive automatic **related readings** on note pages (and related notes between notes). The **Influences** index does **not** infer a note from topics: each reference may set an optional `related_note:` to one internal URL. Use lowercase, hyphenated topic labels consistently.

### Canonical topics (notes and references)

Thinking notes and Influences references use **only** these topic slugs (lowercase, hyphenated). Use no more than two topics per item and list the most characteristic topic first.

- `product-decisions`
- `ai-and-automation`
- `software-systems`
- `teams-and-collaboration`

### Behaviour (quick reference)

- **Thinking → Thinking:** the note layout can pick up to two **related notes** by shared topics (overlap count, then date). Series notes can disable this when their reading path and in-text links already provide enough navigation.
- **Thinking → references:** up to two **related readings** from `_influences`, ranked by shared-topic overlap first and `weight:` second. Each influence must define `external_url:` in front matter for the outbound link target.
- **Influences → Thinking:** optional `related_note:` on each file in `_influences/` (note `permalink` / URL path, e.g. `/thinking/my-slug/`). If set and the page exists, the reference shows **Related note:** with a link; omit the field if there is no link.
- **Notes and Influences → Questions:** membership comes only from `_data/questions.yml`. Notes show up to two relevant Questions in their sidebar; a selected Influence links back to the first Question that curates it.
- **Explore:** `/explore/` provides three curated Question paths across Thinking, Experience and Influences, followed by the complete topic views. Topic labels link to a stable hash, such as `/explore/#ai-and-automation`.
- **Questions:** `_data/questions.yml` is the canonical editorial map. It defines each public Question, its grouped notes, selected Influences, Experience link and next path. Question pages live at `/explore/question-slug/`.
- **Legacy path:** `/knowledge/` is retained only as a compatibility redirect to `/explore/`; its query string and topic hash are preserved.

The Home page introduces the site in this order: selected notes, curated Questions, collaboration, the featured series, Experience, collection entry points and Contact. Its reusable editorial content lives in `_data/home.yml`; the three destination cards use the `entry_points` key. Thinking uses `notes` as its complete canonical list and `start_here.notes` for the three editorial selections.

### Responsive behaviour

- Recent Thinking always contains the three newest notes.
- Home entry-point cards become compact rows below desktop width; the hero summary becomes a shorter list on narrow phones.
- Article “On this page” navigation is desktop-only. In series notes, the service map becomes a closed disclosure before the article text on smaller screens; the remaining contextual sidebar content follows the article.
- Responsive changes should reuse existing cards, typography, spacing and accent tokens before introducing a new component variant.
- Section boundaries use one divider at most. Do not place the bottom border of one full-width block directly beside the top border of the next.

To surface a reference on a note page, reuse topics on both sides. To choose which note appears under a reference on `/influences/`, set `related_note:` manually. Order influences with `weight:` instead of `date:`. Higher weights appear first on `/influences/`, and break ties in related reading after topic overlap. Adding a new topic slug requires updating this list and every place that assumes the taxonomy. Questions are curated paths, not an automatic projection of topic tags.

## Editorial metadata

Set `last_modified_at` on a Thinking note only when its editorial content changes. Do not update it for topic mapping, layout, styling, related-content logic or other presentation-only work. Index pages can update `last_modified_at` when their public structure or copy changes.

## Search Console sitemap diagnostic

The canonical sitemap remains `/sitemap.xml`, generated by `jekyll-sitemap`, with `/sitemap.txt` as its text equivalent. `/sitemap-static.xml` is a deliberately minimal static control containing only Home, Explore and Thinking. It excludes Liquid generation, modification dates and the complete URL set so that Search Console retrieval can be tested independently of sitemap complexity.

After deployment, submit `sitemap-static.xml` in the exact URL-prefix property `https://carlocaprini.github.io/`. Keep the canonical sitemap in place while running the test. If Search Console can retrieve the static control but not the canonical sitemap, investigate generated content or stale sitemap state. If neither can be retrieved, investigate the selected Search Console property or Google's retrieval/reporting rather than the sitemap generator.

## Analytics events

The site uses one semantic event contract with two destinations. [`contracts/analytics.json`](contracts/analytics.json) is the machine-readable source of truth; generated browser and Worker representations are checked for drift in `npm run test:analytics`. A proprietary aggregate adapter records daily counters without cookies, users, sessions or raw events. GA4 receives the richer event stream only after consent. Both adapters are disabled locally. GA4 is fail-closed and can initialize only on `https://carlocaprini.github.io`, never on localhost, private-network addresses or preview hosts.

The aggregate collector lives in `_analytics/`, uses a Cloudflare Worker and D1, and stores only daily counter rows. Normal site activity is stored in `daily_counts`; complete, canonical UTM landing tuples are stored separately in `daily_campaign_counts`. It remains inactive until the deployed Worker URL is set as `aggregate_analytics_endpoint` in `_config.yml`. See `_analytics/README.md` for setup, the canonical UTM contract and private reporting.

GA4 is optional and remains completely unloaded until the visitor accepts analytics. Automatic `page_view` collection then remains enabled; `content_view` adds the site’s own content context for Notes, Questions and Series. The aggregate adapter records its own `page_view`, the semantic events below, an unlinked count of explicit consent choices and an optional `campaign_landing` when all four canonical UTM values are present and valid.

The consent choice is stored locally for up to six months and can be changed through **Cookie settings** in the footer. Refusing analytics does not change site functionality. The implementation disables Google Signals and advertising personalisation, limits Analytics cookies to 13 months without renewing them on each page load, and is documented on `/privacy/`.

| Event | Meaning |
| --- | --- |
| `content_view` | A Note, Question or Series page was viewed. |
| `collection_open` | Thinking, Explore or Influences was opened from a prominent editorial entry point. |
| `note_open` | A Note was opened from a curated or contextual link. |
| `question_open` | A Question path was opened or continued. |
| `series_open` | A Series page was opened from Home, Thinking or a Note. |
| `series_episode_open` | A Series episode was opened from the Series page, an image or adjacent-episode navigation. |
| `topic_select` | A Topic was selected as a filter or navigation path. |
| `reading_open` | A selected external reading was opened. |
| `experience_open` | Experience was opened from an editorial or collaboration context. |
| `contact_section_open` | A navigation link or CTA opened the Contact section. |
| `contact_open` | An actual Contact channel was opened. |
| `series_visual_open` | A full-size Series image was opened. |
| `rss_open` | The RSS feed was opened from the footer. |
| `campaign_landing` | Aggregate-only: a landing page was opened with a complete canonical UTM source, medium, campaign and content tuple. |

Every event includes the source `page_type` and `page_id`. Where relevant, events also include identifiers for the Note, Question, Topic, Series, episode, reading or contact method, plus a stable `link_context`. Event names and parameters use the current Thinking, Explore, Question, Topic, Note, Series, Experience and Influences terminology.

Campaign attribution is landing-only. It is not saved in cookies or browser storage, is not propagated through internal links and is not used to reconstruct a UTM-attributed session. Missing, partial or non-canonical UTM tags are ignored while normal aggregate measurement continues.

### Aggregate measurement environments

Production and local integration are physically isolated. Production uses the deployed Worker and remote D1 database. Local integration uses `wrangler.local.jsonc`, a loopback-only endpoint and Wrangler's local D1 state. The browser adapter requires both the dedicated Jekyll configuration and a loopback `/v1/measure` endpoint before it will send from a local page.

`npm run test:analytics` checks the event and storage contract without infrastructure. `npm run test:analytics:integration` runs the complete browser → Worker → D1 path against disposable state. `npm run analytics:local:report -- --days=30` reads the persistent local D1 database and produces the same Markdown report shape used for production. The production deploy command fails until a real D1 database ID and canonical public origin are configured.

## How this was built

The site was built with [Cursor](https://cursor.com) — vibe coding, as they say. I described what I wanted, iterated on structure and content, and let the AI handle most of the plumbing. Some of it also came from fragments of historical knowledge: Jekyll, Liquid, GitHub Pages, that kind of thing.

The experience, positions and final editorial decisions are mine. I use AI as a research, thinking and building partner: it helps me challenge arguments, shape drafts and implement the site, but I remain responsible for everything that is published.
