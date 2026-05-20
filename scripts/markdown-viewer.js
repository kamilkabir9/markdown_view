#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsScript = join(__dirname, 'markdown-viewer.ts');

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx/esm', tsScript, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 0);
