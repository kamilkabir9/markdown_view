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

## Features

- **SSR (Server-Side Rendering)** - Fast initial page loads, good SEO
- **React Router v7** - Full-stack framework with loaders
- **Bun** - Fast JavaScript runtime
- Syntax highlighting for code blocks
- Responsive design with DaisyUI components
- Clean URLs (e.g., `/docs/readme` serves `docs/readme.md`)

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
