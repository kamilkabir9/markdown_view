import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getContentRoot } from './content-root.js';
import { ApiError } from './errors.js';
import { requireMarkdownFile, resolveCommentFileKey } from './file-service.js';
import { enrichAnchorFromMarkdown, resolveAnchorInMarkdown } from './comment-anchors.js';

function getStorePath() {
  return join(getContentRoot(), '.markdown-viewer', 'comments.json');
}

async function ensureStoreDir() {
  await mkdir(join(getContentRoot(), '.markdown-viewer'), { recursive: true });
}

function createEmptyStore() {
  return { files: {} };
}

async function readStore() {
  try {
    const raw = await readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || typeof parsed.files !== 'object' || parsed.files === null) {
      return createEmptyStore();
    }

    const files = {};
    for (const [key, value] of Object.entries(parsed.files)) {
      files[key] = Array.isArray(value) ? value : [];
    }

    return { files };
  } catch (error) {
    if (error?.code === 'ENOENT') return createEmptyStore();
    throw new ApiError(500, 'comments_store_unreadable', 'The comment store could not be read.');
  }
}

async function writeStore(store) {
  await ensureStoreDir();
  await writeFile(getStorePath(), JSON.stringify({ files: store.files }, null, 2), 'utf8');
}

function isValidAnchor(anchor) {
  const hasValidRange = (anchor.rangeStart === undefined || Number.isInteger(anchor.rangeStart))
    && (anchor.rangeEnd === undefined || Number.isInteger(anchor.rangeEnd));
  const hasValidHeadingPath = anchor.headingPath === undefined
    || (Array.isArray(anchor.headingPath) && anchor.headingPath.every((segment) => typeof segment === 'string'));
  const hasValidFallbackLine = anchor.fallbackLine === undefined || Number.isInteger(anchor.fallbackLine);
  const hasValidSectionSlug = anchor.sectionSlug === undefined || typeof anchor.sectionSlug === 'string';
  const hasValidBlockType = anchor.blockType === undefined || typeof anchor.blockType === 'string';

  return anchor && typeof anchor === 'object'
    && typeof anchor.exact === 'string'
    && typeof anchor.prefix === 'string'
    && typeof anchor.suffix === 'string'
    && hasValidRange
    && hasValidHeadingPath
    && hasValidFallbackLine
    && hasValidSectionSlug
    && hasValidBlockType;
}

function normalizeAnnotation(input) {
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  const isGlobal = Boolean(input?.isGlobal);
  const anchor = input?.anchor ?? null;

  if (!text) {
    throw new ApiError(400, 'invalid_comment_text', 'Comment text is required.');
  }

  if (!isGlobal && !isValidAnchor(anchor)) {
    throw new ApiError(400, 'invalid_comment_anchor', 'Inline comments require a valid text anchor.');
  }

  if (isGlobal && anchor !== null && anchor !== undefined) {
    throw new ApiError(400, 'invalid_comment_anchor', 'Document comments cannot include an anchor.');
  }

  return {
    id: typeof input?.id === 'string' && input.id ? input.id : crypto.randomUUID(),
    anchor: isGlobal ? null : {
      exact: anchor.exact,
      prefix: anchor.prefix,
      suffix: anchor.suffix,
      rangeStart: typeof anchor.rangeStart === 'number' ? anchor.rangeStart : undefined,
      rangeEnd: typeof anchor.rangeEnd === 'number' ? anchor.rangeEnd : undefined,
      headingPath: Array.isArray(anchor.headingPath) ? anchor.headingPath : undefined,
      fallbackLine: typeof anchor.fallbackLine === 'number' ? anchor.fallbackLine : undefined,
      sectionSlug: typeof anchor.sectionSlug === 'string' ? anchor.sectionSlug : undefined,
      blockType: typeof anchor.blockType === 'string' ? anchor.blockType : undefined,
    },
    text,
    createdAt: typeof input?.createdAt === 'string' && input.createdAt ? input.createdAt : new Date().toISOString(),
    isGlobal,
  };
}

function resolveAndEnrichAnchor(annotation, markdown) {
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

function rebaseAnnotation(annotation, markdown) {
  if (!annotation.anchor) return { annotation, didChange: false };

  const match = resolveAnchorInMarkdown(markdown, annotation.anchor);

  if (match) {
    const next = resolveAndEnrichAnchor(annotation, markdown);
    const didChange = annotation.anchor.rangeStart !== next.anchor.rangeStart
      || annotation.anchor.rangeEnd !== next.anchor.rangeEnd
      || annotation.anchor.sectionSlug !== next.anchor.sectionSlug
      || annotation.anchor.blockType !== next.anchor.blockType
      || annotation.anchor.fallbackLine !== next.anchor.fallbackLine
      || JSON.stringify(annotation.anchor.headingPath ?? []) !== JSON.stringify(next.anchor.headingPath ?? [])
      || !Number.isFinite(annotation.anchor.rangeStart);
    return { annotation: next, didChange };
  }

  // Text not found — drop range offsets to signal unresolved state.
  const wasUnresolved = !Number.isFinite(annotation.anchor.rangeStart);
  const { rangeStart: _rs, rangeEnd: _re, ...anchorWithoutRange } = annotation.anchor;
  const next = { ...annotation, anchor: anchorWithoutRange };
  return { annotation: next, didChange: !wasUnresolved };
}

function rebaseAnnotations(annotations, markdown) {
  let didChange = false;
  const rebased = annotations.map((annotation) => {
    const { annotation: next, didChange: changed } = rebaseAnnotation(annotation, markdown);
    if (changed) didChange = true;
    return next;
  });
  return { annotations: rebased, didChange };
}

function getFileAnnotations(store, canonicalFilePath) {
  return Array.isArray(store.files[canonicalFilePath]) ? store.files[canonicalFilePath] : [];
}

export async function listComments(filePath) {
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

export async function createComment({ filePath, annotation }) {
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

export async function importComments({ filePath, annotations }) {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();

  const normalized = Array.isArray(annotations) ? annotations.map(normalizeAnnotation) : [];
  const enriched = normalized.map((annotation) => resolveAndEnrichAnchor(annotation, currentFile.content));

  store.files[canonicalFilePath] = enriched;
  await writeStore(store);

  return enriched;
}

export async function updateComment({ filePath, id, text }) {
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

export async function deleteComment({ filePath, id }) {
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

export async function rebaseCommentsForFile(filePath, markdownContent) {
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
