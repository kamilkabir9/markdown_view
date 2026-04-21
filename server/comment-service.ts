import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getContentRoot } from './content-root.js';
import { ApiError } from './errors.js';
import { requireMarkdownFile, resolveCommentFileKey } from './file-service.js';
import { enrichAnchorFromMarkdown, resolveAnchorInMarkdown, type TextAnchor } from './comment-anchors.js';

export interface Annotation {
  id: string;
  anchor: TextAnchor | null;
  text: string;
  createdAt: string;
  isGlobal: boolean;
}

interface Store {
  files: Record<string, Annotation[]>;
}

function getStorePath(): string {
  return join(getContentRoot(), '.markdown-viewer', 'comments.json');
}

async function ensureStoreDir(): Promise<void> {
  await mkdir(join(getContentRoot(), '.markdown-viewer'), { recursive: true });
}

function createEmptyStore(): Store {
  return { files: {} };
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(getStorePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !('files' in parsed) || typeof (parsed as Record<string, unknown>).files !== 'object' || (parsed as Record<string, unknown>).files === null) {
      return createEmptyStore();
    }

    const files: Record<string, Annotation[]> = {};
    for (const [key, value] of Object.entries((parsed as { files: Record<string, unknown> }).files)) {
      files[key] = Array.isArray(value) ? (value as Annotation[]) : [];
    }

    return { files };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createEmptyStore();
    }
    throw new ApiError(500, 'comments_store_unreadable', 'The comment store could not be read.');
  }
}

async function writeStore(store: Store): Promise<void> {
  await ensureStoreDir();
  await writeFile(getStorePath(), JSON.stringify({ files: store.files }, null, 2), 'utf8');
}

function isValidAnchor(anchor: unknown): anchor is TextAnchor {
  if (!anchor || typeof anchor !== 'object') return false;
  const a = anchor as Record<string, unknown>;
  const hasValidRange = (a.rangeStart === undefined || Number.isInteger(a.rangeStart))
    && (a.rangeEnd === undefined || Number.isInteger(a.rangeEnd));
  const hasValidHeadingPath = a.headingPath === undefined
    || (Array.isArray(a.headingPath) && (a.headingPath as unknown[]).every((segment) => typeof segment === 'string'));
  const hasValidFallbackLine = a.fallbackLine === undefined || Number.isInteger(a.fallbackLine);
  const hasValidSectionSlug = a.sectionSlug === undefined || typeof a.sectionSlug === 'string';
  const hasValidBlockType = a.blockType === undefined || typeof a.blockType === 'string';

  return typeof a.exact === 'string'
    && typeof a.prefix === 'string'
    && typeof a.suffix === 'string'
    && hasValidRange
    && hasValidHeadingPath
    && hasValidFallbackLine
    && hasValidSectionSlug
    && hasValidBlockType;
}

function normalizeAnnotation(input: unknown): Annotation {
  const inp = input as Record<string, unknown> | null | undefined;
  const text = typeof inp?.text === 'string' ? inp.text.trim() : '';
  const isGlobal = Boolean(inp?.isGlobal);
  const anchor = inp?.anchor ?? null;

  if (!text) {
    throw new ApiError(400, 'invalid_comment_text', 'Comment text is required.');
  }

  if (!isGlobal && !isValidAnchor(anchor)) {
    throw new ApiError(400, 'invalid_comment_anchor', 'Inline comments require a valid text anchor.');
  }

  if (isGlobal && anchor !== null && anchor !== undefined) {
    throw new ApiError(400, 'invalid_comment_anchor', 'Document comments cannot include an anchor.');
  }

  const validAnchor = isValidAnchor(anchor) ? anchor : null;

  return {
    id: typeof inp?.id === 'string' && inp.id ? inp.id : crypto.randomUUID(),
    anchor: isGlobal ? null : {
      exact: validAnchor!.exact,
      prefix: validAnchor!.prefix,
      suffix: validAnchor!.suffix,
      rangeStart: typeof validAnchor!.rangeStart === 'number' ? validAnchor!.rangeStart : undefined,
      rangeEnd: typeof validAnchor!.rangeEnd === 'number' ? validAnchor!.rangeEnd : undefined,
      headingPath: Array.isArray(validAnchor!.headingPath) ? validAnchor!.headingPath : undefined,
      fallbackLine: typeof validAnchor!.fallbackLine === 'number' ? validAnchor!.fallbackLine : undefined,
      sectionSlug: typeof validAnchor!.sectionSlug === 'string' ? validAnchor!.sectionSlug : undefined,
      blockType: typeof validAnchor!.blockType === 'string' ? validAnchor!.blockType : undefined,
    },
    text,
    createdAt: typeof inp?.createdAt === 'string' && inp.createdAt ? inp.createdAt : new Date().toISOString(),
    isGlobal,
  };
}

function resolveAndEnrichAnchor(annotation: Annotation, markdown: string): Annotation {
  if (!annotation.anchor) return annotation;

  const match = resolveAnchorInMarkdown(markdown, annotation.anchor);
  if (!match) return annotation;

  const enriched = enrichAnchorFromMarkdown(markdown, {
    ...annotation.anchor,
    rangeStart: match.start,
    rangeEnd: match.end,
  });

  return {
    ...annotation,
    anchor: {
      exact: enriched.exact,
      prefix: enriched.prefix,
      suffix: enriched.suffix,
      rangeStart: enriched.rangeStart,
      rangeEnd: enriched.rangeEnd,
      headingPath: enriched.headingPath,
      fallbackLine: enriched.fallbackLine,
      sectionSlug: enriched.sectionSlug,
      blockType: enriched.blockType,
    },
  };
}

