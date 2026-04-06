#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const serverBuild = resolve(packageRoot, 'build/server/index.js');
const clientBuildDir = resolve(packageRoot, 'build/client');
const publicDir = resolve(packageRoot, 'public');
const args = process.argv.slice(2);

const DEFAULT_PORT = 3000;
const MAX_PORT_SCAN = 50;

function printHelp() {
  console.log('markdown-viewer');
  console.log('');
  console.log('Usage:');
  console.log('  markdown-viewer [directory] [--port <number>] [--no-open]');
  console.log('  markdown-viewer --help');
  console.log('');
  console.log('Examples:');
  console.log('  markdown-viewer');
  console.log('  markdown-viewer ./docs');
  console.log('  markdown-viewer --port 4000');
  console.log('  markdown-viewer --no-open');
}

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

let directoryArg;
let optionArgs = args;

if (args[0] && !args[0].startsWith('-')) {
  directoryArg = args[0];
  optionArgs = args.slice(1);
}

let port;
let workingDir = directoryArg ? resolve(process.cwd(), directoryArg) : process.cwd();
let shouldOpenBrowser = true;

for (let i = 0; i < optionArgs.length; i += 1) {
  const arg = optionArgs[i];
  if (arg === '--port') {
    port = optionArgs[i + 1];
    i += 1;
    continue;
  }
  if (arg === '--no-open') {
    shouldOpenBrowser = false;
    continue;
  }
  if (arg.startsWith('-')) {
    console.error(`Unknown option: ${arg}`);
    printHelp();
    process.exit(1);
  }

  console.error(`Unexpected argument: ${arg}`);
  printHelp();
  process.exit(1);
}

function isValidPort(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
}

function isPortAvailable(portNumber) {
  return new Promise((resolveAvailability) => {
    const server = createServer();
    server.unref();
    server.on('error', () => resolveAvailability(false));
    server.listen({ port: portNumber }, () => {
      server.close(() => resolveAvailability(true));
    });
  });
}

async function pickAvailablePort(startPort) {
  for (let offset = 0; offset < MAX_PORT_SCAN; offset += 1) {
    const candidate = startPort + offset;
    if (candidate > 65535) break;
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`Could not find an open port in range ${startPort}-${Math.min(65535, startPort + MAX_PORT_SCAN - 1)}`);
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin'
      ? ['open', [url]]
      : platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];

  const [commandName, commandArgs] = cmd;
  const opener = spawn(commandName, commandArgs, { stdio: 'ignore', detached: true });
  opener.unref();
}

if (!existsSync(serverBuild)) {
  console.error('Missing build output at build/server/index.js. Run `npm run build` first.');
  process.exit(1);
}

if (!existsSync(workingDir)) {
  console.error(`Directory not found: ${workingDir}`);
  process.exit(1);
}

if (!statSync(workingDir).isDirectory()) {
  console.error(`Directory argument must point to a directory: ${workingDir}`);
  process.exit(1);
}

async function main() {
  if (port && !isValidPort(port)) {
    console.error(`Invalid --port value: ${port}`);
    process.exit(1);
  }

  process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

  const requestedPort = port
    ? Number.parseInt(port, 10)
    : isValidPort(process.env.PORT)
      ? Number.parseInt(process.env.PORT, 10)
      : DEFAULT_PORT;
  const selectedPort = await pickAvailablePort(requestedPort);

  if (selectedPort !== requestedPort) {
    console.log(`Port ${requestedPort} is busy. Using ${selectedPort} instead.`);
  }

  const serverUrl = `http://localhost:${selectedPort}`;
  process.env.PORT = String(selectedPort);
  process.env.MARKDOWN_VIEWER_CONTENT_ROOT = workingDir;

  const [{ default: express }, { createRequestHandler }] = await Promise.all([
    import('express'),
    import('@react-router/express'),
  ]);

  const build = await import(pathToFileURL(serverBuild).href);
  const app = express();
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
    ? app.listen(selectedPort, host, () => {
        console.log(`[markdown-viewer] http://${host}:${selectedPort}`);
      })
    : app.listen(selectedPort, () => {
        console.log(`[markdown-viewer] http://localhost:${selectedPort}`);
      });

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.once(signal, () => {
      server.close(() => process.exit(0));
    });
  });

  if (shouldOpenBrowser) {
    setTimeout(() => {
      try {
        openBrowser(serverUrl);
      } catch {
      }
    }, 350);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
