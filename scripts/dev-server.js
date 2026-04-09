#!/usr/bin/env node

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createApiRouter } from '../server/api.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const port = Number.parseInt(process.env.PORT || '3000', 10);

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';
  process.env.MARKDOWN_VIEWER_CONTENT_ROOT = process.env.MARKDOWN_VIEWER_CONTENT_ROOT || process.cwd();

  const app = express();
  const vite = await createViteServer({
    root: packageRoot,
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createApiRouter());
  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`[markdown-viewer:dev] http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