function rebaseAnnotation(annotation: Annotation, markdown: string): { annotation: Annotation; didChange: boolean } {
  if (!annotation.anchor) return { annotation, didChange: false };

  const match = resolveAnchorInMarkdown(markdown, annotation.anchor);

  if (match) {
    const next = resolveAndEnrichAnchor(annotation, markdown);
    const didChange = annotation.anchor.rangeStart !== next.anchor?.rangeStart
      || annotation.anchor.rangeEnd !== next.anchor?.rangeEnd
      || annotation.anchor.sectionSlug !== next.anchor?.sectionSlug
      || annotation.anchor.blockType !== next.anchor?.blockType
      || annotation.anchor.fallbackLine !== next.anchor?.fallbackLine
      || JSON.stringify(annotation.anchor.headingPath ?? []) !== JSON.stringify(next.anchor?.headingPath ?? [])
      || !Number.isFinite(annotation.anchor.rangeStart);
    return { annotation: next, didChange };
  }

  // Text not found — drop range offsets to signal unresolved state.
  const wasUnresolved = !Number.isFinite(annotation.anchor.rangeStart);
  const { rangeStart: _rs, rangeEnd: _re, ...anchorWithoutRange } = annotation.anchor;
  const next = { ...annotation, anchor: anchorWithoutRange };
  return { annotation: next, didChange: !wasUnresolved };
}

function rebaseAnnotations(annotations: Annotation[], markdown: string): { annotations: Annotation[]; didChange: boolean } {
  let didChange = false;
  const rebased = annotations.map((annotation) => {
    const { annotation: next, didChange: changed } = rebaseAnnotation(annotation, markdown);
    if (changed) didChange = true;
    return next;
  });
  return { annotations: rebased, didChange };
}

function getFileAnnotations(store: Store, canonicalFilePath: string): Annotation[] {
  return Array.isArray(store.files[canonicalFilePath]) ? store.files[canonicalFilePath] : [];
}

export async function listComments(filePath: string): Promise<Annotation[]> {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();

  const annotations = getFileAnnotations(store, canonicalFilePath);
  const { annotations: rebased, didChange: didRebase } = rebaseAnnotations(annotations, currentFile.content);

  if (didRebase) {
    store.files[canonicalFilePath] = rebased;
    await writeStore(store);
  }

  return rebased;
}

export async function createComment({ filePath, annotation }: { filePath: string; annotation: unknown }): Promise<Annotation> {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();

  const annotations = getFileAnnotations(store, canonicalFilePath);
  const { annotations: rebased } = rebaseAnnotations(annotations, currentFile.content);

  const normalized = normalizeAnnotation(annotation);
  const enriched = resolveAndEnrichAnchor(normalized, currentFile.content);

  store.files[canonicalFilePath] = [...rebased, enriched];
  await writeStore(store);

  return enriched;
}

export async function importComments({ filePath, annotations }: { filePath: string; annotations: unknown }): Promise<Annotation[]> {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();

  const normalized = Array.isArray(annotations) ? (annotations as unknown[]).map(normalizeAnnotation) : [];
  const enriched = normalized.map((annotation) => resolveAndEnrichAnchor(annotation, currentFile.content));

  store.files[canonicalFilePath] = enriched;
  await writeStore(store);

  return enriched;
}

export async function updateComment({ filePath, id, text }: { filePath: string; id: string; text: unknown }): Promise<Annotation> {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();
  const nextText = typeof text === 'string' ? text.trim() : '';

  if (!nextText) {
    throw new ApiError(400, 'invalid_comment_text', 'Comment text is required.');
  }

  const annotations = getFileAnnotations(store, canonicalFilePath);
  const { annotations: rebased } = rebaseAnnotations(annotations, currentFile.content);

  const index = rebased.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new ApiError(404, 'comment_not_found', 'The requested comment was not found.');
  }

  rebased[index] = { ...rebased[index], text: nextText };
  store.files[canonicalFilePath] = rebased;
  await writeStore(store);

  return rebased[index];
}

export async function deleteComment({ filePath, id }: { filePath: string; id: string }): Promise<void> {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();

  const annotations = getFileAnnotations(store, canonicalFilePath);
  const { annotations: rebased } = rebaseAnnotations(annotations, currentFile.content);

  const index = rebased.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new ApiError(404, 'comment_not_found', 'The requested comment was not found.');
  }

  store.files[canonicalFilePath] = rebased.filter((_, i) => i !== index);
  await writeStore(store);
}

export async function rebaseCommentsForFile(filePath: string, markdownContent?: string): Promise<void> {
  const currentFile = typeof markdownContent === 'string'
    ? { content: markdownContent, path: await resolveCommentFileKey(filePath) }
    : await requireMarkdownFile(filePath);
  const store = await readStore();

  if (!(currentFile.path in store.files)) return;

  const annotations = getFileAnnotations(store, currentFile.path);
  const { annotations: rebased, didChange: didRebase } = rebaseAnnotations(annotations, currentFile.content);

  if (!didRebase) return;

  store.files[currentFile.path] = rebased;
  await writeStore(store);
}
