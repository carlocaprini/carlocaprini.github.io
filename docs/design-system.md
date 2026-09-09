# Site Design System

Date: 2026-07-14
Last updated: 2026-08-25
Status: Reference for future site changes

## Implementation ownership

The visual rules below are implemented in `_includes/styles/`, grouped by stable UI domain. `assets/css/main.css` only composes those files into the one production stylesheet; do not add independent rules to the entry point or edit generated `_site/assets/css/main.css`.

Shared tokens, navigation, hero and section primitives belong in `foundations.css`. Reuse them before adding a domain variant. Page-specific rules belong with Home, Work, Article, Thinking/Explore, Influences/Topics, Series/featured content, or Experience/Contact/Privacy. Breakpoint overrides remain centralized in `responsive.css` so responsive precedence stays inspectable.

This document defines the visual language for the site. It is based on the current direction across Home, Thinking, Explore, Work, Experience, Influences and individual notes.

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

### Color domains

Color has three separate owners. Do not infer one domain from another.

- Topic color communicates what editorial content is about.
- Functional color communicates interaction or state, such as focus, action, success or error.
- Decorative color supports structure only where it cannot be mistaken for classification.

The canonical Topic palette is:

1. Product decisions: amber `#fbbf24`, expressing attention, choice and consequences.
2. AI and automation: cyan `#22d3ee`, expressing computation, delegation and flow.
3. Software systems: indigo `#818cf8`, expressing structure, depth and interfaces.
4. Teams and collaboration: emerald `#34d399`, expressing people, interpretation and convergence.

Every Note and Influence uses its first ordered Topic as its dominant accent. Secondary Topics remain visible as labelled chips. Question paths may show several labelled Topic colors because Questions connect territories rather than owning a color. Series use sequence, and content formats use layout, not new hues.

Cyan remains the non-topic brand and interaction accent, but it enters CSS through dedicated brand or functional tokens. A cyan button does not classify its destination as AI content. Color must never carry meaning without a label, structural motif or explicit state.

### Featured Content Spectrum

Warm colors may be used to promote a small number of deliberately featured items. They extend the visual language without becoming new semantic colors:

- Yellow: `#fde047`
  Primary warm signal, label or high-contrast starting point for a call to action.

- Orange: `#fb923c`
  Transitional color between yellow and coral.

- Coral: `#fb7185`
  Expressive glow, gradient endpoint or small animated signal.

- Deep red: `#be185d`
  Dark background layer only; do not use it for body text or small controls.

Connect the warm spectrum back to the site by retaining one established cool accent, normally cyan or indigo. A featured surface can therefore move from yellow and coral into blue without looking detached from the rest of the system.

Warm colors are campaign accents, not taxonomy. Do not use them to redefine topic colors, metadata, status labels or the standard card cycle.

Each Topic and reusable brand accent has three forms:

- Solid: `#22d3ee`, `#818cf8`, `#34d399`
- Soft fill: `rgba(accent, 0.10-0.12)`
- Border: `rgba(accent, 0.26-0.30)`

Do not create a new accent for each section unless there is a clear semantic reason.

### Article topic motif

The Article topic motif gives Thinking article heroes a subtle semantic identity based on their first, visually primary Topic. It is atmospheric background information rather than an illustration or a new interface object. Topic metadata in `_data/topics.yml` is the canonical source for both color and topology family.

Its anatomy is:

- a decorative inline-SVG topology;
- the primary Topic color;
- an exclusion zone protecting hero text and metadata;
- a viewport-edge upper-right crop area;
- a monochromatic Topic glow binding the topology to the hero background;
- primary, secondary and optional tertiary paths;
- solid and dashed routes for primary and alternative paths;
- a restrained hierarchy of open, filled, terminal and authority nodes.

Geometry carries the distinction in grayscale; color reinforces it:

- Product decisions uses branching alternatives, forks and paths with different endpoints.
- AI and automation uses bounded loops, delegated paths and a visible authority-retaining anchor.
- Software systems uses offset layers, interfaces and dependencies crossing boundaries.
- Teams and collaboration uses separate inputs, divergence and partial convergence without collapsing into one path.

Two composition variants use this same grammar:

- **Balanced editorial** is contained, medium-density and comfortably secondary to the title.
- **Spatial composition** is larger, more deeply cropped and exposes additional path hierarchy without increasing opacity.

