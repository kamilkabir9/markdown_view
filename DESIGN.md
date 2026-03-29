# Design Direction

This product should feel like a quiet editorial workspace for people who prefer reading, scanning, and annotating documents without fighting a noisy interface.
The visual reference is a mix of modern coffee brewery packaging, printed tasting notes, and Chanel-style editorial restraint.
Borrow the calm, proportion, and confidence - not the branding.

The product is still practical software, but the mood should be composed, tactile, literate, and slightly luxurious.
It is a markdown viewer first: a calm file index, a focused reading surface, and a deliberate annotation workspace.

## Core Mood

- Minimal, contemporary, and text-first.
- Warm, dry, calm, and deliberate.
- More journal, catalog, and tasting card than colorful SaaS dashboard.
- High trust, low noise.
- Designed by a person with taste, not generated from a UI starter kit.

## Design Principles

- Let typography do most of the visual work.
- Use color sparingly; rely on spacing, weight, dividers, and surface tone first.
- Favor editorial rhythm over dense component grids.
- Make information hierarchy obvious without filling the screen with labels and badges.
- Keep interactions sharp and clear, never cute.
- Preserve readability on desktop and mobile before adding polish.

## Typography

Preferred font pairing:

- Display: `Canela` or `Bodoni Moda`
- UI and body: `Suisse Intl`, `Instrument Sans`, or `Geist`

Direction:

- Use the serif for page titles, key headings, and occasional pull-quote moments.
- Use the sans for interface controls, metadata, forms, and body copy.
- Keep headings in sentence case.
- Use tracking only for small labels and navigation, never for long passages.
- Aim for readable line lengths and generous leading; this UI should welcome long-form notes and documentation.

Rules:

- Avoid a single-font UI that feels generic or purely utilitarian.
- Avoid default Tailwind demo typography and overly light weights.
- Avoid giant marketing headlines or over-tight stacked type.
- Use typographic contrast before adding decoration.
- Keep long-form text comfortable to read for extended sessions.

## Color Palette

Use a restrained palette built from paper, roast, ink, and one accent.

- Paper: `#F4EFE7`
- Linen: `#E7DDD0`
- Ink: `#171311`
- Roast: `#4B372C`
- Brass accent: `#9C7652`
- Oxblood for destructive moments only: `#7A3A32`

Rules:

- Keep the interface mostly monochrome.
- Use one warm accent at a time.
- Avoid bright blues, neon highlights, or rainbow status systems.
- Distinguish states with contrast, typography, and layout before adding more colors.

Suggested token direction for `web/src/index.css`:

```css
:root {
  --paper: #f4efe7;
  --linen: #e7ddd0;
  --ink: #171311;
  --roast: #4b372c;
  --brass: #9c7652;
  --oxblood: #7a3a32;
}
```

## Surfaces And Shape

- Surfaces should feel like paper, card stock, stone, or matte lacquer.
- Favor crisp edges or very small radii over soft, bubbly rounding.
- Use borders and tonal shifts more than shadows.
- If texture is introduced, keep it nearly invisible.
- Avoid glassmorphism, glossy gradients, and anything that feels synthetic.

## Layout Direction

- Use generous outer margins and strong vertical rhythm.
- Build pages like editorial spreads rather than app dashboards.
- Allow asymmetry when it improves hierarchy.
- Leave real breathing room around major text blocks.
- Make lanes, rules, captions, and white space do the structuring.

The product should feel closer to a printed catalog or tasting ledger than a dense productivity suite.

## Primary Building Blocks

The design system should be organized around the actual building blocks of this product:

- Library index: the homepage that lists markdown files and helps people find what to open.
- Search: a quiet, integrated control for narrowing large file collections.
- Reader: the main rendered markdown surface, optimized for long-form reading.
- Code and content blocks: tables, lists, quotes, and fenced code that need strong readability.
- Comments and annotations: selection, highlighting, comment entry, and copied context.
- Utility chrome: navigation, metadata, dialogs, and small controls that support the document without stealing attention.

Every design decision should strengthen one of these blocks rather than introducing generic dashboard UI.

## Screen Guidance

### Library index

- Treat the homepage as the index page of a printed catalog.
- The search control should feel integrated into the page, not bolted on like a toolbar widget.
- File rows or cards should be slimmer, quieter, and more typographic than decorative.
- Prioritize file name, short context, path, and modified date.
- Favor scanning rhythm and alignment over dense boxed layouts.

### Reader

