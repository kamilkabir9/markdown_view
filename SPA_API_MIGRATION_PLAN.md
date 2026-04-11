# SPA-API Migration Plan

## Goal

Replace the current React Router SSR application with a traditional SPA frontend that consumes a separate HTTP API, while preserving the markdown browsing, reading, and annotation experience.

Tracking tag: `[SPA-API]`

## Current State

- Frontend and server are coupled through React Router v7 SSR.
- `react-router dev` and `react-router build` drive both rendering and server output.
- The runtime server is Node/Express-based and also supports CLI-style local file serving.
- File system access currently lives on the server side and is exposed through route loaders/actions rather than explicit REST endpoints.

## Target State

- A client-rendered React SPA is built with Vite and served as static assets.
- A separate API service provides markdown file discovery, file content, comment persistence, and any future metadata endpoints.
- The SPA talks to the API over HTTP using JSON.
- SSR-specific route loaders, actions, and server rendering are removed.
- Local CLI usage still works by launching the API server plus static asset hosting, or by packaging both into one production process with a clear SPA/API boundary.

## Architecture Decision

Use one repository with two app surfaces:

- `app/` or `web/` for the SPA client
- `server/` for the API

Recommended near-term deployment shape:

- Keep a single Node process in production for simplicity.
- Serve built SPA assets from Express.
- Mount API routes under `/api/*`.

This still counts as a traditional SPA-API architecture because rendering happens entirely in the browser and the frontend communicates with explicit HTTP endpoints.

## Scope

In scope:

- Remove SSR rendering dependency
- Replace route loaders/actions with API endpoints
- Add client-side data fetching and loading/error states
- Preserve markdown listing, markdown rendering, and comment flows
- Update build, dev, and start scripts
- Update CLI packaging and docs

Out of scope for first pass:

- Authentication and multi-user collaboration
- Database migration unless comment persistence already requires it
- Offline support
- Large-scale redesign unrelated to the architecture change

## Proposed API Surface

Initial endpoints:

- `GET /api/files` - list markdown files and metadata
- `GET /api/files/*path` - fetch one markdown file and metadata
- `GET /api/comments?file=...` - list comments for a file
- `POST /api/comments` - create a comment
- `PUT /api/comments/:id` - update a comment if editing exists
- `DELETE /api/comments/:id` - delete a comment if deletion exists
- jhfjfgvj

Response rules:

- Use JSON for all non-markdown responses
- Return stable error shapes: `code`, `message`, optional `details`
- Normalize file path handling and validation in one shared server utility

## Frontend Migration Strategy

1. Establish SPA entrypoint.
2. Replace server data dependencies with fetch-based client hooks.
3. Keep route structure similar to reduce UI churn.
4. Convert loading and error handling from SSR route semantics to client state.
5. Preserve URL structure where practical so existing links remain valid.

Recommended frontend approach:

- Keep React Router for client-side routing only.
- Use `createBrowserRouter` or equivalent SPA router setup.
- Introduce a thin API client in `app/lib/` or `app/utils/`.
- Keep markdown rendering components mostly unchanged.

## Server Migration Strategy

1. Isolate all file-system and comment logic behind service modules.
2. Reuse existing logic from `*.server.ts` files where possible instead of rewriting behavior.
3. Expose those services through explicit Express routes.
4. Remove SSR entrypoints only after SPA routes are functional.

Recommended server modules:

- `server/routes/files.ts`
- `server/routes/comments.ts`
- `server/services/file-service.ts`
- `server/services/comment-service.ts`
- `server/lib/errors.ts`

## Phased Execution Plan

### Phase 1: Baseline and isolation

- Inventory all current SSR-specific files, route loaders, and server-only utilities.
- Identify all data flows the browser currently receives through SSR.
- Extract reusable business logic from route files into server services if still embedded there.
- Define final API contracts before UI migration starts.

Deliverable:

- Documented endpoint contract and separated server service layer.

### Phase 2: Create API layer

- Add Express API routes under `/api`.
- Move markdown file listing and file read logic behind those routes.
- Move comment read/write operations behind those routes.
- Add consistent validation, HTTP status codes, and error responses.

Deliverable:

- API routes working independently of React Router SSR rendering.

### Phase 3: Convert frontend to SPA

- Replace SSR app bootstrap with a browser-only React entry.
- Convert route loaders to client-side data fetching.
- Add request lifecycle UI for loading, empty, and error states.
- Keep current reader and index UI behavior stable while data source changes.

Deliverable:

- Browser-rendered SPA using `/api` for all runtime data.

### Phase 4: Remove SSR infrastructure

- Remove React Router server rendering config and unused server entrypoints.
- Simplify Vite and package scripts for SPA build output.
- Remove SSR-only dependencies from `package.json`.
- Update startup flow so Express serves static assets plus API routes.

Deliverable:

- No SSR build/runtime dependency remains.

### Phase 5: Hardening and cleanup

- Verify direct deep-link navigation works with SPA fallback routing.
- Validate mobile and desktop behavior.
- Review performance of large markdown files and file indexes.
- Update README and CLI documentation.
- Remove dead code and obsolete docs.

Deliverable:

- Production-ready SPA/API application with current features preserved.

## Technical Changes Checklist

### Build and scripts

- Replace `react-router dev` with Vite dev server for the client and a parallel API dev process
- Replace `react-router build` with SPA asset build plus server build/start step
- Update `npm run start` to launch API server serving built assets

### Dependencies

Likely removable:

- `@react-router/express`
- `@react-router/node`
- `@react-router/serve`
- `@react-router/dev`
- `isbot` if used only for SSR bot handling

Likely retained:

- `react-router` for client routing
- `express`
- `react-markdown`, `remark-gfm`, `rehype-highlight`, `mermaid`

