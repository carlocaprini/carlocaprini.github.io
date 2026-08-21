# Content model

## Canonical editorial entities

- Thinking Notes live in `_thinking/` and own their title, summary, publication metadata, topics and body.
- Influences live in `_influences/` and own external-source metadata, topics and any deliberately selected related Note.
- Topics live in `_data/topics.yml`. Do not copy the allowed slug list into documentation or runtime code.
- Questions live in `_data/questions.yml`. They are curated reading paths across Notes, Influences and Experience, not projections of topic tags.
- Series metadata lives in `_data/series.yml`; episode identity remains on the relevant Notes.
- Home editorial modules live in `_data/home.yml`.

## Relationships

Shared topics can rank related Notes and Influences. An Influence may select one internal Note explicitly through `related_note`. Question membership is always explicit in `_data/questions.yml`; topic overlap never adds an item to a Question automatically.

Explore exposes curated Questions first and complete Topic views second. Stable Topic URLs use hashes on `/explore/`. `/knowledge/` remains only as a compatibility redirect.

## Intentional editorial ordering

Some lists resemble derived data but are intentionally curated:

- `pages/thinking.md` contains every published Note once in its `notes` list, in editorial order.
- `pages/thinking.md` separately defines the three `start_here.notes` selections.
- `_data/home.yml` chooses and orders Home entry points and editorial modules.
- Question sections choose and order their Notes and Influences.

Validators protect membership and references, but should not replace these choices with automatic chronological or taxonomic projections.

## Metadata changes

Set `last_modified_at` on a Note only when its editorial content changes. Topic remapping, layout, styling and related-content logic do not change the Note’s editorial modification date. Index pages may update it when their public copy or structure changes.

Use at most two canonical Topics per Note or Influence, most characteristic first. To add a Topic, change `_data/topics.yml` and let source validation identify every dependent contract; do not maintain a parallel prose allowlist.

## Responsive editorial behavior

Recent Thinking is a three-item curated presentation of the newest Notes. Home entry points compact below desktop width. Article “On this page” navigation is desktop-only. Series service context becomes a closed disclosure before article content on small screens. Structural section boundaries use at most one divider.
