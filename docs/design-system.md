# Site Design System

Date: 2026-07-10
Status: Reference for future site changes

This document defines the visual language for the site. It is based on the current direction across Home, Thinking, Experience and Influences, especially the more dynamic work introduced in Experience and Influences.

## Design Intent

The site should feel like an editorial product workspace: thoughtful, precise, technical enough to be credible, but not cold or dashboard-like.

The visual language should support:

- Calm authority: dark, focused, low-noise surfaces.
- Connected thinking: visible relationships between notes, experience, influences and advisory work.
- Subtle motion: movement should reveal structure, not decorate the page.
- Product/platform maturity: components should feel systematic, not like isolated experiments.
- Human readability: text-heavy sections must remain comfortable and editorial.

Avoid:

- Overly technical diagrams unless they are genuinely beautiful and self-explanatory.
- Large generic blue panels that flatten the site into a single color.
- Decorative effects that do not express hierarchy, connection or state.
- Marketing-page language that sounds too sales-oriented.

## Core Palette

The site uses a dark neutral base plus three recurring accents.

### Base Colors

- `ink-950`: `#050711`
  Main page background.
- `ink-900`: `#020617`
  Deep shadow and inset surface layer.
- `slate-900`: `#0f172a`
  Primary card surface.
- `slate-800`: `#1e293b`
  Elevated or active surface.
- `text-primary`: `#f9fafb`
  Main headings and strong labels.
- `text-secondary`: `#cbd5e1`
  Secondary strong text.
- `text-muted`: `#9ca3af`
  Body copy, descriptions and metadata.
- `line-muted`: `rgba(148, 163, 184, 0.16-0.28)`
  Borders, dividers and subtle structure.

### Accent Colors

Use this canonical accent cycle:

1. Cyan: `#22d3ee`
   Primary motion, technical/product energy and first items.
2. Indigo: `#818cf8`
   Thinking, decision-making and second items.
3. Emerald: `#34d399`
   Teams, adaptation and third items.
4. Sky: `#38bdf8`
   Optional supporting accent.

Use yellow sparingly. `#facc15` can work as a rare warm signal, but it is not part of the core card cycle.

Each accent should usually have three forms:

- Solid: `#22d3ee`, `#818cf8`, `#34d399`
- Soft fill: `rgba(accent, 0.10-0.12)`
- Border: `rgba(accent, 0.26-0.30)`

Do not create a new accent for each section unless there is a clear semantic reason.

## Surfaces

### Page Background

The global background should remain dark and atmospheric:

- dark base
- one or two very soft radial gradients
- no visible decorative blobs or standalone orbs

The background should not compete with content sections.

### Editorial Panels

Use for important grouped content such as `Selected notes`.

Recommended style:

- border: `1px solid rgba(96, 165, 250, 0.24-0.30)`
- radius: `22-28px`
- background: dark blue/ink gradient with restrained cyan or indigo accent
- optional small signal dot or ring

Use sparingly. A page should generally have one major editorial panel, not many.

### Cards

Use for repeated items: timeline cards, influence cards, map cards, support cards.

Recommended style:

- radius: `1rem` to `1.15rem`
- border: `1px solid rgba(148, 163, 184, 0.16-0.20)`
- background: `rgba(15, 23, 42, 0.64-0.90)`
- optional radial accent: `radial-gradient(circle at top left/right, accent-soft, transparent 34%)`
- hover: slight border-color change, optional `translateY(-2px)`

Repeated cards should either use the accent cycle or a clear structural rhythm.

## Typography

The site uses Inter and should keep an editorial, product-like scale.

### Type Scale

- Hero title: `clamp(2.5rem, 3.2vw, 3rem)`
- Page section title: `1.1rem`
- Card title: `0.98-1.05rem`
- Body text: `0.92-1.02rem`
- Metadata / labels: `0.70-0.78rem`

### Rules

- Do not use oversized type inside cards or compact panels.
- Eyebrows should be uppercase with positive letter spacing: `0.08em-0.16em`.
- Body text should use generous line height: `1.7-1.8`.
- Avoid negative letter spacing except for the hero title, where the current `-0.03em` is acceptable.
- Text-heavy cards need enough width to avoid narrow vertical reading columns.

## Layout

### Container

- Max width: `960px`
- Horizontal padding: `1.5rem`

This should remain the default. Wider layouts need a specific reason.

### Section Rhythm

- Page top padding: around `4.5rem`
- Major section spacing: around `3rem-4rem`
- Home sections may use subtle dividers between sections.

### Two-Column Intro

Use for section headers where one side names the section and the other explains it.

Pattern:

- left: eyebrow + title
- right: description paragraph
- desktop: `0.8fr / 1.2fr`
- mobile: stack

This pattern works well in Experience and should be reused for Home `Map` and future sections.

### Repeated Card Rows

For three related entry points, use the `Map` pattern:

- three cards
- small marker dot
- two-digit index
- title
- short body
- accent cycle cyan / indigo / emerald

This is visually stronger and more consistent than plain side-by-side cards.

### Timeline

Use only when chronology or progression matters.

Experience timeline rules:

