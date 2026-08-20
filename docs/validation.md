# Validation ownership

Each invariant has one canonical owner.

## Source contracts

`scripts/validate_source.rb` answers whether repository source is internally coherent without building Jekyll. It owns front matter, permalinks, taxonomy, note and Influence metadata, editorial listing membership, Questions, Series, Home and Experience references, dependency configuration, and the source-side privacy/analytics contract.

Editorial ordering in `pages/thinking.md` is intentional source data: the complete `notes` list must contain every published note once, while `start_here` remains a curated subset.

## Generated-output contracts

`scripts/validate_site.rb` answers whether `_site` is structurally deployable. It owns required and forbidden output, sitemap/feed/robots consistency, canonical and social metadata, internal links and fragments, local assets, landmarks, image attributes and parseable JSON-LD.

Explore topic hashes are a deliberate cross-layer case: they encode application state rather than an HTML anchor. The generated validator accepts one only when the rendered Explore page exposes the same value through `data-explore-topic`; arbitrary missing fragments still fail.

The generated validator does not re-check note topics, summaries, Influence front matter or related-note references. Those are source contracts. It may use a generated URL or asset to prove that Jekyll emitted a valid output relationship, but it must not independently redefine the source rule.

## Shared mechanics

`scripts/lib/validation.rb` contains only YAML/front-matter loading, relative paths and presence checks. Business rules stay in their owning validator so they remain easy to locate.

## Validator tests

Run the focused mutation fixtures without building the production site:

```bash
ruby tests/validators/validator_test.rb
```

The suite starts from valid source/output fixtures, introduces one invalid state and asserts both non-zero exit and an actionable diagnostic. A weakened major rule should therefore fail even when the current repository happens to remain valid.
