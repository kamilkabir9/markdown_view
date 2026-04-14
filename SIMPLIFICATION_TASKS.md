# Simplification Tasks

This file captures the main simplification opportunities identified in the application codebase.

## High-Value Refactors

### 1. Split the document route

File: `app/routes/$.tsx`

Current issues:
- The route handles file loading, edit mode, save flow, image upload, selection anchoring, comment dialog state, outline navigation, keyboard shortcuts, unsaved-change protection, and app chrome wiring.
- The file is large and mixes orchestration, state management, and rendering concerns.

Suggested split:
- `useMarkdownDocument(routePath)`
- `useImageUpload(documentPath)`
- `usePreviewSelection(previewRef)`
- `MarkdownEditorPane`
- `MarkdownViewerPane`

Expected outcome:
- Smaller route component
- Fewer intertwined effects and state variables
- Easier testing and safer future changes

### 2. Split the comments sidebar

File: `app/components/CommentSidebar.tsx`

Current issues:
- One component owns filtering, copy formatting, editing, list rendering, markdown context extraction, and the create-comment dialog.
- UI logic and formatting logic are tightly coupled.

Suggested split:
- `CommentsList`
- `CommentCard`
- `CreateCommentDialog`
- `app/lib/comment-copy.ts` for copy/context helpers

Expected outcome:
- Smaller component surface
- Cleaner props
- Easier reuse and maintenance

### 3. Extract the settings dialog from the root layout

File: `app/root.tsx`

Current issues:
- The root layout combines app shell, settings state, settings form, loading bar, scroll-to-top button, and dev-only setup.
- The settings form is large enough to stand on its own.

Suggested split:
- `AppSettingsDialog`
- Keep `AppShellInner` focused on layout and chrome composition

Expected outcome:
- Simpler root file
- Better separation between layout and settings concerns

## Concrete Simplifications

### 4. Consolidate breadcrumb building

Files:
- `app/routes/_index.tsx`
- `app/routes/$.tsx`

Current issues:
- Breadcrumb JSX and app-chrome setup are repeated across routes.

Suggested change:
- Introduce a shared breadcrumb builder or route chrome helper.

Expected outcome:
- Less duplicated JSX
- Consistent breadcrumb behavior

### 5. Centralize file API path construction

File: `app/lib/api.ts`

Current issues:
- File path encoding logic is repeated across multiple API functions.

Suggested change:
- Add a helper such as `buildFileApiPath(path)` and reuse it for file endpoints.

Expected outcome:
- Less repeated string manipulation
- Lower chance of inconsistent URL handling

### 6. Reduce repetitive request validation on the server

File: `server/api.js`

Current issues:
- Multiple handlers repeat extraction and validation of `filePath` and related request fields.

Suggested change:
- Add small request helpers for required query/body values.

Expected outcome:
- Smaller route handlers
- More consistent API validation

### 7. Simplify optimistic comment updates

File: `app/contexts/AnnotationStore.tsx`

Current issues:
- Add, update, and delete each implement similar optimistic update and rollback patterns.

Suggested change:
- Extract shared optimistic mutation helpers inside the store.

Expected outcome:
- Less repeated state-update code
- Easier reasoning about error handling

### 8. Move file tree logic out of the index route

File: `app/routes/_index.tsx`

Current issues:
- Tree building and rendering live directly inside the route.

Suggested change:
- Extract a `FileTree` component and, if useful, a tree utility module.

Expected outcome:
- Leaner route component
- Better separation of data shaping and UI

## Small Cleanup Tasks

### 9. Remove unused `onClearSelection` prop

Files:
- `app/components/CommentSidebar.tsx`
- `app/routes/$.tsx`

Current issues:
- The prop is declared and passed but not used.

Suggested change:
- Remove the prop and related plumbing.

### 10. Simplify redundant breadcrumb conditional

File: `app/routes/$.tsx`

Current issues:
- A conditional renders the same `BreadcrumbPage` in both branches.

Suggested change:
- Collapse the redundant conditional.

### 11. Extract the settings dialog markup

File: `app/root.tsx`

Current issues:
- The dialog markup is large enough to obscure the surrounding shell structure.

Suggested change:
- Move the dialog body into a dedicated component even before larger refactors.

### 12. Review and remove unused dependencies

File: `package.json`

Current issues:
- At least one dependency appears removable from the current source search.

Suggested change:
- Audit dependencies and remove unused packages after verification.

Expected outcome:
- Smaller dependency surface
- Reduced maintenance overhead

## Suggested Order

1. Remove small dead code and redundant conditionals.
2. Extract the settings dialog from `app/root.tsx`.
3. Extract shared breadcrumb/app-chrome helpers.
4. Extract file tree logic from `app/routes/_index.tsx`.
5. Refactor `AnnotationStore` optimistic update paths.
6. Extract comment formatting and dialog logic from `CommentSidebar`.
7. Split the large document route into hooks and pane components.
8. Clean up server request helpers and API path helpers.
9. Audit and remove unused dependencies.

## Notes

- Aim to preserve current behavior while reducing file size and responsibility overlap.
- Favor extracting pure helpers first, then hooks, then UI components.
- Keep refactors incremental so typecheck and build can be validated after each step.
