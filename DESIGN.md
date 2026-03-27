# Design Direction

This product should feel like a calm reading tool, not a startup landing page.
It should look intentional, useful, and slightly editorial - closer to a well-made desktop app or printed journal than a trendy AI-generated website.

## Core Idea

- Prioritize the document over the interface.
- Keep the UI quiet, precise, and confident.
- Use warmth and restraint instead of visual noise.
- Let spacing, typography, and alignment do most of the work.
- Make every element look necessary.

## Desired Feeling

- Clean
- Minimal
- Thoughtful
- Human
- Desktop-like
- Editorial

The app should feel like a private reading workspace for markdown files.
Not futuristic. Not glossy. Not "designed by prompt."

## What "Not AI-Generated" Means Here

Avoid the common signals of AI-looking UI:

- no giant gradient blobs
- no glassmorphism everywhere
- no purple-on-white startup palette
- no oversized hero section with vague marketing copy
- no too-many cards inside cards inside cards
- no random pill badges for everything
- no exaggerated border radii on every component
- no generic illustrations or empty-state doodles
- no visual tricks that are louder than the content itself

If a detail does not improve reading, navigation, or clarity, remove it.

## Visual Language

### Overall Tone

Use a quiet, warm-neutral system.
The design should feel closer to paper, ink, and a modern desk than to a SaaS dashboard.

### Color Direction

Base the interface on warm neutrals with one restrained accent.

- Background: soft paper, not pure white
- Surface: slightly lifted from the background, but only subtly
- Text: dark ink, high contrast, never washed out
- Muted text: warm gray, still readable
- Accent: deep moss, slate, or muted ink-blue
- Feedback colors: understated and slightly desaturated

Suggested token direction:

```css
:root {
  --bg: oklch(0.97 0.004 85);
  --surface: oklch(0.99 0.002 85);
  --text: oklch(0.22 0.01 85);
  --muted: oklch(0.55 0.01 85);
  --border: oklch(0.89 0.004 85);
  --accent: oklch(0.43 0.05 165);
  --accent-soft: oklch(0.93 0.02 165);
}
```

The accent should appear rarely and with purpose: links, active states, focus rings, selected annotations.

## Typography

Typography should carry the identity.
It needs to feel literary and practical.

- UI font: clean, modern, unobtrusive
- Reading font: serif with warmth and texture
- Headings: elegant, compact, never shouty
- Body copy: readable, stable, slightly relaxed line-height

Preferred direction for this repo:

- UI: `Avenir Next`, `Segoe UI Variable`, `Helvetica Neue`, sans-serif
- Display/heading: `Iowan Old Style`, `Palatino Linotype`, Georgia, serif
- Reading: `Charter`, `Iowan Old Style`, Georgia, serif

Rules:

- avoid Inter as the default personality
- avoid very light font weights
- avoid giant marketing-style headlines
- use real typographic contrast instead of extra decoration
- keep line lengths comfortable for long-form reading

## Layout Principles

- Use a strong content width and keep it consistent.
- Favor vertical rhythm over dense dashboards.
- Keep generous whitespace around reading areas.
- Align to a clear grid, but do not force everything into boxed cards.
- Let the homepage feel like an index, not a sales page.

The homepage should read like a refined file library.
The markdown page should feel like opening a document on a well-designed reader.

## Component Style

### Navigation

- Simple and quiet
- Small but confident branding
- Minimal chrome
- Metadata should be present but secondary

### Search

- Prominent by placement, understated by styling
- One obvious field
- No heavy shadows or decorative icons beyond what helps recognition

### File List

- Prefer row-based or lightly grouped layouts over flashy tiled cards
- File name should dominate
- Path, size, and modified date should sit clearly in the background
- Hover states should be subtle and crisp

### Reader

- Maximize readability first
- Strong heading hierarchy
- Comfortable margins
- Clean code blocks
- Annotation styling should feel like pencil/highlighter, not neon UI chrome

### Buttons and Controls

- Default to quiet variants
- Use filled styles sparingly
- Radius should feel refined, not bubbly
- Focus states must be obvious and elegant

## Surfaces, Borders, and Shadow

- Prefer borders over heavy shadows
- Use shadows only to clarify layering
- Keep surfaces close in value so the interface stays calm
- Avoid translucent frosted panels unless there is a very specific reason

Good minimalism is about restraint, not emptiness.

## Motion

Motion should be nearly invisible.

- Small fades
- Short position shifts
- Quick response times
- No floating, bouncing, or ornamental motion

Recommended timing: 120ms to 180ms for most transitions.

## Copy Tone

The language should be plain, direct, and human.

- say what the screen does
- avoid clever slogans
- avoid startup verbs like "supercharge" or "unlock"
- avoid generic AI phrases like "reimagine your workflow"
- use calm, useful microcopy

## Mobile Behavior

- Keep the same calm visual language on mobile
- Remove clutter before shrinking elements
- Preserve tap target size and reading comfort
- Do not turn the interface into stacked decorative cards

## Anti-Patterns

Do not introduce:

- multiple accent colors competing at once
- decorative gradients as a main identity layer
- oversized empty states
- fake depth through too many shadows
- center-aligned layouts where left alignment improves reading
- excessive badges, chips, and labels
- default dashboard visuals that ignore the document-first nature of the product

## Final Standard

Before shipping a UI change, ask:

1. Does this make the document easier to read or the file easier to find?
2. Would this still look good if all decorative effects were removed?
3. Does it feel like a real product with taste, not a generated template?
4. Is the interface quieter than the content it is presenting?

If the answer to any of these is no, simplify.

## Current Applied Direction

The project has now been refactored to follow this brief more closely.
Any future UI changes should preserve these decisions unless there is a strong product reason to change them.

- Backgrounds are mostly flat, warm, and paper-like.
- Surfaces rely on borders and subtle contrast more than depth.
- File browsing uses a quiet library/index layout instead of decorative cards.
- Metadata is shown as plain text where possible, not pills or badges.
- Search is understated and utilitarian.
- Reader chrome is secondary to the document.
- Comment tools are calmer and less dashboard-like.
- Annotation styling is closer to pencil/highlighter than bright UI accents.
- Accent color is reserved for purposeful states such as links, focus, selection, and key feedback.

## Guardrails For Future Changes

When editing this product, keep these implementation guardrails in mind:

- Prefer neutral `bg-surface` or `bg-background` treatments over accent-tinted containers.
- Prefer `border-*` and light contrast changes over large shadows.
- Keep radii restrained; avoid overly round cards, panels, and controls.
- Keep hover states quiet; small text or border shifts are enough.
- Avoid re-introducing gradient icon tiles, glass blur, floating chips, or decorative badges.
- Keep empty and error states practical, left-aligned, and informative.
- Modal, drawer, and floating controls should feel light and temporary, not glossy.
- Annotation highlights should stay subtle and reading-friendly.

## Accent Usage Rule

Accent should now be treated as a scarce visual resource.
Use it for:

- links
- keyboard focus
- active reading/comment states when necessary
- loading/progress indicators
- meaningful alerts or feedback

Avoid using accent for:

- default container backgrounds
- decorative icons
- passive metadata
- non-essential borders
- multiple competing highlights on the same screen
