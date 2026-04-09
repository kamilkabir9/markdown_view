import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { getContentRoot } from './content-root.js';
import { ApiError } from './errors.js';

const MARKDOWN_EXTENSION = '.md';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.react-router',
  'build',
  'dist',
  '.opencode',
  '.vscode',
  '.idea',
  '.next',
  '.cache',
]);

function normalizeRoutePath(pathname) {
  return pathname.replace(/\0/g, '').replace(/^\/+|\/+$/g, '');
}

function isVisibleContentSegment(segment) {
  return segment !== '' && segment !== '.' && segment !== '..' && !segment.startsWith('.');
}

function isRoutableMarkdownPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  if (!segments.every(isVisibleContentSegment)) return false;

  const extension = extname(segments[segments.length - 1]).toLowerCase();
  return extension === '' || extension === MARKDOWN_EXTENSION;
}

function isSafePath(rootDir, pathname) {
  const resolved = normalize(resolve(rootDir, pathname));
  return resolved.startsWith(rootDir + sep) || resolved === rootDir;
}

function getMarkdownCandidatePaths(rootDir, pathname) {
  if (!isRoutableMarkdownPath(pathname)) return [];

  if (extname(pathname).toLowerCase() === MARKDOWN_EXTENSION) {
    return [join(rootDir, pathname)];
  }

  return [
    join(rootDir, `${pathname}${MARKDOWN_EXTENSION}`),
    join(rootDir, pathname, 'readme.md'),
    join(rootDir, pathname, 'README.md'),
  ];
}

async function walkDir(rootDir, dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await walkDir(rootDir, fullPath, files);
      continue;
    }

    if (!entry.isFile() || extname(entry.name).toLowerCase() !== MARKDOWN_EXTENSION || entry.name.startsWith('.')) {
      continue;
    }

    const stats = await stat(fullPath);
    const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/');

    files.push({
      path: fullPath,
      name: entry.name,
      relativePath,
      routePath: relativePath.replace(/\.md$/i, ''),
      size: stats.size,
      modified: stats.mtime.toISOString(),
    });
  }

  return files;
}

export async function listMarkdownFiles() {
  const rootDir = getContentRoot();
  return walkDir(rootDir, rootDir);
}

export async function readMarkdownFile(pathname) {
  const rootDir = getContentRoot();
  const sanitizedPath = normalizeRoutePath(pathname);
  const candidatePaths = getMarkdownCandidatePaths(rootDir, sanitizedPath);

  for (const filePath of candidatePaths) {
    if (!isSafePath(rootDir, filePath)) continue;

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile() || extname(filePath).toLowerCase() !== MARKDOWN_EXTENSION) {
        continue;
      }

      const content = await readFile(filePath, 'utf8');
      const sourcePath = relative(rootDir, filePath).replace(/\\/g, '/');

      return {
        content,
        path: sourcePath.replace(/\.md$/i, ''),
        sourcePath,
        absolutePath: filePath.replace(/\\/g, '/'),
        size: fileStats.size,
        modified: fileStats.mtime.toISOString(),
      };
    } catch {
      continue;
    }
  }

  return null;
}

export async function requireMarkdownFile(pathname) {
  const result = await readMarkdownFile(pathname);

  if (!result) {
    throw new ApiError(404, 'file_not_found', 'The requested markdown file was not found.');
  }

  return result;
}

export async function resolveCommentFileKey(pathname) {
  const file = await requireMarkdownFile(pathname);
  return file.path;
}
