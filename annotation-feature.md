# Annotation Feature Implementation Plan

## Problem with the Current Approach

The current `LineAnnotatedMarkdown` renders markdown **line-by-line**, passing each raw line to `<Markdown>`. This breaks multi-line constructs like fenced code blocks (` ```bash ` ... ` ``` `), tables, blockquotes, and lists — because `react-markdown` needs the full document context to parse them correctly.

The fix: render the **full markdown document at once** and layer annotations on top of the rendered HTML.

---

## Correct Architecture

```
Raw Markdown Source
      │
      ▼
react-markdown → Rendered HTML in DOM (full document, not line-by-line)
      │
      ▼
User selects text → capture TextQuote anchor { exact, prefix, suffix }
      │
      ▼
@floating-ui/react → position "Add Comment" popover above selection
      │
      ▼
Comment stored: { id, anchor: { exact, prefix, suffix }, text }
      │
      ▼
dom-anchor-text-quote → resolve anchor back to DOM Range → inject <mark>
      │
      ▼
Comment sidebar → copy (markdown lines + comment) to clipboard
```

---

## Libraries to Install

| Library | Purpose | Why Not X |
|---|---|---|
| `@floating-ui/react` | Position the "Add Comment" popover above text selection | Replaces react-popper + @tippyjs/react; supports virtual elements backed by Range.getBoundingClientRect() |
| `dom-anchor-text-quote` | Store & re-resolve text anchors that survive re-renders | Extracted from Hypothesis; the only correct answer for annotations over re-rendered HTML |

```bash
bun add @floating-ui/react dom-anchor-text-quote
```

**Not using:**
- `react-text-annotate` — works on plain text strings only, not rendered HTML
- ProseMirror/Remirror — requires replacing react-markdown with an editor; overkill for read-only view
- `react-popper` / `@tippyjs/react` — deprecated in favour of @floating-ui

---

## Data Model

### Annotation (replaces current Comment)

```ts
interface Anchor {
  exact: string;    // the selected text
  prefix: string;   // up to 32 chars before
  suffix: string;   // up to 32 chars after
}

interface Annotation {
  id: string;
  anchor: Anchor;   // TextQuoteSelector — survives re-renders
  text: string;     // user's comment
  createdAt: Date;
}
```

**Why TextQuoteSelector over character offsets:**
Character offsets (start/end integers) break the moment React re-renders and the DOM shifts. TextQuoteSelector re-anchors by fuzzy-matching the exact phrase + surrounding context — the same approach used by Hypothesis (W3C Web Annotation standard) and Plannotator.

---

## Files to Change

| File | Action | Notes |
|---|---|---|
| `app/contexts/CommentStore.tsx` | Update | Swap line-number ranges for `Anchor` type |
| `app/components/LineAnnotatedMarkdown.tsx` | Rewrite | Full markdown render + mouseup handler |
| `app/components/CommentDialog.tsx` | Minor cleanup | Remove unused `startLine`/`endLine` props |
| `app/routes/$.tsx` | Minor | No structural changes needed |

## New Files to Create

| File | Purpose |
|---|---|
| `app/components/SelectionPopover.tsx` | Floating "Add Comment" button shown on text selection |
| `app/components/CommentHighlighter.tsx` | useEffect that resolves anchors → DOM Ranges → injects `<mark>` |
| `app/components/CommentSidebar.tsx` | List of all comments with copy + delete actions |

---

## Step-by-Step Implementation

### Step 1 — Install dependencies
```bash
bun add @floating-ui/react dom-anchor-text-quote
```

### Step 2 — Update `CommentStore`
- Replace `startLine`/`endLine` fields with `anchor: Anchor`
- Rename `Comment` → `Annotation` throughout
- Keep `addComment`, `removeComment` but update signatures

### Step 3 — Rewrite `LineAnnotatedMarkdown`
Render full content in one shot:
```tsx
<div ref={containerRef} onMouseUp={handleSelectionEnd}>
  <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
</div>
```

`handleSelectionEnd`:
1. `window.getSelection()` — if empty/collapsed, return
2. Get `Range` from selection
3. Use `dom-anchor-text-quote`: `TextQuoteAnchor.fromRange(container, range)` → `{ exact, prefix, suffix }`
4. Save range bounding rect, open `SelectionPopover`

### Step 4 — Build `SelectionPopover`
Uses `@floating-ui/react` with a **virtual reference element** (no real DOM node needed):

```ts
refs.setReference({
  getBoundingClientRect: () => selectionRect,  // saved from Range
});
```

Shows a small "Add Comment" button. On click → open `CommentDialog`.

### Step 5 — Build `CommentHighlighter`
A `useEffect([annotations, content])` that:
1. Removes all existing `<mark data-annotation>` elements from the container
2. For each annotation, calls `TextQuoteAnchor.fromSelector(container, anchor).toRange()` to get a live DOM Range
3. Wraps the range with a `<mark>` element (using TreeWalker to handle cross-element selections safely)
4. Attaches `data-annotation-id` to the mark for click-to-show

**Fallback plan:** Use the **CSS Custom Highlight API** (`CSS.highlights`) instead of DOM surgery — avoids breaking code blocks entirely. Feature-detect and use `<mark>` as fallback for older browsers.

### Step 6 — Build `CommentSidebar`
Right-side panel showing all annotations:
- Quoted text (truncated)
- Comment text
- **Copy button** → produces:
  ```
  <original markdown lines containing the selection>

  // Comment: <user note>
  ```
  To find the markdown lines: search raw `content` string for `anchor.exact`, extract surrounding line context.
- **Delete button** → `removeAnnotation(id)`, highlighter re-runs

### Step 7 — Wire into `$.tsx`
Wrap in `AnnotationStoreProvider`, render `LineAnnotatedMarkdown` + `CommentSidebar` side-by-side.

---

## Known Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| `range.surroundContents()` throws when selection crosses element boundaries (e.g. `<code>` → `<p>`) | Use TreeWalker to split text nodes individually; or use CSS Highlight API which never touches DOM structure |
| Highlights disappear after theme change (re-render) | `useEffect` with `[annotations, content]` deps reruns highlighter after every render cycle |
| Multiple overlapping annotations | Process from last→first in document order; use semi-transparent `background-color` on `<mark>` |
| SSR — `document`/`window` not available on server | All DOM manipulation inside `useEffect` — only runs client-side |
| `dom-anchor-text-quote` TypeScript types | Package ships types; may need `@types/dom-anchor-text-quote` or manual `.d.ts` if missing |

---

## Copy Format (Cursor IDE / Plannotator style)

```
## Quick Start

```bash
bun install
bun run dev
```

// Comment: This section needs a note about needing Bun v1.0+ specifically
```

The raw markdown lines (not rendered HTML) are extracted by finding `anchor.exact` in the source string and then walking back/forward to line boundaries.

---

## Implementation Order

1. `bun add @floating-ui/react dom-anchor-text-quote`
2. Update `CommentStore` — new `Annotation` + `Anchor` types
3. Rewrite `LineAnnotatedMarkdown` — full render + `onMouseUp` → TextQuote capture
4. Build `SelectionPopover` — Floating UI virtual anchor → "Add Comment" button
5. Build `CommentHighlighter` — `useEffect` + TreeWalker or CSS Highlight API
6. Build `CommentSidebar` — list + copy/delete
7. Implement copy format — find anchor.exact in raw markdown, extract line context
8. Clean up `CommentDialog` (remove leftover line-number props)
9. Test: code blocks, tables, multi-paragraph, theme switching, re-anchor after re-render