- central line on desktop
- neutral marker with accent dot
- alternating cards
- no year labels inside the marker unless the year itself is the main information
- mobile collapses to left rail

Do not reuse timeline styling for non-chronological content.

## Components

### Header / Nav

- sticky dark translucent header
- compact brand pill
- nav links with underline on hover/active
- order: Home, Thinking, Experience, Influences, Contact

Do not add more top-level links unless a new section becomes a major permanent destination. Contact can remain an anchor.

### Hero

Hero should establish positioning, not explain everything.

Recommended structure:

- eyebrow label
- strong H1 with one highlighted phrase
- 2-3 short paragraphs maximum
- 1 primary CTA, 1 secondary CTA
- optional side visual

Side visual rules:

- It must be immediately understandable.
- It should not look like a dashboard unless the page itself is a tool.
- It should not duplicate the content as an abstract diagram.
- If a visual does not add meaning or beauty, remove it.

### Selected Notes Panel

Keep:

- large editorial panel
- cyan/indigo gradient
- title and description on one side
- selected list on the other
- small signal ornament

Use similar treatment only for high-importance content.

### Map Cards

Use for conceptual navigation and related entry points.

Rules:

- Cards must use the accent cycle.
- Include marker + index.
- Keep body concise.
- Entire card should be clickable.
- Hover can reveal an arrow, but the card should work without relying on hover.

### Support Split

Use for `Where I can help` and future advisory/service descriptions.

This pattern is intentionally different from `Map Cards`. It should feel more consultative and operational, while `Map Cards` should feel more navigational and conceptual.

Structure:

- left column: eyebrow, title, explanatory body copy, short advisory note and CTA
- right column: vertical capability list
- each capability: accent marker, compact surface, title, body, optional tags
- mobile: stack intro first, capability list second

Rules:

- Use the canonical accent cycle for capability markers: cyan, indigo, emerald.
- Keep capability surfaces lighter and more compact than full cards.
- Keep CTA and boundary/advisory copy in the left column, not as a separate full-width footer panel.
- Avoid making this section look like another three-card row; that creates visual duplication with `Map Cards`.
- Avoid yellow unless there is a deliberate warm semantic reason.
- Notes should be short and confident.

### Influence Cards

Keep:

- card board
- topic filters
- accent by topic
- subtle staggered vertical rhythm
- hover lift
- external-link icon

Topic accents should map to the canonical accent colors. If more topics are added, reuse accents cyclically or introduce a documented semantic mapping.

### Article Layout

Article pages should stay calmer than index pages.

Keep:

- single-column hero
- readable article width around `620px`
- sticky side stack for page nav and related content
- related cards with restrained accents

Avoid:

- heavy animation inside articles
- too many visual panels competing with the text

### Footer

Keep the footer minimal:

- copyright
- RSS

Do not mention tooling, hosting or implementation details in the footer.

## Motion

Motion should be subtle and structural.

Approved motion:

- reveal on scroll for timeline and influence cards
- hover lift of `-2px`
- soft border/glow change
- optional arrow reveal on interactive cards

Rules:

- Always support `prefers-reduced-motion`.
- Avoid constant looping animation unless it communicates state.
- Avoid motion inside dense reading surfaces.

## Content Voice

The site should sound precise, reflective and useful.

Preferred wording:

- support
- clarify
- trade-offs
- decision-making
- operating flows
- product/platform systems
- teams evolve over time

Use carefully:

- challenge
- transformation
- advisory
- consulting

Avoid:

- generic sales language
- overpromising
- language that minimizes the work when the intended scope is broader

## Accessibility

Minimum rules:

- Interactive cards must be real links when they navigate.
- External links should include an icon and accessible hidden text.
- Text contrast must remain high against gradient surfaces.
- Decorative markers should use `aria-hidden="true"`.
- Motion must respect `prefers-reduced-motion`.
- Mobile layout must be checked for horizontal overflow.

## Implementation

The CSS should use design tokens for recurring values:

```css
:root {
  --color-bg: #050711;
  --color-surface: rgba(15, 23, 42, 0.82);
  --color-surface-soft: rgba(15, 23, 42, 0.64);
  --color-text: #f9fafb;
  --color-text-muted: #9ca3af;
  --color-line: rgba(148, 163, 184, 0.18);
  --accent-cyan: #22d3ee;
  --accent-indigo: #818cf8;
  --accent-emerald: #34d399;
  --radius-card: 1rem;
  --radius-panel: 1.4rem;
}
```

Do not do a full CSS refactor unless it is attached to a visual cleanup. The safer path is:

1. Define tokens.
2. Apply tokens to one component family.
3. Verify visually.
4. Repeat.

## Change Checklist

Before adding or changing a section, check:

- Does it use the canonical accent cycle?
- Is it a panel, a card group, a timeline, or a plain editorial section?
- Is the visual treatment proportional to the importance of the content?
- Does the section introduce a new color, radius, shadow or motion pattern? If yes, why?
- Does it work at mobile width without narrow text columns or overflow?
- Does the copy sound like Carlo's voice rather than generic consulting copy?
- Does the component already exist somewhere else in the site?
