import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, relative, resolve, normalize } from 'path';

const ROOT_DIR = resolve(process.env.MARKDOWN_VIEWER_CONTENT_ROOT || process.cwd());
const MARKDOWN_EXTENSION = '.md';

function isSafePath(pathname: string): boolean {
  const resolved = normalize(resolve(ROOT_DIR, pathname));
  return resolved.startsWith(ROOT_DIR + '/') || resolved === ROOT_DIR;
}

function normalizeRoutePath(pathname: string): string {
  return pathname.replace(/\0/g, '').replace(/^\/+|\/+$/g, '');
}

function isVisibleContentSegment(segment: string): boolean {
  return segment !== '' && segment !== '.' && segment !== '..' && !segment.startsWith('.');
}

function isRoutableMarkdownPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  if (!segments.every(isVisibleContentSegment)) return false;

  const extension = extname(segments[segments.length - 1]).toLowerCase();
  return extension === '' || extension === MARKDOWN_EXTENSION;
}

function getMarkdownCandidatePaths(pathname: string): string[] {
  if (!isRoutableMarkdownPath(pathname)) return [];

  if (extname(pathname).toLowerCase() === MARKDOWN_EXTENSION) {
    return [join(ROOT_DIR, pathname)];
  }

  return [
    join(ROOT_DIR, `${pathname}${MARKDOWN_EXTENSION}`),
    join(ROOT_DIR, pathname, 'readme.md'),
    join(ROOT_DIR, pathname, 'README.md'),
  ];
}

export interface FileInfo {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  modified: string;
}

export interface MarkdownContent {
  content: string;
  path: string;
  sourcePath: string;
  absolutePath: string;
  size: number;
  modified: string;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.react-router', 'build', 'dist',
  '.opencode', '.vscode', '.idea', '.next', '.cache',
]);

async function walkDir(dir: string, files: FileInfo[] = []): Promise<FileInfo[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await walkDir(fullPath, files);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      if (entry.name.startsWith('.')) continue;
      const stats = await stat(fullPath);
      files.push({
        path: fullPath,
        name: entry.name,
        relativePath: relative(ROOT_DIR, fullPath).replace(/\\/g, '/'),
        size: stats.size,
        modified: stats.mtime.toISOString(),
      });
    }
  }

  return files;
}

export async function getMarkdownFiles(): Promise<FileInfo[]> {
  return walkDir(ROOT_DIR);
}

export async function getMarkdownContent(pathname: string): Promise<MarkdownContent | null> {
  const sanitized = normalizeRoutePath(pathname);
  const possiblePaths = getMarkdownCandidatePaths(sanitized);

  for (const filePath of possiblePaths) {
    if (!isSafePath(filePath)) continue;

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile() || extname(filePath).toLowerCase() !== MARKDOWN_EXTENSION) {
        continue;
      }

      const content = await readFile(filePath, 'utf-8');
      const sourcePath = relative(ROOT_DIR, filePath).replace(/\\/g, '/');

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
