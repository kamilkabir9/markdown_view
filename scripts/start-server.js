#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

const [{ default: express }, { createRequestHandler }] = await Promise.all([
  import('express'),
  import('@react-router/express'),
]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const serverBuild = resolve(packageRoot, 'build/server/index.js');
const clientBuildDir = resolve(packageRoot, 'build/client');
const publicDir = resolve(packageRoot, 'public');

function parsePort(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : 3000;
}

if (!existsSync(serverBuild)) {
  console.error('Missing build output at build/server/index.js. Run `npm run build` first.');
  process.exit(1);
}

const build = await import(pathToFileURL(serverBuild).href);
const app = express();
const port = parsePort(process.env.PORT);
const host = process.env.HOST;

app.disable('x-powered-by');
app.use('/assets', express.static(join(clientBuildDir, 'assets'), {
  immutable: true,
  maxAge: '1y',
}));
app.use(express.static(clientBuildDir));

if (existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: '1h' }));
}

app.all('*', createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
}));

const server = host
  ? app.listen(port, host, () => {
      console.log(`[markdown-viewer] http://${host}:${port}`);
    })
  : app.listen(port, () => {
      console.log(`[markdown-viewer] http://localhost:${port}`);
    });

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
});
