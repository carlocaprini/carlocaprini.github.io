# Content model

## Canonical editorial entities

- Thinking Notes live in `pages/thinking/` and own their title, summary, publication metadata, topics and body.
- Influences live in `_influences/` and own external-source metadata, topics and any deliberately selected related Note.
- Topics live in `_data/topics.yml`. Do not copy the allowed slug list into documentation or runtime code.
- Questions live in `_data/questions.yml`. They are curated reading paths across Notes, Influences and Experience, not projections of topic tags. Their Topic metadata remains editorial context and is not exposed as additional navigation on Question surfaces. Each Question defines a hero title split whose prefix and highlight must reconstruct its canonical title, plus one `entry_point` Note and a short editorial reason for beginning there. The Note must occur exactly once in that Question's sections: Question pages surface it first and omit the duplicate from the grouped path below.
- Series metadata lives in `_data/series.yml`; episode identity and sequence remain on the relevant Notes. `pages/explore.md` owns the complete reader-facing Series order.
- The three canonical Start Here Notes live in `_data/start_here.yml` and are shared by Home, Thinking and recovery surfaces.
- Home editorial modules live in `_data/home.yml`.
- The Work proposition lives in `pages/work.md`. It owns the recognizable situations, Review, Advisory, working principles and contact path; client proof must not be inferred or generated from it.
- Home’s `Where I can help` module lives in `_data/home.yml`. It is a selective preview of the problem spaces described by Work, not a second service catalogue or a source of independent engagement definitions.

## Relationships

Shared topics can rank related Notes and Influences. An Influence may select one internal Note explicitly through `related_note`. Question membership is always explicit in `_data/questions.yml`; topic overlap never adds an item to a Question automatically.

Explore exposes curated Questions first, deliberate editorial Series second and complete Topic views third. It is the canonical Series collection surface; individual Series pages live under `/series/series-slug/`, but there is no `/series/` index. Stable Topic URLs use hashes on `/explore/`; the `#series` section anchor is not Topic state. `/knowledge/` remains only as a compatibility redirect.

Work is a first-class professional destination, but it does not redefine Thinking. Home may preview selected problem spaces and link to `/work/`; its terminology, boundaries and outcome language must remain consistent with the canonical proposition. Work must not fabricate engagement connections inside Questions or turn Notes into commercial entry points.

## Public vocabulary

- **Thinking** is the collection of Carlo's Notes. A **Note** is one published internal piece.
- **Explore** is the discovery surface that connects Questions, Series and Topics. Use “ideas” for a general entry point into Explore; use “questions” or “paths” only after that narrower concept is established by the surrounding content.
- A **Question** is a curated path across Notes, professional Experience and Influences. A **Series** is an ordered sequence of Notes. A **Topic** is the broad taxonomy shared by Notes and Influences.
- **Influences** is the named collection. A **reading** is one external item; “external ideas”, “arguments” and “research” describe what those readings contribute rather than alternate collection names.
- **Experience** is Carlo's professional context. Prefer “professional experience” when copy points to that site section; reserve generic “experience” for personal knowledge or a specific lived example.
- **Work** is the independent Product & Engineering proposition. Do not use “Work” or “the work” as a generic label for the editorial corpus, professional Experience or Notes.
- **Start here** identifies a recommended first Note or a small curated set of Notes. It does not name a separate collection.

## Intentional editorial ordering

Some lists resemble derived data but are intentionally curated:

- `pages/thinking.md` contains every published Note once in its `notes` list, in editorial order.
- `_data/start_here.yml` defines the three shared Start Here selections.
- `_data/home.yml` chooses and orders Home entry points and editorial modules.
- `pages/explore.md` lists every Series once in canonical editorial order; Thinking uses that same complete order, while Home selects only one featured Series.
- Question sections choose and order their Notes and Influences.

Validators protect membership and references, but should not replace these choices with automatic chronological or taxonomic projections.

## Metadata changes

Set `last_modified_at` on a Note only when its editorial content changes. Topic remapping, layout, styling and related-content logic do not change the Note’s editorial modification date. Index pages may update it when their public copy or structure changes.

Thinking Notes are Jekyll pages, not posts. Their `date` is the original editorial publication timestamp used for ordering and RSS `pubDate`; it is not replaced by build time or `last_modified_at`. The production build defines actual publication: a future-dated Thinking page that is generated is expected in RSS, while a page suppressed by Jekyll (for example with `published: false`) is neither generated nor expected. There is no separate scheduled-RSS state.

Use at most two canonical Topics per Note or Influence. The list is ordered: the first Topic is the editorial and visual primary Topic, and any second Topic is a secondary lens. The order answers “what is this piece mainly about?” and must not be alphabetized or changed as a formatting side effect. Reordering Topics is a meaningful editorial change even when membership stays the same.

The primary Topic owns the content accent and article-motif geometry. Secondary Topics remain visible as labelled chips, but ordinary cards do not blend topic colors. Motif composition variants are presentation settings, not Topic metadata: changing between Balanced and Spatial must not change taxonomy or editorial meaning. If a future content object legitimately has no Topic, give it a neutral treatment instead of an arbitrary color. Do not introduce a parallel `primary_topic` field.

For every content review, confirm that the first Topic matches the central argument. For an Influence, judge the reason the external work belongs in this corpus rather than the source’s broadest subject. To add a Topic, change `_data/topics.yml` and let source validation identify every dependent contract; do not maintain a parallel prose allowlist.

## Responsive editorial behavior

Recent Thinking is a three-item curated presentation of the newest Notes. Home entry points compact below desktop width. Article “On this page” navigation is desktop-only. Series service context becomes a closed disclosure before article content on small screens. Structural section boundaries use at most one divider.
