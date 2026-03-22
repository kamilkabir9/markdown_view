# Issues Summary

## Critical / Security

### 1. Path Traversal Vulnerability in `files.server.ts`
**File:** `app/utils/files.server.ts:42-58`

The `getMarkdownContent` function does not validate or sanitize the `pathname` parameter. An attacker can use `../` sequences to read arbitrary files outside the project directory (e.g., `/../../etc/passwd`). The `join(ROOT_DIR, pathname)` call does not restrict traversal.

**Fix:** Validate that the resolved path stays within `ROOT_DIR`:
```ts
const resolved = resolve(ROOT_DIR, pathname);
if (!resolved.startsWith(ROOT_DIR)) {
  return null;
}
```

### 2. `walkDir` Exposes Sensitive Files
**File:** `app/utils/files.server.ts:14-36`

The directory walker only skips `node_modules` and dot-prefixed directories, but lists all `.md` files including potentially sensitive ones (e.g., `.env.md` patterns in non-dot directories, or files outside intended scope). The `ROOT_DIR = process.cwd()` means the entire project tree is exposed.

---

## Bugs

### 3. DaisyUI Theme Not Applied on Client
**File:** `app/root.tsx:17`

The `data-theme="light"` attribute is hardcoded on the `<html>` tag in the server-rendered layout. The `ThemeContext` stores the theme in React state and `localStorage`, but never updates the `data-theme` attribute on the DOM. DaisyUI's CSS relies on `[data-theme="..."]` selectors, so switching themes only affects custom CSS classes, not DaisyUI components.

**Fix:** Add a `useEffect` in `ThemeProvider` or `App` that sets `document.documentElement.setAttribute('data-theme', theme)`.

### 4. SSR Hydration Mismatch in `ThemeProvider`
**File:** `app/contexts/ThemeContext.tsx:15-19`

The theme is initialized as `'default'` on the server, then read from `localStorage` on the client via `useEffect`. This causes a hydration mismatch if the user previously selected a non-default theme — the server renders `data-theme="light"` but the client will have a different theme after mount.

### 5. Annotations Lost on Navigation / Refresh
**File:** `app/contexts/AnnotationStore.tsx:26`

Annotations are stored in React `useState` with no persistence. Navigating between files or refreshing the page destroys all comments. The `AnnotationStoreProvider` wraps each page individually, so annotations don't even persist across route changes within the same session.

### 6. `handleAnnotationClick` Is a No-Op
**File:** `app/components/LineAnnotatedMarkdown.tsx:96`

```ts
const handleAnnotationClick = useCallback((_annotation: Annotation) => {}, []);
```

Clicking a highlighted annotation in the rendered markdown does nothing. The user expects to see the comment or have it highlighted in the sidebar.

### 7. `navigator.clipboard` May Fail Silently
**File:** `app/components/CommentSidebar.tsx:54,59,70`

`navigator.clipboard.writeText()` is called without error handling. It will reject on insecure origins (non-HTTPS), when the document is not focused, or when the user denies clipboard permission. This causes silent failures with no user feedback.

### 8. Event Listener Memory Leak in `CommentHighlighter`
**File:** `app/components/CommentHighlighter.tsx:67-68`

Click event listeners are added to `<mark>` elements but never explicitly removed. When annotations are removed and re-added, old listeners on detached nodes may linger. While the DOM nodes are removed, the ref-based cleanup doesn't clear all listeners reliably.

---

## Code Quality

### 9. Syntax Highlighting Not Implemented
**File:** `app/components/LineAnnotatedMarkdown.tsx:133`

The README claims syntax highlighting for code blocks as a feature, but no syntax highlighting library (e.g., `rehype-highlight`, `react-syntax-highlighter`, `prismjs`) is installed or configured. Code blocks render as plain monospace text.

### 10. Empty `app/types/` Directory
**File:** `app/types/` (empty)

The `app/types/` directory exists but contains no files. Either it's a leftover from a planned feature or should be removed.

### 11. Race Condition in `CommentHighlighter` Processing Guard
**File:** `app/components/CommentHighlighter.tsx:15-19,38-41`

The `isProcessing` ref is checked synchronously but the actual work is deferred via `import().then(requestAnimationFrame())`. If annotations change again during the async window, the guard has already been released (`finally` block), allowing concurrent processing that could corrupt the DOM.

### 12. Unused `React` Import
**File:** `app/contexts/ThemeContext.tsx:1`

`React` is imported but not directly used (JSX transform handles it). With `"jsx": "react-jsx"` in tsconfig, the explicit import is unnecessary.

### 13. Dead CSS Rules
**File:** `app/styles/themes.css:321-338`

The `.markdown-line` and `.markdown-line:hover` CSS rules reference elements that are never rendered in the current codebase. These appear to be leftover from a previous line-by-line rendering approach.

---

## Build / Config

### 14. TypeScript Type Generation Errors
**Output:** `bun run typecheck`

The `.react-router/types/` generated files reference `.js` module paths that don't exist. This produces 11 TS2307 errors. While `skipLibCheck: true` in tsconfig helps, the typecheck command fails.

**Fix:** Either regenerate types with `react-router typegen`, add the generated types directory to `exclude` in tsconfig, or fix the module resolution.

### 15. `scratchpad.txt` Committed to Git
**File:** `scratchpad.txt`

This developer scratch file is tracked in git despite being in `.gitignore`. It was likely committed before the gitignore rule was added.

### 16. No `.env.example` or Environment Documentation
The README mentions `PORT=8080 bun run start` but there's no `.env.example` file documenting available environment variables.

---

## UX / Design

### 17. Sidebar Pushes Content on Small Viewports
**File:** `app/components/LineAnnotatedMarkdown.tsx:110`

The flex layout (`flex gap-4`) with a fixed-width sidebar (`w-64`) and `flex-1` content area doesn't handle small screens well. On narrow viewports, the sidebar will squeeze or overflow the markdown content.

### 18. No Loading State for Dynamic Import
**File:** `app/components/LineAnnotatedMarkdown.tsx:53`

`dom-anchor-text-quote` is dynamically imported on first selection. There's no loading indicator — the user may see a brief delay before the comment popover appears.

### 19. Global Comments Not Rendered Visually
Global comments (added via the "Add Comment" button) are stored but have no visual indicator in the markdown view. They only appear in the sidebar, making them easy to miss.

---

## Summary Table

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | Critical | Security | Path traversal in `getMarkdownContent` |
| 2 | High | Security | `walkDir` exposes full project tree |
| 3 | High | Bug | DaisyUI theme attribute not updated |
| 4 | Medium | Bug | SSR hydration mismatch |
| 5 | Medium | Bug | Annotations not persisted |
| 6 | Low | Bug | Click handler is no-op |
| 7 | Medium | Bug | Clipboard errors unhandled |
| 8 | Low | Bug | Event listener leak |
| 9 | Medium | Quality | Missing syntax highlighting |
| 10 | Low | Quality | Empty types directory |
| 11 | Medium | Quality | Race condition in highlighter |
| 12 | Low | Quality | Unused React import |
| 13 | Low | Quality | Dead CSS rules |
| 14 | Medium | Config | TypeScript typegen errors |
| 15 | Low | Config | Scratch file in git |
| 16 | Low | Config | No env documentation |
| 17 | Low | UX | Responsive layout issue |
| 18 | Low | UX | No loading indicator |
| 19 | Low | UX | Global comments not visible |