The site-level `article_topic_motif_variant` setting selects the temporary editorial default; an article may override it in front matter for evaluation. Variation is deterministic from the article URL and may make small positional changes without changing topic grammar.

Rules:

- use one primary Topic, one color and one topology family;
- keep the motif decorative and hidden from assistive technology;
- preserve the hero height, title hierarchy and existing dark background;
- derive both topology and corner glow from the same canonical Topic color;
- simplify or crop the motif at smaller breakpoints before constraining content;
- make the complete static state the design; motion is optional, finite and must respect reduced-motion preferences;
- keep Series identity in sequence and Question identity in connections rather than in this motif.

Do not use Article topic motifs for Work, Experience, Contact, global navigation, generic decoration or other non-editorial pages. Do not place them inside cards or panels, and never encode essential information in the SVG.

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

### Featured Content Panels

Use when a specific series, launch or time-sensitive editorial destination deserves more attention than surrounding content.

Recommended style:

- one warm-to-cool gradient surface combining yellow, orange or coral with an existing cyan, blue or indigo accent

- a brighter border and controlled glow that remain legible against the dark page background

- one dominant call to action using the warm spectrum and dark text

- one or two abstract decorative signals, kept behind the content and hidden from assistive technology

- slow ambient movement in the surface rather than movement of headings, descriptions or controls

The promoted content must remain recognizable as part of the site: keep the standard radius, typography, spacing and editorial language. Color and motion provide emphasis; they should not introduce a separate visual brand.

On Home, prefer a compact featured variant using the canonical cyan, indigo and emerald palette. It may retain slower ambient movement, but should remain calmer than the primary promotional treatment on a destination page such as Thinking.

Use no more than one high-emphasis featured panel in the same viewport. Nearby panels should stay calmer so the visual hierarchy remains unambiguous.

Do not use this treatment for ordinary navigation, repeated cards, all items in a collection or content that is merely new.

### Emphasis Levels

Choose the lowest level that communicates the intended hierarchy:

1. Standard card: dark neutral surface, subtle border and optional semantic accent.

2. Editorial panel: deeper cool gradient, signal marker and stronger grouping.

3. Featured content panel: warm-to-cool spectrum, contained glow, ambient motion and a dominant call to action.

Only level three introduces the warm featured spectrum. If several components compete at that level, none of them will feel featured.

### Cards

Use for repeated items: timeline cards, influence cards, map cards, support cards.

Recommended style:

- radius: `1rem` to `1.15rem`
- border: `1px solid rgba(148, 163, 184, 0.16-0.20)`
- background: `rgba(15, 23, 42, 0.64-0.90)`
- optional radial accent: `radial-gradient(circle at top left/right, accent-soft, transparent 34%)`
- hover: slight border-color change, optional `translateY(-2px)`

Repeated cards should use semantic Topic accents only when their content is classified by Topic. Otherwise use a neutral surface, one brand accent or a clear structural rhythm rather than a positional color cycle.

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
- Use only one structural divider at a section boundary. Never stack a preceding bottom border and a following top border with no meaningful content or spacing between them.
- Ruled lists use dividers between items, not after the final item. When the following section already provides its own boundary, the collection must not add a second closing line.

### Two-Column Intro

Use for section headers where one side names the section and the other explains it.

Pattern:

- left: eyebrow + title
- right: description paragraph
- desktop: `0.8fr / 1.2fr`
- mobile: stack

This pattern works well in Experience and should be reused for Home entry points and future sections.

### Editorial Split

Use when two parts belong to the same argument but need a clear hierarchy, such as scope and outcome, premise and judgment, or evidence and continuation.

- desktop: two columns separated by one light vertical rule

- mobile: stack in reading order and turn the separator into one horizontal rule

- keep both parts on the same page surface; do not introduce a second background, full border or radius

- the second part may use an eyebrow and a slightly stronger opening sentence

- prefer this pattern to a card nested inside another card when the second part is not an independent destination

### Editorial Thesis

Use for one important sentence that should interrupt a text-heavy page without becoming another card.

- keep the thesis on the page surface, with more typographic scale and whitespace than normal body copy

- one restrained abstract graphic may sit behind or beside the text when it represents a real relationship such as convergence, sequence or branching

- the graphic must remain decorative to assistive technology and the sentence must stay understandable without it

- use no more than one thesis of this visual weight on a page

- crop the composition deliberately on smaller screens without allowing horizontal overflow

