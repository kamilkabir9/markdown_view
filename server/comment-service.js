import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getContentRoot } from './content-root.js';
import { ApiError } from './errors.js';
import { requireMarkdownFile, resolveCommentFileKey } from './file-service.js';
import { enrichAnchorFromMarkdown, resolveAnchorInMarkdown } from './comment-anchors.js';
import { DocumentComment, InlineComment, MarkdownCommentDocument } from './comment-document.js';

const STORE_VERSION = 2;

function getStorePath() {
  return join(getContentRoot(), '.markdown-viewer', 'comments.json');
}

async function ensureStoreDir() {
  await mkdir(join(getContentRoot(), '.markdown-viewer'), { recursive: true });
}

function createEmptyStore() {
  return {
    version: STORE_VERSION,
    files: {},
  };
}

function createEmptyCommentDocument(content = '') {
  return new MarkdownCommentDocument({
    content,
    annotations: [],
  });
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAtJsonCommentDocumentJSON(value) {
  return isPlainObject(value)
    && typeof value.content === 'string'
    && typeof value.contentType === 'string'
    && Array.isArray(value.annotations)
    && Array.isArray(value.schema);
}

async function readStore() {
  try {
    const raw = await readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || typeof parsed.files !== 'object' || parsed.files === null) {
      return createEmptyStore();
    }

    return {
      version: Number.isInteger(parsed.version) ? parsed.version : 1,
      files: parsed.files,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return createEmptyStore();
    }

    throw new ApiError(500, 'comments_store_unreadable', 'The comment store could not be read.');
  }
}

