# carlocaprini.github.io

Personal site. Jekyll, GitHub Pages, dark theme.

## Running locally

I use Docker so I don't have to deal with Ruby versions or native gems.

```bash
docker compose up site
```

Then open [http://localhost:4000](http://localhost:4000). Changes to content or layouts trigger a rebuild; the browser refreshes via LiveReload.

To stop: `Ctrl+C`.

## Topics (Thinking notes & Influences)

Notes and external references are tagged with a `topics` array in front matter, using **only** the three canonical slugs below. **Shared topics** drive automatic **related readings** on note pages (and related notes between notes). The **Influences** index does **not** infer a note from topics: each reference may set an optional `related_note:` to one internal URL. Use lowercase, hyphenated topic labels consistently.

### Canonical topics (notes and references)

Thinking notes and Influences references use **only** these topic slugs (lowercase, hyphenated). Use **one** topic per note and per reference (a single-item `topics` array).

- `decision-making`
- `execution`
- `team-dynamics`

### Behaviour (quick reference)

- **Thinking → Thinking:** article layout picks up to two **related notes** by shared topics (overlap count, then date).
- **Thinking → references:** up to two **related readings** from `_influences` by shared topics (newest first).
- **Influences → Thinking:** optional `related_note:` on each file in `_influences/` (note `permalink` / URL path, e.g. `/thinking/my-slug/`). If set and the page exists, the reference shows **Related note:** with a link; omit the field if there is no link.

To surface a reference on a note page, reuse topics on both sides. To choose which note appears under a reference on `/influences/`, set `related_note:` manually. Adding a new topic slug requires updating this list and every place that assumes the taxonomy.

## How this was built

The site was built with [Cursor](https://cursor.com) — vibe coding, as they say. I described what I wanted, iterated on structure and content, and let the AI handle most of the plumbing. Some of it also came from fragments of historical knowledge: Jekyll, Liquid, GitHub Pages, that kind of thing.

All the content — the words, the experience, the thinking — is mine. The structure and styling were shaped together with the tool.
