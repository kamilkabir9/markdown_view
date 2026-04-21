#!/usr/bin/env tsx

import express from 'express';
import { readFile } from 'node:fs/promises';
import { createServer as createViteServer } from 'vite';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createApiRouter } from '../server/api.js';
import { getContentRoot } from '../server/content-root.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const port = Number.parseInt(process.env.PORT || '3000', 10);

async function main(): Promise<void> {
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
  app.use('/content', express.static(getContentRoot()));
  app.get(/^(?!\/(?:api|content|assets)\b).*\.md$/i, async (req, res, next) => {
    try {
      const indexHtml = await readFile(join(packageRoot, 'index.html'), 'utf8');
      const transformed = await vite.transformIndexHtml(req.originalUrl, indexHtml);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
    } catch (error) {
      next(error);
    }
  });
  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`[markdown-viewer:dev] http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
