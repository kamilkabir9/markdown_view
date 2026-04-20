# AGENTS.md
fgfgfgfgfgfbvvbddddd
> Project conventions and best practices for AI coding agents working on this codebase.
> Last updated: 28-Mar-2026 tttyyy
vvv
---

## Project Overview
ssss
- **Framework**: React Router v7 with TypeScript
- **UI Library**: shadcn/ui (file-based, in `app/components/ui/`)
- **Styling**: Tailwind CSS v4
- **React**: v19
sss
---

## Code Quality & Principles

### DRY (Don't Repeat Yourself)

- Extract repeated logic into **utility functions** (`app/utils/`)
- Extract repeated UI into **reusable components** (`app/components/`)
- Add **shared hooks** in `app/hooks/` when repeated state/effect patterns appear
- If you copy-paste code more than once, refactor it into a shared module
- Prefer **composition** over duplication; build complex UIs from small components

### TypeScript

- Use strict types; avoid `any` unless absolutely necessary
- Define shared types in `types/` or near the feature when local
- Use `type` for unions/intersections and `interface` for object shapes
- Prefer **explicit return types** on exported functions
- Use **generics** for reusable utilities and hooks

### File Organization

```text
app/
|- components/   # Reusable UI components
|  `- ui/        # shadcn/ui primitives (do not modify directly)
|- contexts/     # React context providers
|- lib/          # Utility functions (cn helper, etc.)
|- routes/       # Route-level components
|- styles/       # Global and shared styles
`- utils/        # Utility functions and helpers
```

---

## shadcn/ui Best Practices

### Component Usage

- Components live in `app/components/ui/` — treat them as your own code
- Import components with `~/components/ui/<component>` path alias
- Use `cn()` from `~/lib/utils` for merging Tailwind classes
- Use **lucide-react** for icons (`import { IconName } from 'lucide-react'`)
- Use `variant` and `size` props defined by CVA in each component

### Styling

- Use shadcn built-in **variants and sizes** before custom styling
- Leverage **CSS variables** (e.g., `--primary`, `--muted`, `--border`) for theming
- Use Tailwind utility classes for layout adjustments
- Avoid overriding shadcn styles with `!important` or deep CSS selectors
- Respect the existing theme system when changing colors or surfaces

### Theming

- Use `oklch()` color format for custom colors when extending the theme
- Define custom tokens via CSS variables in `:root` and `.dark` blocks
- Test both **light and dark mode** when modifying colors
- The `data-theme="dark"` attribute and `.dark` class toggle dark mode

### Adding New Components

- Run `npx shadcn@latest add <component>` to add official shadcn components
- Components are installed as source files — modify freely to fit the project
- Use `npx shadcn@latest diff` to check for upstream updates

---

## React Best Practices

### Components

- Use **functional components** exclusively
- Keep components **small and focused** with a single responsibility
- Use **React.memo** for expensive renders that receive stable props
- Prefer **controlled components** for forms
- Use stable **key** props in lists; avoid array index when items can change

### Hooks

- Follow the Rules of Hooks; never call hooks conditionally
- Extract complex logic into **custom hooks** prefixed with `use`
- Use **useCallback** for handlers passed to memoized children when helpful
- Use **useMemo** for expensive computations, not trivial values
- Prefer **useRef** over state for values that should not trigger re-renders

### State Management

- Keep state as **local as possible**
- Lift state only when multiple children need shared access
- Use **URL state** for shareable or filterable UI state via React Router
- Avoid prop drilling beyond a couple of levels; use context or composition

---

## UX Best Practices

### Loading & Feedback

- Show **loading indicators** such as `Loader2Icon` with `animate-spin` during async operations
- Use **Toast** notifications for success, error, and informational actions
- Provide **optimistic updates** where appropriate
- Disable interactive elements during submission to prevent double actions

### Error Handling

- Display **user-friendly error messages**, not raw stack traces
- Use shadcn `Alert` for inline errors when appropriate
- Provide **recovery actions** such as retry or go back
- Handle empty states gracefully with meaningful content

### Accessibility (a11y)

- Use **semantic HTML** such as `<nav>`, `<main>`, and `<button>`
- Ensure all interactive elements are **keyboard accessible**
- Provide **aria-labels** for icon-only buttons
- Maintain **focus management** in modals and drawers
- Ensure sufficient **color contrast** to meet WCAG AA minimums

### Interaction

- Provide **visual feedback** on hover, focus, and active states
- Use **confirmation dialogs** for destructive actions
- Keep **click targets at least 44x44px** for touch devices
- Avoid blocking the entire UI during operations

---

## Mobile & Responsive Design

### Mobile-First Approach

- Design for **small screens first**, then scale up
- Use Tailwind responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test layouts at **320px, 375px, 768px, 1024px, and 1440px**

### Layout

- Use **flexbox** (`flex`) and **CSS Grid** (`grid`) for responsive layouts
- Use `w-full` for full-width elements on mobile
- Avoid fixed widths; prefer `max-w-*` with `w-full`
- Use `gap-*` utilities for consistent spacing
- Stack columns vertically on small screens with `flex-col sm:flex-row`

### Touch & Interaction

- Prefer **Sheet** over `Dialog` for mobile-first flows when space is constrained
- Ensure scrollable areas work with **touch gestures**
- Avoid hover-dependent interactions on mobile
- Use `hidden sm:block` and `block sm:hidden` when separate mobile and desktop UI is needed

### Typography & Spacing

- Use **relative units** such as `rem` and `em` for font sizes
- Keep body text at least `text-sm` (14px) for readability
- Reduce padding on mobile with patterns like `p-4 sm:p-6`
- Use `truncate` for long text in constrained spaces

---

## Build & Verification

### Before Submitting Changes

1. Run **typecheck**: `npm run typecheck`
2. Run **build**: `npm run build`
3. Test on both **desktop and mobile viewports**
4. Verify **dark mode** if colors or styles were changed

### Testing

- Use Playwright for E2E tests when covering critical flows
- Test navigation, forms, error states, and empty states
- Test keyboard navigation and screen reader compatibility

---

## Anti-Patterns to Avoid

- Modifying shadcn/ui primitives without understanding the upstream API
- Using `any` type to silence TypeScript errors
- Inline styles when Tailwind or shadcn variants exist
- Using array index as a key in dynamic lists
- Massive components longer than necessary; split them up
- Duplicated logic across components; extract to hooks or utilities
- Ignoring mobile responsiveness until the end
- Blocking the UI thread with heavy synchronous operations

---

## Quick Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Start production | `npm run start` |
| Add shadcn component | `npx shadcn@latest add <name>` |
| Check for updates | `npx shadcn@latest diff` |