async function writeStore(store) {
  await ensureStoreDir();
  await writeFile(getStorePath(), JSON.stringify({
    version: STORE_VERSION,
    files: store.files,
  }, null, 2), 'utf8');
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

function isInlineCommentAnnotation(annotation) {
  return annotation instanceof InlineComment;
}

function isDocumentCommentAnnotation(annotation) {
  return annotation instanceof DocumentComment;
}

function toInlineAnchor(annotation) {
  return {
    exact: annotation.attributes.exact,
    prefix: annotation.attributes.prefix,
    suffix: annotation.attributes.suffix,
    rangeStart: annotation.attributes.unresolved ? undefined : annotation.start,
    rangeEnd: annotation.attributes.unresolved ? undefined : annotation.end,
    headingPath: Array.isArray(annotation.attributes.headingPath) ? annotation.attributes.headingPath : undefined,
    fallbackLine: Number.isInteger(annotation.attributes.fallbackLine) ? annotation.attributes.fallbackLine : undefined,
    sectionSlug: typeof annotation.attributes.sectionSlug === 'string' ? annotation.attributes.sectionSlug : undefined,
    blockType: typeof annotation.attributes.blockType === 'string' ? annotation.attributes.blockType : undefined,
  };
}

function rebaseInlineCommentAnnotation(annotation, markdown) {
  const previousStart = annotation.start;
  const previousEnd = annotation.end;
  const previousHeadingPath = Array.isArray(annotation.attributes.headingPath) ? annotation.attributes.headingPath : undefined;
  const previousFallbackLine = Number.isInteger(annotation.attributes.fallbackLine) ? annotation.attributes.fallbackLine : undefined;
  const previousSectionSlug = typeof annotation.attributes.sectionSlug === 'string' ? annotation.attributes.sectionSlug : undefined;
  const previousBlockType = typeof annotation.attributes.blockType === 'string' ? annotation.attributes.blockType : undefined;
  const previousUnresolved = Boolean(annotation.attributes.unresolved);
  const anchor = toInlineAnchor(annotation);
  const match = resolveAnchorInMarkdown(markdown, anchor);

  if (match) {
    const enriched = enrichAnchorFromMarkdown(markdown, {
      ...anchor,
      rangeStart: match.start,
      rangeEnd: match.end,
    });
    annotation.start = enriched.rangeStart;
    annotation.end = enriched.rangeEnd;
    annotation.attributes.headingPath = enriched.headingPath;
    annotation.attributes.fallbackLine = enriched.fallbackLine;
    annotation.attributes.sectionSlug = enriched.sectionSlug;
    annotation.attributes.blockType = enriched.blockType;
    annotation.attributes.unresolved = false;

    return previousStart !== annotation.start
      || previousEnd !== annotation.end
      || previousUnresolved
      || previousFallbackLine !== annotation.attributes.fallbackLine
      || previousSectionSlug !== annotation.attributes.sectionSlug
      || previousBlockType !== annotation.attributes.blockType
      || JSON.stringify(previousHeadingPath ?? []) !== JSON.stringify(annotation.attributes.headingPath ?? []);
  }

  annotation.start = 0;
  annotation.end = 0;
  annotation.attributes.unresolved = true;

  return previousStart !== 0
    || previousEnd !== 0
    || !previousUnresolved;
}

function rebaseCommentDocument(document, markdown) {
  let didChange = document.content !== markdown;

  document.annotations.forEach((annotation) => {
    if (isInlineCommentAnnotation(annotation)) {
      didChange = rebaseInlineCommentAnnotation(annotation, markdown) || didChange;
    }
  });

  document.content = markdown;

  return didChange;
}

function createStoredAnnotation(annotation, markdown) {
  if (annotation.isGlobal) {
    return new DocumentComment({
      id: annotation.id,
      start: 0,
      end: 0,
      attributes: {
        text: annotation.text,
        createdAt: annotation.createdAt,
      },
    });
  }

  const match = resolveAnchorInMarkdown(markdown, annotation.anchor);
  const enriched = match
    ? enrichAnchorFromMarkdown(markdown, {
      ...annotation.anchor,
      rangeStart: match.start,
      rangeEnd: match.end,
    })
    : annotation.anchor;
  const hasResolvedRange = Boolean(match);

  return new InlineComment({
    id: annotation.id,
    start: hasResolvedRange ? enriched.rangeStart : 0,
    end: hasResolvedRange ? enriched.rangeEnd : 0,
    attributes: {
      text: annotation.text,
      createdAt: annotation.createdAt,
      exact: enriched.exact,
      prefix: enriched.prefix,
      suffix: enriched.suffix,
      headingPath: enriched.headingPath,
      fallbackLine: enriched.fallbackLine,
      sectionSlug: enriched.sectionSlug,
      blockType: enriched.blockType,
      unresolved: !hasResolvedRange,
    },
  });
}

function commentDtoFromAnnotation(annotation) {
  if (isDocumentCommentAnnotation(annotation)) {
    return {
      id: annotation.id,
      anchor: null,
      text: annotation.attributes.text,
      createdAt: annotation.attributes.createdAt,
      isGlobal: true,
    };
  }

  if (!isInlineCommentAnnotation(annotation)) {
    return null;
  }

  const anchor = {
    exact: annotation.attributes.exact,
    prefix: annotation.attributes.prefix,
    suffix: annotation.attributes.suffix,
  };

  if (Array.isArray(annotation.attributes.headingPath)) {
    anchor.headingPath = annotation.attributes.headingPath;
  }

  if (Number.isInteger(annotation.attributes.fallbackLine)) {
    anchor.fallbackLine = annotation.attributes.fallbackLine;
  }

  if (typeof annotation.attributes.sectionSlug === 'string') {
    anchor.sectionSlug = annotation.attributes.sectionSlug;
  }

  if (typeof annotation.attributes.blockType === 'string') {
    anchor.blockType = annotation.attributes.blockType;
  }

  if (!annotation.attributes.unresolved) {
    anchor.rangeStart = annotation.start;
    anchor.rangeEnd = annotation.end;
  }

  return {
    id: annotation.id,
    anchor,
    text: annotation.attributes.text,
    createdAt: annotation.attributes.createdAt,
    isGlobal: false,
  };
}

function buildDocumentFromAnnotations(annotations, markdown) {
  const document = createEmptyCommentDocument(markdown);
  const normalized = Array.isArray(annotations) ? annotations.map(normalizeAnnotation) : [];

  if (normalized.length > 0) {
    document.addAnnotations(...normalized.map((annotation) => createStoredAnnotation(annotation, markdown)));
  }

  return document;
}

function loadCommentDocument(store, canonicalFilePath, markdown) {
  const existing = store.files[canonicalFilePath];

  if (existing === undefined) {
    return {
      document: createEmptyCommentDocument(markdown),
      didChange: store.version !== STORE_VERSION,
    };
  }

  if (isAtJsonCommentDocumentJSON(existing)) {
    return {
      document: new MarkdownCommentDocument(existing),
      didChange: store.version !== STORE_VERSION,
    };
  }

  if (Array.isArray(existing)) {
    const document = buildDocumentFromAnnotations(existing, markdown);
    store.files[canonicalFilePath] = document.toJSON();
    return { document, didChange: true };
  }

  const document = createEmptyCommentDocument(markdown);
  store.files[canonicalFilePath] = document.toJSON();
  return { document, didChange: true };
}

function saveCommentDocument(store, canonicalFilePath, document) {
  store.files[canonicalFilePath] = document.toJSON();
}

function findCommentAnnotationById(document, id) {
  return document.annotations.find((annotation) => annotation.id === id && (
    isInlineCommentAnnotation(annotation) || isDocumentCommentAnnotation(annotation)
  )) ?? null;
}

export async function listComments(filePath) {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();
  const { document, didChange: didLoadChange } = loadCommentDocument(store, canonicalFilePath, currentFile.content);
  const didRebase = rebaseCommentDocument(document, currentFile.content);

  if (didLoadChange || didRebase) {
    saveCommentDocument(store, canonicalFilePath, document);
    await writeStore(store);
  }

  return document.annotations
    .map(commentDtoFromAnnotation)
    .filter(Boolean);
}

export async function createComment({ filePath, annotation }) {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();
  const { document } = loadCommentDocument(store, canonicalFilePath, currentFile.content);
  rebaseCommentDocument(document, currentFile.content);

  const nextAnnotation = normalizeAnnotation(annotation);
  document.addAnnotations(createStoredAnnotation(nextAnnotation, currentFile.content));
  const savedAnnotation = findCommentAnnotationById(document, nextAnnotation.id);

  saveCommentDocument(store, canonicalFilePath, document);
  await writeStore(store);

  return commentDtoFromAnnotation(savedAnnotation);
}

export async function importComments({ filePath, annotations }) {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();
  const document = buildDocumentFromAnnotations(annotations, currentFile.content);

  saveCommentDocument(store, canonicalFilePath, document);
  await writeStore(store);

  return document.annotations
    .map(commentDtoFromAnnotation)
    .filter(Boolean);
}

export async function updateComment({ filePath, id, text }) {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();
  const nextText = typeof text === 'string' ? text.trim() : '';

  if (!nextText) {
    throw new ApiError(400, 'invalid_comment_text', 'Comment text is required.');
  }

  const { document } = loadCommentDocument(store, canonicalFilePath, currentFile.content);
  rebaseCommentDocument(document, currentFile.content);
  const comment = findCommentAnnotationById(document, id);

  if (!comment) {
    throw new ApiError(404, 'comment_not_found', 'The requested comment was not found.');
  }

  comment.attributes.text = nextText;
  saveCommentDocument(store, canonicalFilePath, document);
  await writeStore(store);

  return commentDtoFromAnnotation(comment);
}

export async function deleteComment({ filePath, id }) {
  const currentFile = await requireMarkdownFile(filePath);
  const canonicalFilePath = currentFile.path;
  const store = await readStore();
  const { document } = loadCommentDocument(store, canonicalFilePath, currentFile.content);
  rebaseCommentDocument(document, currentFile.content);
  const comment = findCommentAnnotationById(document, id);

  if (!comment) {
    throw new ApiError(404, 'comment_not_found', 'The requested comment was not found.');
  }

  document.removeAnnotation(comment);
  saveCommentDocument(store, canonicalFilePath, document);
  await writeStore(store);
}

export async function rebaseCommentsForFile(filePath, markdownContent) {
  const currentFile = typeof markdownContent === 'string'
    ? { content: markdownContent, path: await resolveCommentFileKey(filePath) }
    : await requireMarkdownFile(filePath);
  const store = await readStore();

  if (!(currentFile.path in store.files)) {
    return;
  }

  const { document, didChange: didLoadChange } = loadCommentDocument(store, currentFile.path, currentFile.content);
  const didRebase = rebaseCommentDocument(document, currentFile.content);

  if (!didLoadChange && !didRebase) {
    return;
  }

  saveCommentDocument(store, currentFile.path, document);
  await writeStore(store);
}
