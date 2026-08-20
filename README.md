# carlocaprini.github.io

Carlo Caprini’s personal editorial site, built with Jekyll and deployed through GitHub Pages.

## Run locally

Docker keeps the Ruby/Jekyll runtime isolated:

```bash
docker compose up site
```

Open [http://localhost:4000](http://localhost:4000). Content and layout changes rebuild automatically with LiveReload.

Ordinary local development sends no analytics. To exercise the isolated aggregate-measurement environment, follow [`_analytics/README.md`](_analytics/README.md).

## Verify a change

The repository-owned check interface is:

```bash
bin/check source
bin/check generated
bin/check analytics
bin/check browser
bin/check visual
bin/check all
```

Use the narrowest relevant check while iterating and the full relevant gate before completion. [`docs/testing.md`](docs/testing.md) explains prerequisites, focused variants and the CI mapping.

## Repository map

- [`AGENTS.md`](AGENTS.md): concise operational map for humans and coding agents.
- [`docs/architecture.md`](docs/architecture.md): runtime, build, analytics and deployment boundaries.
- [`docs/content-model.md`](docs/content-model.md): Notes, Influences, Questions, Series, Topics and curated ordering.
- [`docs/testing.md`](docs/testing.md): verification layers and command matrix.
- [`docs/validation.md`](docs/validation.md): ownership of source and generated-site invariants.
- [`docs/design-system.md`](docs/design-system.md): canonical visual language.
- [`contracts/analytics.json`](contracts/analytics.json): machine-readable analytics and campaign vocabulary.
- [`_analytics/README.md`](_analytics/README.md): aggregate collector, privacy model and operational setup.
- [`visual-reference/README.md`](visual-reference/README.md): versioned representative screenshots.

Canonical values such as topic slugs and analytics events live in machine-readable source, not in this README.

## Editorial ownership

AI helps with research, critique, drafting and implementation. The experience, positions and final editorial decisions remain Carlo’s.