Do not reuse the same abstract symbol across unrelated ideas. The visual should express the structure of the specific argument rather than act as a generic ornament.

### Connected Step Flow

Use a connected step flow when three to five ordered items form one process or progression and a card grid would incorrectly imply that they are independent.

Do not use it for unrelated items, benefits, features or collections where order does not matter.

Structure:

- an ordered list

- a two-digit step number

- a decorative node and connector

- a title and description for each step

On wide screens, use a horizontal sequence with comparable content widths. At narrow breakpoints, preserve the same markup and turn it into a vertical sequence. Connector graphics stay decorative and must not add screen-reader noise.

The pattern reuses the existing cyan and indigo accents, `--color-line`, type scale and spacing rhythm. Do not add step-specific colors, icons, panels or component-only color tokens. Motion may progressively reveal the connector, nodes and content using an owning page's established timing; reduced-motion users receive the complete static structure.

### Repeated Card Rows

For three related entry points, use the entry-card pattern:

- three cards
- small marker dot
- two-digit index
- title
- short body
- one restrained brand accent unless the cards expose explicit Topic labels

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
- order: Home, Thinking, Explore, Work, Experience, Influences, Contact
- switch to a compact, clearly labelled menu on smaller screens while preserving every top-level destination in the expanded panel
- keep the mobile menu operable without JavaScript and close it after a destination is selected when JavaScript is available
- use a visible keyboard focus state across navigation and other interactive controls

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

### Entry Cards

Use for conceptual navigation and related entry points.

Rules:

- Cards must use the accent cycle.
- Include marker + index.
- Keep body concise.
- Entire card should be clickable.
- Hover can reveal an arrow, but the card should work without relying on hover.

### Where I Can Help Split

Use on Home to make a small number of recognizable independent-work problems legible without turning the section into a service catalogue.

This pattern is intentionally different from `Entry Cards`. It should feel more consultative and operational, while `Entry Cards` should feel more navigational and conceptual.

Structure:

- left column: eyebrow, title, explanatory body copy, short advisory note and CTA
- right column: vertical capability list
- each capability: accent marker, compact surface, title, body, optional tags
- mobile: stack intro first, capability list second

Rules:

- Use the canonical accent cycle for capability markers: cyan, indigo, emerald.
- Keep capability surfaces lighter and more compact than full cards.
- Keep CTA and boundary/advisory copy in the left column, not as a separate full-width footer panel.
- Avoid making this section look like another three-card row; that creates visual duplication with `Entry Cards`.
- Avoid yellow unless there is a deliberate warm semantic reason.
- Notes should be short and confident.

### Home Contact Identity

The Home Contact section remains a low-pressure continuation path, not an author profile or promotional panel. Preserve its two-column composition on desktop and its existing explanatory copy.

Keep:

- the conversation heading and supporting copy as the primary section content

- LinkedIn as the strongest action in the secondary column, using the shared LinkedIn profile-link treatment

- one compact, non-interactive portrait and a single restrained identity tagline below the action

- the canonical portrait, LinkedIn URL, handle and tagline from person data

- a stacked mobile order of copy, LinkedIn action, then supporting identity

The Contact portrait reuses the article-signature crop and border treatment, but the two sections remain separate components with different purposes. Avoid cards, biography copy, new social-icon families, animation and visual effects that compete with the LinkedIn action.

### Influence Cards

Keep:

- card board
- topic filters
- accent by topic
- subtle staggered vertical rhythm
- hover lift
- external-link icon

Topic accents should map to the canonical accent colors. If more topics are added, reuse accents cyclically or introduce a documented semantic mapping.

The canonical public topic taxonomy is shared by Thinking notes and Influences:

- Product decisions: indigo
- AI and automation: cyan
- Software systems: sky
- Teams and collaboration: emerald

Use no more than two topics per item. The first topic is the primary theme and determines the accent used by Influence cards.

Thinking and Influences must use the same shared topic-filter component: identical pills, markers, counts, active states, spacing, and topic colors. Section-specific filter variants should not be introduced.

### Content Topic Links

Content topic links connect an individual note or reading to its thematic view in Explore. They are intentionally smaller than filter controls because they describe content rather than change the current view.

Keep:

- compact pill shape
- small semantic color marker
- canonical topic label and color
- direct link to `/explore/#topic-slug`
- no count or active state

Do not use the larger filter control inside cards, article metadata or sidebars.

