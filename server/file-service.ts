import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import { getContentRoot } from './content-root.js';
import { ApiError } from './errors.js';

const MARKDOWN_EXTENSION = '.md';
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

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

export interface MarkdownFile {
  content: string;
  path: string;
  sourcePath: string;
  absolutePath: string;
  size: number;
  modified: string;
}

export interface MarkdownFileEntry {
  path: string;
  name: string;
  relativePath: string;
  routePath: string;
  size: number;
  modified: string;
}

export interface AssetResult {
  markdownPath: string;
  contentPath: string;
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

function isSafePath(rootDir: string, pathname: string): boolean {
  const resolved = normalize(resolve(rootDir, pathname));
  return resolved.startsWith(rootDir + sep) || resolved === rootDir;
}

function getMarkdownCandidatePaths(rootDir: string, pathname: string): string[] {
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

async function walkDir(rootDir: string, dir: string, files: MarkdownFileEntry[] = []): Promise<MarkdownFileEntry[]> {
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

async function resolveMarkdownFilePath(pathname: string): Promise<string | null> {
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

      return filePath;
    } catch {
      continue;
    }
  }

  return null;
}

function sanitizeAssetFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
}

function getAssetExtension(fileName: string, contentType: string): string {
  const providedExtension = extname(fileName).toLowerCase();
  if (providedExtension) {
    return providedExtension;
  }

  return IMAGE_MIME_EXTENSIONS[contentType] || '';
}

function getMarkdownAssetPath(markdownSourcePath: string, fileName: string): string {
  const sourceSegments = markdownSourcePath.split('/');
  sourceSegments.pop();

  return [...sourceSegments, fileName].filter(Boolean).join('/');
}

