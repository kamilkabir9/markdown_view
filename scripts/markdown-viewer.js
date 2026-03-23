#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const serveBin = resolve(packageRoot, 'node_modules/@react-router/serve/bin.js');
const serverBuild = resolve(packageRoot, 'build/server/index.js');
const args = process.argv.slice(2);

const DEFAULT_PORT = 3000;
const MAX_PORT_SCAN = 50;

function printHelp() {
  console.log('markdown-viewer');
  console.log('');
  console.log('Usage:');
  console.log('  markdown-viewer [start] [--port <number>] [--cwd <path>] [--no-open]');
  console.log('  markdown-viewer --help');
  console.log('');
  console.log('Examples:');
  console.log('  markdown-viewer');
  console.log('  markdown-viewer --port 4000');
  console.log('  markdown-viewer --cwd ./docs');
  console.log('  markdown-viewer --no-open');
}

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const command = args[0] && !args[0].startsWith('-') ? args[0] : 'start';
if (command !== 'start') {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

let port;
let workingDir = process.cwd();
let shouldOpenBrowser = true;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--port') {
    port = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === '--cwd') {
    const next = args[i + 1];
    if (next) {
      workingDir = resolve(process.cwd(), next);
      i += 1;
    }
    continue;
  }
  if (arg === '--no-open') {
    shouldOpenBrowser = false;
  }
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
    server.listen({ port: portNumber, host: '127.0.0.1' }, () => {
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

if (!existsSync(serveBin)) {
  console.error('Missing @react-router/serve. Run `npm install` in the package first.');
  process.exit(1);
}

async function main() {
  if (port && !isValidPort(port)) {
    console.error(`Invalid --port value: ${port}`);
    process.exit(1);
  }

  const requestedPort = port ? Number.parseInt(port, 10) : DEFAULT_PORT;
  const selectedPort = await pickAvailablePort(requestedPort);

  if (selectedPort !== requestedPort) {
    console.log(`Port ${requestedPort} is busy. Using ${selectedPort} instead.`);
  }

  const serverUrl = `http://localhost:${selectedPort}`;
  const child = spawn('node', [serveBin, serverBuild], {
    stdio: 'inherit',
    cwd: workingDir,
    env: {
      ...process.env,
      PORT: String(selectedPort),
    },
  });

  child.on('error', (error) => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
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