### Work

Work is a first-class professional destination, but it must feel like another dimension of the same body of work rather than a separate consultancy site.

Keep:

- the standard hero, section rhythm, typography and cool accent system
- recognizable problem situations before methodology
- exactly two public engagement models: Review and Advisory
- calm grouped surfaces for the engagement models, with the Review output more prominent than activity lists
- present Review scope and outcome as an editorial split rather than nested cards
- explicit technical evidence balanced with product and organisational context
- one compact credibility bridge grounded in established Experience, presented as an editorial split rather than a CV or proof card
- a low-pressure contact panel using the standard primary button
- ruled lists with internal dividers only and no duplicate closing boundary

Avoid:

- warm featured-series styling, conversion banners or oversized CTAs
- logos, testimonials, metrics, pricing and generic consultancy claims
- scorecards, maturity ratings or visual language that grades a team
- separate cards for every possible capability
- turning Work into a new brand or making it visually louder than Thinking

On smaller screens, collapse two-column recognition and evidence structures to one column. Reduce panel padding without removing the standard page gutter, and preserve the reading order: relevance, Review, Advisory, principles, experience, next step and contact.

### Explore

Explore is the guided discovery layer connecting Thinking, Experience, selected work where concrete evidence exists, and Influences. It belongs in the global navigation because it provides a different job from the source collections: Questions offer curated editorial paths, while Topics remain the stable classification layer.

Keep:

- one generic Explore hero
- explicit Explore entry points from Home, Thinking and Influences
- three mature Questions presented as editorial paths, not dashboard tiles
- one dedicated page per Question, with grouped notes, selected Influences, an Experience bridge and one continuation path
- shared topic navigation below the curated Questions
- a selected-topic explanation before its content
- editorial note list before external readings
- standard Influence cards for readings
- one restrained contextual link from a curated Influence back to its relevant Question
- canonical topic colors and labels
- compact content-topic links that are visually distinct from the larger filter controls

Avoid:

- automatically generated Questions based only on shared tags
- top-level Question links in the global navigation
- mixed Knowledge and Explore terminology
- dashboard metrics
- graph-like decoration without navigational value
- chronological emphasis
- search controls until the content volume justifies them

### Editorial Series

A series receives a dedicated page once it contains enough published or publication-ready notes to form a useful reading path. Keep the series out of the global navigation; Thinking remains its primary entry point.

Keep:

- one compact series preview in Thinking with title, short description, episode count and a single link

- one calmer compact preview beside Start Here on Home when the series is an active editorial focus; stack it below Start Here when the available width is not sufficient

- a contained warm-to-cool spectrum in the Thinking preview, with yellow and coral as campaign accents rather than new global topic colors

- slow ambient movement that gives the preview energy without moving its content, and a fully static treatment under `prefers-reduced-motion`

- one stable `/series/series-slug/` page with a concise introduction, shared vocabulary and the complete ordered episode list

- vocabulary that introduces only services and concepts already covered by available episodes

- every episode in the general Thinking list and Explore topics

- series title and episode number in article heroes, linked back to the dedicated page

- one calm context box inside each episode when readers need orientation after arriving directly on a note; it should contain the shared series framing, one episode-specific sentence and a single link to the dedicated series page

- previous and next navigation only when an adjacent episode exists

Avoid:

- rendering the full episode collection inside Thinking

- adding Series to the global navigation

- exposing planned episode titles before their notes are available on the site

- styling the in-article context box as another featured or promotional panel

- turning the series page into a product landing page or roadmap

### Article Layout

Article pages should stay calmer than index pages.

Keep:

- single-column hero

- at most one documentary figure when a real interface materially grounds the argument

- descriptive alt text, intrinsic image dimensions and a dated caption for screenshots of changing product state

- a full-resolution link when interface details may become too small at article or mobile width

- readable article width around `620px`
- sticky side stack for page nav and related content
- related cards with restrained accents

Avoid:

- heavy animation inside articles

- generic illustrations, feature-tour galleries or screenshots whose private details require extensive explanation

- too many visual panels competing with the text

On desktop, the article sidebar order is: on-page navigation, an optional series system map, relevant Explore Questions, related notes, related readings. Compact topic links remain metadata near the article rather than becoming a competing navigation block. The system map is reserved for a series whose recurring service names need context; it complements rather than replaces the series context box in the article body. Related notes and readings may be omitted when the series and in-text links already provide enough navigation.

