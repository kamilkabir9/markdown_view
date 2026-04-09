import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getContentRoot } from './content-root.js';
import { ApiError } from './errors.js';
import { resolveCommentFileKey } from './file-service.js';

function getStorePath() {
  return join(getContentRoot(), '.markdown-viewer', 'comments.json');
}

async function ensureStoreDir() {
  await mkdir(join(getContentRoot(), '.markdown-viewer'), { recursive: true });
}

function createEmptyStore() {
  return {
    version: 1,
    files: {},
  };
}

async function readStore() {
  try {
    const raw = await readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || typeof parsed.files !== 'object' || parsed.files === null) {
      return createEmptyStore();
    }

    return {
      version: 1,
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
  await writeFile(getStorePath(), JSON.stringify(store, null, 2), 'utf8');
}

function isValidAnchor(anchor) {
  return anchor && typeof anchor === 'object'
    && typeof anchor.exact === 'string'
    && typeof anchor.prefix === 'string'
    && typeof anchor.suffix === 'string';
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
    anchor: isGlobal ? null : anchor,
    text,
    createdAt: typeof input?.createdAt === 'string' && input.createdAt ? input.createdAt : new Date().toISOString(),
    isGlobal,
  };
}

export async function listComments(filePath) {
  const canonicalFilePath = await resolveCommentFileKey(filePath);
  const store = await readStore();
  return store.files[canonicalFilePath] ?? [];
}

export async function createComment({ filePath, annotation }) {
  const canonicalFilePath = await resolveCommentFileKey(filePath);
  const store = await readStore();
  const nextAnnotation = normalizeAnnotation(annotation);
  const currentComments = store.files[canonicalFilePath] ?? [];

  store.files[canonicalFilePath] = [...currentComments, nextAnnotation];
  await writeStore(store);

  return nextAnnotation;
}

export async function importComments({ filePath, annotations }) {
  const canonicalFilePath = await resolveCommentFileKey(filePath);
  const store = await readStore();
  const normalized = Array.isArray(annotations) ? annotations.map(normalizeAnnotation) : [];

  store.files[canonicalFilePath] = normalized;
  await writeStore(store);

  return normalized;
}

export async function updateComment({ filePath, id, text }) {
  const canonicalFilePath = await resolveCommentFileKey(filePath);
  const store = await readStore();
  const nextText = typeof text === 'string' ? text.trim() : '';

  if (!nextText) {
    throw new ApiError(400, 'invalid_comment_text', 'Comment text is required.');
  }

  const currentComments = store.files[canonicalFilePath] ?? [];
  const commentIndex = currentComments.findIndex((comment) => comment.id === id);

  if (commentIndex === -1) {
    throw new ApiError(404, 'comment_not_found', 'The requested comment was not found.');
  }

  const nextComment = {
    ...currentComments[commentIndex],
    text: nextText,
  };

  store.files[canonicalFilePath] = [
    ...currentComments.slice(0, commentIndex),
    nextComment,
    ...currentComments.slice(commentIndex + 1),
  ];

  await writeStore(store);

  return nextComment;
}

export async function deleteComment({ filePath, id }) {
  const canonicalFilePath = await resolveCommentFileKey(filePath);
  const store = await readStore();
  const currentComments = store.files[canonicalFilePath] ?? [];
  const nextComments = currentComments.filter((comment) => comment.id !== id);

  if (nextComments.length === currentComments.length) {
    throw new ApiError(404, 'comment_not_found', 'The requested comment was not found.');
  }

  store.files[canonicalFilePath] = nextComments;
  await writeStore(store);
}