### Routing

- Keep the current URL model for file views if possible
- Add SPA fallback for non-API routes
- Prevent API route overlap with markdown path routing

### Data fetching

- Centralize fetch calls in one API client
- Handle aborts and stale requests on navigation
- Standardize optimistic or pessimistic behavior for comment mutations

### Error handling

- Show friendly API error states in the UI
- Log server-side operational errors with enough path/context data
- Distinguish not-found files from unreadable files and internal failures

## Risks

### Deep-link regression

Risk:

- Direct navigation to nested markdown routes may 404 unless static hosting falls back correctly to the SPA entry.

Mitigation:

- Add Express catch-all static fallback for non-API requests.

### File path security

Risk:

- Exposing file access via HTTP endpoints increases the need for strict path validation.

Mitigation:

- Normalize paths, reject traversal attempts, and constrain access to the configured content root.

### Comment behavior drift

Risk:

- Comments may currently depend on SSR route behavior or server-only assumptions.

Mitigation:

- Move comment logic unchanged into dedicated services before changing UI data flow.

### CLI compatibility

Risk:

- The current CLI may assume SSR build artifacts and startup semantics.

Mitigation:

- Redefine the CLI around serving static SPA assets plus API endpoints from the chosen content directory.

### Performance perception

Risk:

- First paint may feel slower without SSR.

Mitigation:

- Keep HTML shell lean, preload critical assets, and show immediate skeleton/loading states.

## Testing Plan

Before migration:

- Capture current behavior for home page, markdown page, comments, and deep links.

During migration:

- Add or update integration coverage for `/api/files` and comment endpoints.
- Add Playwright coverage for SPA navigation and hard refresh on nested routes.

Before release:

- Run `npm run typecheck`
- Run `npm run build`
- Validate local CLI flow
- Test desktop and mobile layouts
- Verify dark mode if styles changed during migration

## Acceptance Criteria

- App renders fully in the browser without SSR.
- All markdown file listing and reading flows work through `/api` endpoints.
- Comment features still work.
- Direct navigation to any supported route works after refresh.
- Production build and local CLI both run without React Router SSR dependencies.
- README reflects the new architecture and commands.

## Ticket Checklist

Use this tag in commits, PRs, kanban items, and notes: `[SPA-API]`

- [x] `SPA-API-01` `[SPA-API]` Inventory current SSR-specific files, loaders, actions, and server-only utilities.
- [x] `SPA-API-02` `[SPA-API]` Document all browser data flows currently provided through SSR and map them to explicit API contracts.
- [x] `SPA-API-03` `[SPA-API]` Extract file-system business logic into reusable server services.
- [x] `SPA-API-04` `[SPA-API]` Extract comment persistence and mutation logic into reusable server services.
- [x] `SPA-API-05` `[SPA-API]` Add shared server path validation and normalized API error handling.
- [x] `SPA-API-06` `[SPA-API]` Implement `GET /api/files` and `GET /api/files/*path` endpoints.
- [x] `SPA-API-07` `[SPA-API]` Implement comment API endpoints for list, create, update, and delete flows actually supported by the product.
- [x] `SPA-API-08` `[SPA-API]` Add API-level integration coverage for file and comment routes.
- [x] `SPA-API-09` `[SPA-API]` Replace SSR bootstrap with a browser-only SPA entry and client router setup.
- [x] `SPA-API-10` `[SPA-API]` Add a thin frontend API client and shared request helpers.
- [x] `SPA-API-11` `[SPA-API]` Migrate the file index route from SSR loaders to client-side fetching.
- [x] `SPA-API-12` `[SPA-API]` Migrate the markdown reader route from SSR loaders to client-side fetching.
- [x] `SPA-API-13` `[SPA-API]` Migrate comment read/write UI flows to use the API client.
- [x] `SPA-API-14` `[SPA-API]` Add loading, empty, and error states for all migrated SPA routes.
- [x] `SPA-API-15` `[SPA-API]` Preserve current URL behavior and ensure client routing does not collide with `/api/*` routes.
- [x] `SPA-API-16` `[SPA-API]` Update Vite, build scripts, and start scripts for SPA assets plus API server runtime.
- [x] `SPA-API-17` `[SPA-API]` Update the CLI startup flow to serve the built SPA and API against the selected content directory.
- [x] `SPA-API-18` `[SPA-API]` Remove React Router SSR entrypoints, config, and no-longer-used runtime code.
- [x] `SPA-API-18A` `[SPA-API]` Audit and remove legacy React Router SSR fallback handlers and transitional server-rendered route fallbacks.
- [x] `SPA-API-19` `[SPA-API]` Remove SSR-only dependencies from `package.json` after runtime parity is confirmed.
- [x] `SPA-API-20` `[SPA-API]` Add SPA fallback handling for deep links and verify refresh behavior on nested routes.
- [ ] `SPA-API-21` `[SPA-API]` Add Playwright coverage for SPA navigation, nested-route refresh, and key comment flows.
- [x] `SPA-API-22` `[SPA-API]` Update `README.md` and migration docs to reflect the SPA/API architecture and commands.
- [ ] `SPA-API-23` `[SPA-API]` Run final verification: typecheck, build, CLI validation, desktop/mobile checks, and cleanup of dead code.

## Recommended Order Of Work

1. Extract server services from current route/server code.
2. Add API endpoints and verify them independently.
3. Swap frontend routes to client-side fetching.
4. Remove SSR runtime and dependencies.
5. Update CLI and docs.
6. Run verification and cleanup.

## Suggested Success Metric

The migration is complete when a fresh browser request receives only the SPA shell and static assets, all application data arrives through explicit `/api` requests, and user-visible behavior remains materially unchanged.