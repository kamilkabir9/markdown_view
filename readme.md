# Markdown Viewer

A fast markdown viewer built with React Router v7 and Bun, featuring SSR out of the box.

## Quick Start

```bash
# Install dependencies
bun install

# Development mode with hot reload
bun run dev

# Production build
bun run build

# Start production server
bun run start
```

## Configuration

Set the port via environment variable:

```bash
PORT=8080 bun run start
```

Default port is **3000**.

## Usage

1. Place your `.md` files in the project directory (or subdirectories)
2. Start the server
3. Visit `http://localhost:3000`
4. The homepage lists all available markdown files
5. Click any file to view it rendered as HTML

## Adding Comments to Markdown

1. Select any text region in the rendered markdown
2. A context menu will appear with option to add a comment
3. Enter your comment in the dialog
4. Comments are displayed as highlights on the corresponding lines
5. Click the copy icon on any comment to copy it to clipboard with the original markdown lines

The copied format includes the selected markdown lines followed by the comment, similar to how Cursor IDE or Plannotator.ai handles annotations.

## Features

- **SSR (Server-Side Rendering)** - Fast initial page loads, good SEO
- **React Router v7** - Full-stack framework with loaders
- **Bun** - Fast JavaScript runtime
- Syntax highlighting for code blocks
- Responsive design with DaisyUI components
- Clean URLs (e.g., `/docs/readme` serves `docs/readme.md`)
- **Line Comments** - Select any region in the markdown to add comments. Comments can be copied to clipboard with their corresponding markdown lines (similar to Cursor IDE / Plannotator style)

## Architecture

```
├── app/
│   ├── root.tsx          # Root layout
│   ├── routes/
│   │   ├── _index.tsx    # Home page (file list)
│   │   └── $.tsx         # Catch-all for markdown files
│   └── utils/
│       └── files.server.ts  # File system utilities
├── react-router.config.ts   # React Router config
├── vite.config.ts           # Vite config
└── package.json
```

## Development

```bash
# Run in development mode with hot reload
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build
```

## License

MIT
