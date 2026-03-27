# Design Fix List

Use this file as the working task list for bringing the project in line with `DESIGN.md`.

## Priority 1

- [x] Remove decorative background treatment from `app/styles/tailwind.css:21` and `app/styles/tailwind.css:47`; replace the layered radial/gradient atmosphere with a flatter warm-paper background and much subtler depth.
- [x] Simplify the homepage structure in `app/routes/_index.tsx:133`, `app/routes/_index.tsx:163`, and `app/routes/_index.tsx:197`; move from nested cards to a cleaner library/index layout with rows or lightly separated list items.
- [x] Eliminate glassmorphism across core surfaces: `app/routes/_index.tsx:54`, `app/components/ThemeSwitcher.tsx:19`, `app/components/LineAnnotatedMarkdown.tsx:204`, `app/components/LineAnnotatedMarkdown.tsx:307`, `app/components/LineAnnotatedMarkdown.tsx:346`, `app/components/LineAnnotatedMarkdown.tsx:368`; remove `backdrop-blur*`, translucent overlays, and frosted-panel styling.
- [x] Reduce badge/chip noise across primary UI, especially `app/root.tsx:104`, `app/root.tsx:107`, `app/routes/_index.tsx:168`, `app/routes/_index.tsx:212`, `app/routes/_index.tsx:225`, `app/routes/_index.tsx:228`; keep metadata as plain text or quieter inline labels.

## Priority 2

- [x] Tone down the reader chrome in `app/components/LineAnnotatedMarkdown.tsx:204`, `app/components/LineAnnotatedMarkdown.tsx:272`, and `app/components/LineAnnotatedMarkdown.tsx:307`; make the document area dominant and the controls feel secondary.
- [x] Simplify comment sidebar styling in `app/components/CommentSidebar.tsx:228`, `app/components/CommentSidebar.tsx:234`, `app/components/CommentSidebar.tsx:277`, and `app/components/CommentSidebar.tsx:327`; reduce card weight, chip usage, and active-state flashiness.
- [x] Replace bubbly radii throughout the app, especially `rounded-full` controls in `app/root.tsx:56`, `app/routes/$.tsx:106`, `app/components/LineAnnotatedMarkdown.tsx:223`, and `app/components/CommentSidebar.tsx:244`; shift to restrained rounded corners.
- [x] Reduce heavy shadows in key surfaces like `app/routes/_index.tsx:163`, `app/components/LineAnnotatedMarkdown.tsx:272`, and `app/components/CommentSidebar.tsx:228`; rely more on borders and contrast than depth.

## Priority 3

- [x] Simplify search styling in `app/routes/_index.tsx:176`; keep it prominent by placement, but remove pill-like styling and decorative inset shine.
- [x] Remove ornamental icon treatments and gradient icon containers in `app/root.tsx:91`, `app/routes/_index.tsx:97`, `app/routes/_index.tsx:207`, and `app/routes/$.tsx:83`; icons should support navigation, not brand the whole interface.
- [x] Tone down motion on hover in `app/routes/_index.tsx:204` and similar spots; keep transitions quick and nearly invisible.
- [x] Rework centered theatrical empty/error states in `app/routes/_index.tsx:95` and `app/routes/$.tsx:81`; make them feel more like practical app states and less like feature panels.

## Priority 4

- [x] Reduce uppercase tracking-heavy micro-label styling in `app/routes/_index.tsx:55`, `app/components/ThemeSwitcher.tsx:28`, `app/components/LineAnnotatedMarkdown.tsx:378`, and `app/components/CommentSidebar.tsx:389`; the brief favors typographic confidence over decorative labeling.
- [x] Review theme surfaces in `app/styles/themes.css:30`, `app/styles/themes.css:39`, `app/styles/themes.css:57`, and `app/styles/themes.css:83`; some gradient shell backgrounds may still feel too designed.
- [x] Audit remaining accent usage so it becomes rarer and more purposeful; right now it appears in too many containers, pills, and highlights.

## Recommended Implementation Order

1. `app/styles/tailwind.css`
2. `app/routes/_index.tsx`
3. `app/components/LineAnnotatedMarkdown.tsx`
4. `app/components/CommentSidebar.tsx`
5. `app/root.tsx`
6. `app/components/ThemeSwitcher.tsx`
7. `app/routes/$.tsx`

## Agent Notes

- Follow `DESIGN.md` as the source of truth.
- Prefer quieter surfaces, fewer decorative effects, and simpler hierarchy.
- Prioritize document readability and file discoverability over visual flourish.
- Before shipping each change, check whether the interface is quieter than the content it presents.