function normalizeMarkdownAssetPath(markdownPath: unknown): string | null {
  if (typeof markdownPath !== 'string') return null;
  const trimmed = markdownPath.trim();
  if (!trimmed.startsWith('./')) return null;

  const relativePath = trimmed.replace(/^\.\//, '');
  if (!relativePath || /[/]/.test(relativePath)) return null;

  return relativePath;
}

async function resolveUniqueAssetFileName({
  rootDir,
  markdownSourcePath,
  baseName,
  extension,
}: {
  rootDir: string;
  markdownSourcePath: string;
  baseName: string;
  extension: string;
}): Promise<string> {
  const sourceSegments = markdownSourcePath.split('/').slice(0, -1);

  for (let duplicateIndex = 0; duplicateIndex < 10_000; duplicateIndex += 1) {
    const suffix = duplicateIndex === 0 ? '' : `-${duplicateIndex}`;
    const candidateFileName = `${baseName}${suffix}${extension}`;
    const candidateRelativePath = [...sourceSegments, candidateFileName].filter(Boolean).join('/');
    const candidateAbsolutePath = resolve(rootDir, candidateRelativePath);

    if (!isSafePath(rootDir, candidateAbsolutePath)) {
      throw new ApiError(400, 'invalid_asset_path', 'The generated asset path is outside the content root.');
    }

    try {
      await stat(candidateAbsolutePath);
    } catch {
      return candidateFileName;
    }
  }

  throw new ApiError(500, 'asset_name_generation_failed', 'A unique name for the uploaded image could not be generated.');
}

export async function listMarkdownFiles(): Promise<MarkdownFileEntry[]> {
  const rootDir = getContentRoot();
  return walkDir(rootDir, rootDir);
}

export async function readMarkdownFile(pathname: string): Promise<MarkdownFile | null> {
  const rootDir = getContentRoot();
  const filePath = await resolveMarkdownFilePath(pathname);

  if (!filePath) {
    return null;
  }

  try {
    const fileStats = await stat(filePath);
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
    return null;
  }
}

export async function saveMarkdownFile(pathname: string, content: unknown): Promise<MarkdownFile> {
  if (typeof content !== 'string') {
    throw new ApiError(400, 'invalid_content', 'The `content` field must be a string.');
  }

  const filePath = await resolveMarkdownFilePath(pathname);

  if (!filePath) {
    throw new ApiError(404, 'file_not_found', 'The requested markdown file was not found.');
  }

  try {
    await writeFile(filePath, content, 'utf8');
  } catch {
    throw new ApiError(500, 'file_write_failed', 'The markdown file could not be saved.');
  }

  const savedFile = await readMarkdownFile(pathname);

  if (!savedFile) {
    throw new ApiError(500, 'file_reload_failed', 'The markdown file was saved but could not be reloaded.');
  }

  return savedFile;
}

export async function storeMarkdownAsset({
  documentPath,
  fileName,
  contentType,
  buffer,
}: {
  documentPath: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<AssetResult> {
  if (typeof documentPath !== 'string' || documentPath.trim() === '') {
    throw new ApiError(400, 'invalid_document_path', 'The `documentPath` field is required.');
  }

  if (typeof fileName !== 'string' || fileName.trim() === '') {
    throw new ApiError(400, 'invalid_file_name', 'The `fileName` field is required.');
  }

  if (typeof contentType !== 'string' || !(contentType in IMAGE_MIME_EXTENSIONS)) {
    throw new ApiError(400, 'invalid_content_type', 'Only GIF, JPEG, PNG, SVG, and WebP images are supported.');
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError(400, 'invalid_asset_data', 'The uploaded image payload was empty.');
  }

  const documentFile = await requireMarkdownFile(documentPath);
  const rootDir = getContentRoot();
  const safeBaseName = sanitizeAssetFileName(fileName.replace(/\.[^.]+$/, ''));
  const extension = getAssetExtension(fileName, contentType);
  const assetFileName = await resolveUniqueAssetFileName({
    rootDir,
    markdownSourcePath: documentFile.sourcePath,
    baseName: safeBaseName,
    extension,
  });
  const markdownAssetPath = getMarkdownAssetPath(documentFile.sourcePath, assetFileName);
  const absoluteAssetPath = resolve(rootDir, markdownAssetPath);

  if (!isSafePath(rootDir, absoluteAssetPath)) {
    throw new ApiError(400, 'invalid_asset_path', 'The generated asset path is outside the content root.');
  }

  try {
    await mkdir(dirname(absoluteAssetPath), { recursive: true });
    await writeFile(absoluteAssetPath, buffer);
  } catch {
    throw new ApiError(500, 'asset_write_failed', 'The image asset could not be written to disk.');
  }

  const sourceDir = documentFile.sourcePath.split('/').slice(0, -1);
  const assetPathSegments = markdownAssetPath.split('/');
  const relativeSegments = assetPathSegments.slice(sourceDir.length);

  return {
    markdownPath: `./${relativeSegments.join('/')}`,
    contentPath: `/content/${assetPathSegments.map((segment) => encodeURIComponent(segment)).join('/')}`,
  };
}

export async function deleteMarkdownAsset({
  documentPath,
  markdownPath,
}: {
  documentPath: string;
  markdownPath: unknown;
}): Promise<void> {
  if (typeof documentPath !== 'string' || documentPath.trim() === '') {
    throw new ApiError(400, 'invalid_document_path', 'The `documentPath` field is required.');
  }

  const normalizedMarkdownPath = normalizeMarkdownAssetPath(markdownPath);
  if (!normalizedMarkdownPath) {
    throw new ApiError(400, 'invalid_asset_path', 'The `markdownPath` field must point to a file next to the markdown document.');
  }

  const documentFile = await requireMarkdownFile(documentPath);
  const rootDir = getContentRoot();
  const markdownAssetPath = getMarkdownAssetPath(documentFile.sourcePath, normalizedMarkdownPath);
  const absoluteAssetPath = resolve(rootDir, markdownAssetPath);

  if (!isSafePath(rootDir, absoluteAssetPath)) {
    throw new ApiError(400, 'invalid_asset_path', 'The requested asset path is outside the content root.');
  }

  try {
    await unlink(absoluteAssetPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }

    throw new ApiError(500, 'asset_delete_failed', 'The image asset could not be deleted.');
  }
}

export async function requireMarkdownFile(pathname: string): Promise<MarkdownFile> {
  const result = await readMarkdownFile(pathname);

  if (!result) {
    throw new ApiError(404, 'file_not_found', 'The requested markdown file was not found.');
  }

  return result;
}

export async function resolveCommentFileKey(pathname: string): Promise<string> {
  const file = await requireMarkdownFile(pathname);
  return file.path;
}
