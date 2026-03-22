import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, relative, resolve, normalize } from 'path';

const ROOT_DIR = resolve(process.cwd());

function isSafePath(pathname: string): boolean {
  const resolved = normalize(resolve(ROOT_DIR, pathname));
  return resolved.startsWith(ROOT_DIR + '/') || resolved === ROOT_DIR;
}

export interface FileInfo {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  modified: string;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.react-router', 'build', 'dist',
  '.opencode', '.vscode', '.idea', '.next', '.cache',
]);

async function walkDir(dir: string, files: FileInfo[] = [], depth = 0): Promise<FileInfo[]> {
  if (depth > 10) return files;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await walkDir(fullPath, files, depth + 1);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      if (entry.name.startsWith('.')) continue;
      const stats = await stat(fullPath);
      files.push({
        path: fullPath,
        name: entry.name.replace(/\.md$/i, ''),
        relativePath: relative(ROOT_DIR, fullPath).replace(/\.md$/i, ''),
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

export async function getMarkdownContent(pathname: string): Promise<{ content: string; path: string } | null> {
  const sanitized = pathname.replace(/\0/g, '');

  const possiblePaths = [
    join(ROOT_DIR, sanitized),
    join(ROOT_DIR, sanitized + '.md'),
    join(ROOT_DIR, sanitized, 'readme.md'),
    join(ROOT_DIR, sanitized, 'README.md'),
  ];

  for (const filePath of possiblePaths) {
    if (!isSafePath(filePath)) continue;
    try {
      const content = await readFile(filePath, 'utf-8');
      return { content, path: sanitized };
    } catch {
      continue;
    }
  }

  return null;
}
