# Content model

## Canonical editorial entities

- Thinking Notes live in `_thinking/` and own their title, summary, publication metadata, topics and body.
- Influences live in `_influences/` and own external-source metadata, topics and any deliberately selected related Note.
- Topics live in `_data/topics.yml`. Do not copy the allowed slug list into documentation or runtime code.
- Questions live in `_data/questions.yml`. They are curated reading paths across Notes, Influences and Experience, not projections of topic tags.
- Series metadata lives in `_data/series.yml`; episode identity remains on the relevant Notes.
- Home editorial modules live in `_data/home.yml`.
- The Work proposition lives in `pages/work.md`. It owns the recognizable situations, Review, Advisory, working principles and contact path; client proof must not be inferred or generated from it.
- Home’s `Where I can help` module lives in `_data/home.yml`. It is a selective preview of the problem spaces described by Work, not a second service catalogue or a source of independent engagement definitions.

## Relationships

Shared topics can rank related Notes and Influences. An Influence may select one internal Note explicitly through `related_note`. Question membership is always explicit in `_data/questions.yml`; topic overlap never adds an item to a Question automatically.

Explore exposes curated Questions first and complete Topic views second. Stable Topic URLs use hashes on `/explore/`. `/knowledge/` remains only as a compatibility redirect.

Work is a first-class professional destination, but it does not redefine Thinking. Home may preview selected problem spaces and link to `/work/`; its terminology, boundaries and outcome language must remain consistent with the canonical proposition. Work must not fabricate engagement connections inside Questions or turn Notes into commercial entry points.

## Intentional editorial ordering

Some lists resemble derived data but are intentionally curated:

- `pages/thinking.md` contains every published Note once in its `notes` list, in editorial order.
- `pages/thinking.md` separately defines the three `start_here.notes` selections.
- `_data/home.yml` chooses and orders Home entry points and editorial modules.
- Question sections choose and order their Notes and Influences.

Validators protect membership and references, but should not replace these choices with automatic chronological or taxonomic projections.

## Metadata changes

Set `last_modified_at` on a Note only when its editorial content changes. Topic remapping, layout, styling and related-content logic do not change the Note’s editorial modification date. Index pages may update it when their public copy or structure changes.

Use at most two canonical Topics per Note or Influence. The list is ordered: the first Topic is the editorial and visual primary Topic, and any second Topic is a secondary lens. The order answers “what is this piece mainly about?” and must not be alphabetized or changed as a formatting side effect. Reordering Topics is a meaningful editorial change even when membership stays the same.

The primary Topic owns the content accent. Secondary Topics remain visible as labelled chips, but ordinary cards do not blend topic colors. If a future content object legitimately has no Topic, give it a neutral treatment instead of an arbitrary color. Do not introduce a parallel `primary_topic` field.

For every content review, confirm that the first Topic matches the central argument. For an Influence, judge the reason the external work belongs in this corpus rather than the source’s broadest subject. To add a Topic, change `_data/topics.yml` and let source validation identify every dependent contract; do not maintain a parallel prose allowlist.

## Responsive editorial behavior

Recent Thinking is a three-item curated presentation of the newest Notes. Home entry points compact below desktop width. Article “On this page” navigation is desktop-only. Series service context becomes a closed disclosure before article content on small screens. Structural section boundaries use at most one divider.
