import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, relative } from 'path';

const ROOT_DIR = process.cwd();

export interface FileInfo {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  modified: string;
}

async function walkDir(dir: string, files: FileInfo[] = []): Promise<FileInfo[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      await walkDir(fullPath, files);
    } else if (entry.isFile() && extname(entry.name) === '.md') {
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
  const possiblePaths = [
    join(ROOT_DIR, pathname),
    join(ROOT_DIR, pathname + '.md'),
    join(ROOT_DIR, pathname, 'readme.md'),
    join(ROOT_DIR, pathname, 'README.md'),
  ];
  
  for (const filePath of possiblePaths) {
    try {
      const content = await readFile(filePath, 'utf-8');
      return { content, path: pathname };
    } catch {
      continue;
    }
  }
  
  return null;
}