At narrower widths, hide “On this page” instead of moving it below the note. In a series note, render the same system map as a closed disclosure before the article text, so the vocabulary is available before it is needed without occupying the opening viewport. Remaining contextual sidebar content follows the article. Reuse the same data and list partial for desktop and mobile variants.

### Article Signature

The signature is a responsive identity surface at the end of each note. It should make the author recognizable, offer a restrained relationship CTA and connect the note to the professional layer of the site without becoming a second article conclusion.

Keep:

- name, short role label and local monochrome portrait

- the existing cyan identity marker; the portrait complements rather than replaces it

- LinkedIn as the primary relationship CTA, with a short publication-oriented explanation where space allows

- Work and Contact as lower-priority actions using the standard site link treatment

- one semantic component and one canonical set of person data across breakpoints

On desktop and portrait tablet, retain the short description and LinkedIn microcopy. On mobile, hide those supporting lines while preserving identity, portrait and all three actions. The compact state is a responsive representation of the same component, not separate content.

Avoid biographies, promotional claims, article summaries, unrelated navigation and generic icon families for the secondary actions.

### Footer

Keep the footer minimal:

- copyright
- RSS

Do not mention tooling, hosting or implementation details in the footer.

## Motion

Motion should be subtle and structural.

Approved motion:

- reveal on scroll for timeline and influence cards
- one-time reveal of complete structural units such as a section introduction, ruled list, thesis or engagement model
- hover lift of `-2px`
- soft border/glow change
- optional arrow reveal on interactive cards

- slow ambient gradient movement on a single featured content panel

- gentle drift or pulse of non-essential decorative signals inside that panel

Rules:

- Always support `prefers-reduced-motion`.

- Structural reveals should normally use opacity with only `8-14px` of movement over roughly `300-450ms`. Apply them to complete units, not every paragraph or label.

- Keep ambient loops slow: roughly `12-16s` for gradient movement, `7-10s` for a drifting glow and at least `3s` for a pulse.

- Keep text, labels and controls stationary. Motion should occur behind content or in small decorative signals.

- Stop ambient animation completely under `prefers-reduced-motion`; do not merely shorten its duration.

- Avoid constant looping animation outside a deliberately featured surface unless it communicates state.

- Avoid combining ambient motion with scroll reveal, parallax or large transforms on the same component.

- Hover movement should remain small, normally no more than `translateY(-2px)`.

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

Use `Product & Engineering` as the canonical label for the professional domain, engagement models, section titles, taxonomy descriptions and positioning metadata. In ordinary editorial prose, retain lower-case “product and engineering” when the words function grammatically rather than as the name of the domain.

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
- Every page must expose a keyboard skip link to the main content.
- Links and buttons must have an obvious `:focus-visible` treatment, not only hover feedback.
- Lists of related material and navigation items should use semantic list markup.
- Links opening a new tab must communicate that behavior to assistive technology and use `noopener noreferrer`.

## Editorial Metadata

- Public pages need a specific title and meta description when the site-wide fallback would be too generic.
- A Note's `title` remains the human/editorial title shown on the page. Do not rewrite it mechanically around search terms.
- `summary` is the short editorial description reused around the site.
- Add `meta_title` when a visible title is narrative, ambiguous or weak outside the site's context. Use it to name the underlying problem in recognizable language without keyword stuffing.
- Add `meta_description` when the summary does not clearly explain the subject or search intent. It may differ from the summary, but it must accurately describe what the page develops.
- During publication review, identify the Note's canonical Topic, relevant Explore question and deliberate internal links. Topics remain information architecture rather than SEO keywords.
- New or materially revised index pages should set `last_modified_at` so sitemap metadata remains useful.
- For Thinking notes, change `last_modified_at` only when the note's editorial content changes. Taxonomy, layout, styling, related-content logic and metadata-only maintenance do not count as a content change.
- Topic labels and descriptions live in `_data/topics.yml`; do not duplicate the canonical taxonomy in page content or layout logic.
- Remove obsolete data fields when a section is retired instead of leaving hidden alternative positioning copy in `_data` files.

### Markdown source formatting

- Leave one blank source line before and after every Markdown list.

- Always separate consecutive list items with one blank source line. Apply this consistently to editorial content and documentation so lists remain readable and easy to edit in raw Markdown.

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
  --accent-sky: #38bdf8;
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