- The reader should feel closest to a manuscript or editorial proof.
- Give markdown content room to breathe with stable width, generous leading, and strong heading hierarchy.
- Reduce interface chrome so the document remains primary.
- Support long passages, lists, quotes, and code without turning the page into a component demo.

### Comments and annotations

- Annotation tools should feel precise and editorial, like margin notes rather than social feed widgets.
- Highlights should resemble pencil or restrained marker, never neon UI paint.
- Comment entry should appear deliberate and useful, never busy.
- Copied comment context should feel like a practical research workflow, not a gamified action.

### Dialogs and utility controls

- Dialogs, menus, and smaller controls should support the reading flow with minimal ceremony.
- Metadata should remain available but understated.
- Empty, loading, and error states should be calm, informative, and left-aligned.

## Interaction And Controls

- Favor quiet defaults for buttons, search fields, menus, and form fields.
- Use filled treatments sparingly and only when emphasis is necessary.
- Keep borders crisp and focus states obvious.
- Do not over-badge metadata or rely on colored chips for hierarchy.
- Make selection and hover states tactile but restrained.

## Motion

Motion should be subtle, slow, and confident.

- Favor fades, slight vertical movement, and soft staggered reveals.
- Selection and comment states should feel tactile, not playful.
- Avoid spring-heavy or overly reactive animations.
- Keep transitions present enough to clarify state, but never loud enough to become the identity.

## Copy Tone

The language should be direct, literate, and slightly editorial.

- Say what the screen does.
- Keep labels short and confident.
- Avoid startup slogans, AI cliches, and clever filler.
- Prefer practical microcopy that helps someone decide what to do next.

## Human Touch

To avoid the generic AI-generated feeling:

- Use specific hierarchy, not perfect symmetry everywhere.
- Let a few headings run larger than expected.
- Keep copy direct, literate, and slightly editorial.
- Be comfortable with restraint; not every element needs emphasis.
- Choose a few memorable details and repeat them consistently.

## Mobile Behavior

- Preserve the same calm visual language on mobile.
- Remove clutter before shrinking elements.
- Keep touch targets reliable and comfortable.
- Do not turn the experience into stacks of decorative cards.
- Protect readable line length, spacing, and document hierarchy at small widths.
- Keep the reader comfortable on mobile before preserving secondary metadata.

## Avoid

Do not introduce:

- Default Tailwind or shadcn demo aesthetics.
- Overly rounded components.
- Loud gradient hero treatments.
- Purple accents.
- Emoji-heavy cards.
- Over-badging metadata.
- Loud file cards, toolbar-heavy readers, or annotation UI that competes with the text.
- Layouts that feel frictionless, generic, or interchangeable.

## Final Standard

Before shipping a UI change, ask:

1. Does this make reading, scanning, or annotating easier?
2. Would the screen still feel elegant if decorative effects were removed?
3. Is the hierarchy clear without leaning on bright color or extra badges?
4. Does this feel composed, tactile, and intentional rather than generated?

If the answer to any of these is no, simplify.

## Current Applied Direction

The project should now be treated as an editorial document workspace rather than a generic dashboard.
Any future UI changes should preserve these decisions unless there is a strong product reason to change them.

- The palette stays warm, paper-based, and mostly monochrome.
- Typography leads the hierarchy before color, iconography, or container styling.
- Library views read like catalog indexes, not app launchers.
- Reader views prioritize long-form readability over interface chrome.
- Comments and annotations feel like careful margin notes, not chat bubbles or badges.
- Metadata is present but understated.
- Accent color is reserved for meaningful interaction and emphasis.

## Guardrails For Future Changes

When editing this product, keep these implementation guardrails in mind:

- Start visual refresh work by redefining tokens in `web/src/index.css`.
- Replace single-font direction with a serif plus grotesk pairing.
- Reduce chroma across highlights, badges, and state treatments.
- Rework spacing and hierarchy before redesigning every component.
- Prefer borders, rules, and tonal separation over depth effects.
- Keep radii restrained and surfaces matte.
- Keep hover, focus, and selection states sharp, subtle, and readable.
- Preserve the file-first clarity of the product; elegance should never make the interface vague.

## Accent Usage Rule

Accent should be treated as a scarce visual resource.
Use it for:

- links
- keyboard focus
- active or selected reading states that truly need emphasis
- progress or loading indicators
- meaningful alerts and confirmations

Avoid using accent for:

- default container backgrounds
- decorative icons
- passive metadata
- non-essential borders
- multiple competing highlights on the same screen
