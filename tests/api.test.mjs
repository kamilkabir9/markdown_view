import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createApiRouter } from '../server/api.js';

function lineNumberAtIndex(markdown, index) {
  if (index <= 0) return 1;
  return markdown.slice(0, Math.min(index, markdown.length)).split('\n').length;
}

function getStorePath(contentRoot) {
  return join(contentRoot, '.markdown-viewer', 'comments.json');
}

async function readCommentStore(contentRoot) {
  return JSON.parse(await readFile(getStorePath(contentRoot), 'utf8'));
}

function buildInlineAnchorFromIndex(markdown, start, exact, overrides = {}) {
  return {
    exact,
    prefix: markdown.slice(Math.max(0, start - 24), start),
    suffix: markdown.slice(start + exact.length, Math.min(markdown.length, start + exact.length + 24)),
    rangeStart: start,
    rangeEnd: start + exact.length,
    fallbackLine: lineNumberAtIndex(markdown, start),
    ...overrides,
  };
}

function buildInlineAnchor(markdown, exact, occurrence = 0, overrides = {}) {
  let start = -1;
  let searchOffset = 0;

  for (let index = 0; index <= occurrence; index += 1) {
    start = markdown.indexOf(exact, searchOffset);
    if (start === -1) {
      throw new Error(`Could not find occurrence ${occurrence} for "${exact}".`);
    }
    searchOffset = start + exact.length;
  }

  return buildInlineAnchorFromIndex(markdown, start, exact, overrides);
}

async function startApiServer(contentRoot) {
  process.env.MARKDOWN_VIEWER_CONTENT_ROOT = contentRoot;

  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter());
  app.use('/content', express.static(contentRoot));

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to bind test server.');
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function createFixture(t, files) {
  const contentRoot = await mkdtemp(join(tmpdir(), 'markdown-viewer-api-'));

  await Promise.all(Object.entries(files).map(async ([relativePath, content]) => {
    const absolutePath = join(contentRoot, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }));

  const { server, baseUrl } = await startApiServer(contentRoot);

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(contentRoot, { recursive: true, force: true });
  });

  return { contentRoot, baseUrl };
}

async function createComment(baseUrl, body) {
  const response = await fetch(`${baseUrl}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    response,
    body: await response.json(),
  };
}

test('file, asset, and atjson-backed comment APIs preserve the existing DTOs', async (t) => {
  const originalMarkdown = '# Test Document\n\nUpdated through save API.\n';
  const { contentRoot, baseUrl } = await createFixture(t, {
    'docs/readme.md': '# Test Document\n\nHello from the API test.\n',
  });
  const sampleFile = join(contentRoot, 'docs', 'readme.md');

  const filesResponse = await fetch(`${baseUrl}/api/files`);
  assert.equal(filesResponse.status, 200);
  const filesBody = await filesResponse.json();
  assert.equal(filesBody.files.length, 1);
  assert.equal(filesBody.files[0].relativePath, 'docs/readme.md');

  const fileResponse = await fetch(`${baseUrl}/api/files/docs/readme`);
  assert.equal(fileResponse.status, 200);
  const fileBody = await fileResponse.json();
  assert.equal(fileBody.path, 'docs/readme');
  assert.match(fileBody.content, /Hello from the API test/);

  const saveResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: originalMarkdown }),
  });
  assert.equal(saveResponse.status, 200);
  const saveBody = await saveResponse.json();
  assert.match(saveBody.content, /Updated through save API/);

  const imagePayload = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=', 'base64');
  const assetFormData = new FormData();
  assetFormData.append('image', new Blob([imagePayload], { type: 'image/png' }), 'pixel.png');
  const assetResponse = await fetch(`${baseUrl}/api/files/docs/readme/images`, {
    method: 'POST',
    body: assetFormData,
  });
  assert.equal(assetResponse.status, 201);
  const assetBody = await assetResponse.json();
  assert.equal(assetBody.markdownPath, './pixel.png');
  assert.equal(assetBody.contentPath, '/content/docs/pixel.png');

  const storedAsset = await readFile(join(contentRoot, 'docs', assetBody.markdownPath.replace(/^\.\//, '')));
  assert.ok(storedAsset.length > 0);

  const servedAssetResponse = await fetch(`${baseUrl}${assetBody.contentPath}`);
  assert.equal(servedAssetResponse.status, 200);

  const duplicateAssetFormData = new FormData();
  duplicateAssetFormData.append('image', new Blob([imagePayload], { type: 'image/png' }), 'pixel.png');
  const duplicateAssetResponse = await fetch(`${baseUrl}/api/files/docs/readme/images`, {
    method: 'POST',
    body: duplicateAssetFormData,
  });
  assert.equal(duplicateAssetResponse.status, 201);
  const duplicateAssetBody = await duplicateAssetResponse.json();
  assert.equal(duplicateAssetBody.markdownPath, './pixel-1.png');
  assert.equal(duplicateAssetBody.contentPath, '/content/docs/pixel-1.png');

  const deleteAssetResponse = await fetch(`${baseUrl}/api/files/docs/readme/images?path=${encodeURIComponent(duplicateAssetBody.markdownPath)}`, {
    method: 'DELETE',
  });
  assert.equal(deleteAssetResponse.status, 204);

  const deletedAssetFetchResponse = await fetch(`${baseUrl}${duplicateAssetBody.contentPath}`);
  assert.equal(deletedAssetFetchResponse.status, 404);

  const { response: createGlobalResponse, body: createGlobalBody } = await createComment(baseUrl, {
    filePath: 'docs/readme',
    annotation: {
      text: 'First note',
      anchor: null,
      isGlobal: true,
    },
  });
  assert.equal(createGlobalResponse.status, 201);
  assert.equal(createGlobalBody.comment.text, 'First note');
  assert.equal(createGlobalBody.comment.anchor, null);
  assert.equal(createGlobalBody.comment.isGlobal, true);

  const inlineAnchor = buildInlineAnchor(originalMarkdown, 'Updated through save API.', 0, {
    headingPath: ['Test Document'],
  });
  const { response: createInlineResponse, body: createInlineBody } = await createComment(baseUrl, {
    filePath: 'docs/readme',
    annotation: {
      text: 'Inline note',
      isGlobal: false,
      anchor: inlineAnchor,
    },
  });
  assert.equal(createInlineResponse.status, 201);
  assert.equal(createInlineBody.comment.anchor.rangeStart, inlineAnchor.rangeStart);
  assert.deepEqual(createInlineBody.comment.anchor.headingPath, ['Test Document']);
  assert.equal(createInlineBody.comment.anchor.sectionSlug, 'test-document');
  assert.equal(createInlineBody.comment.anchor.blockType, 'paragraph');

  const listResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.comments.length, 2);

  const updateResponse = await fetch(`${baseUrl}/api/comments/${createGlobalBody.comment.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: 'docs/readme', text: 'Updated note' }),
  });
  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  assert.equal(updateBody.comment.text, 'Updated note');

  const store = await readCommentStore(contentRoot);
  assert.equal(store.version, 2);
  assert.equal(store.files['docs/readme'].contentType, 'application/vnd.markdown-viewer.comments+json');
  assert.deepEqual(store.files['docs/readme'].schema, [
    '-markdown-viewer-inline-comment',
    '-markdown-viewer-document-comment',
  ]);
  assert.equal(store.files['docs/readme'].content, originalMarkdown);
  assert.equal(store.files['docs/readme'].annotations.length, 2);
  assert.ok(store.files['docs/readme'].annotations.some((annotation) => annotation.id === createGlobalBody.comment.id));
  assert.ok(store.files['docs/readme'].annotations.some((annotation) => annotation.id === createInlineBody.comment.id));

  const deleteResponse = await fetch(`${baseUrl}/api/comments/${createGlobalBody.comment.id}?file=docs/readme`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 204);

  const deleteInlineResponse = await fetch(`${baseUrl}/api/comments/${createInlineBody.comment.id}?file=docs/readme`, {
    method: 'DELETE',
  });
  assert.equal(deleteInlineResponse.status, 204);

  const markdownWithImage = `# Test Document\n\n![Pixel](${assetBody.markdownPath})\n`;
  const saveWithImageResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: markdownWithImage }),
  });
  assert.equal(saveWithImageResponse.status, 200);

  const persistedMarkdown = await readFile(sampleFile, 'utf8');
  assert.match(persistedMarkdown, /!\[Pixel\]\(\.\/pixel\.png\)/);

  const invalidSaveResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: null }),
  });
  assert.equal(invalidSaveResponse.status, 400);

  const invalidAssetFormData = new FormData();
  invalidAssetFormData.append('image', new Blob([imagePayload], { type: 'text/plain' }), 'bad.txt');

  const invalidAssetResponse = await fetch(`${baseUrl}/api/files/docs/readme/images`, {
    method: 'POST',
    body: invalidAssetFormData,
  });
  assert.equal(invalidAssetResponse.status, 400);

  const emptyListResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  const emptyListBody = await emptyListResponse.json();
  assert.equal(emptyListBody.comments.length, 0);
});

test('listing comments upgrades the legacy v1 array store to v2 atjson documents', async (t) => {
  const markdown = '# Test Document\n\nLegacy target text.\n';
  const { contentRoot, baseUrl } = await createFixture(t, {
    'docs/readme.md': markdown,
  });

  const legacyInlineAnchor = buildInlineAnchor(markdown, 'Legacy target text.', 0, {
    headingPath: ['Test Document'],
  });

  await mkdir(join(contentRoot, '.markdown-viewer'), { recursive: true });
  await writeFile(getStorePath(contentRoot), JSON.stringify({
    version: 1,
    files: {
      'docs/readme': [
        {
          id: 'legacy-global',
          anchor: null,
          text: 'Legacy document note',
          createdAt: '2026-01-01T00:00:00.000Z',
          isGlobal: true,
        },
        {
          id: 'legacy-inline',
          anchor: legacyInlineAnchor,
          text: 'Legacy inline note',
          createdAt: '2026-01-01T00:00:01.000Z',
          isGlobal: false,
        },
      ],
    },
  }, null, 2), 'utf8');

  const response = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.comments.length, 2);
  assert.equal(body.comments.find((comment) => comment.id === 'legacy-global').isGlobal, true);
  assert.equal(body.comments.find((comment) => comment.id === 'legacy-inline').anchor.rangeStart, legacyInlineAnchor.rangeStart);

  const store = await readCommentStore(contentRoot);
  assert.equal(store.version, 2);
  assert.equal(store.files['docs/readme'].contentType, 'application/vnd.markdown-viewer.comments+json');
  assert.equal(store.files['docs/readme'].content, markdown);
  assert.deepEqual(
    store.files['docs/readme'].annotations.map((annotation) => annotation.id).sort(),
    ['legacy-global', 'legacy-inline'],
  );
});

test('saving a markdown file rebases inline comment offsets in the atjson sidecar', async (t) => {
  const originalMarkdown = '# Section\n\nTarget text here.\n';
  const { contentRoot, baseUrl } = await createFixture(t, {
    'docs/readme.md': originalMarkdown,
  });

  const originalAnchor = buildInlineAnchor(originalMarkdown, 'Target text here.', 0, {
    headingPath: ['Section'],
  });
  const { body: createBody } = await createComment(baseUrl, {
    filePath: 'docs/readme',
    annotation: {
      text: 'Keep aligned',
      isGlobal: false,
      anchor: originalAnchor,
    },
  });

  const rebasedMarkdown = '# Section\n\nIntro line.\n\nTarget text here.\n';
  const saveResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: rebasedMarkdown }),
  });
  assert.equal(saveResponse.status, 200);

  const listResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  const rebasedComment = listBody.comments.find((comment) => comment.id === createBody.comment.id);
  const expectedStart = rebasedMarkdown.indexOf('Target text here.');

  assert.equal(rebasedComment.anchor.rangeStart, expectedStart);
  assert.equal(rebasedComment.anchor.rangeEnd, expectedStart + 'Target text here.'.length);
  assert.equal(rebasedComment.anchor.sectionSlug, 'section');
  assert.equal(rebasedComment.anchor.blockType, 'paragraph');

  const store = await readCommentStore(contentRoot);
  const storedInline = store.files['docs/readme'].annotations.find((annotation) => annotation.id === createBody.comment.id);
  assert.equal(storedInline.start, expectedStart);
  assert.equal(storedInline.end, expectedStart + 'Target text here.'.length);
  assert.equal(storedInline.attributes['-markdown-viewer-sectionSlug'], 'section');
  assert.equal(storedInline.attributes['-markdown-viewer-blockType'], 'paragraph');
  assert.equal(store.files['docs/readme'].content, rebasedMarkdown);
});

test('duplicate inline quotes still resolve to the intended heading after rebasing', async (t) => {
  const originalMarkdown = '# First\n\nRepeat me.\n\n# Second\n\nRepeat me.\n';
  const { baseUrl } = await createFixture(t, {
    'docs/readme.md': originalMarkdown,
  });

  const secondAnchor = buildInlineAnchor(originalMarkdown, 'Repeat me.', 1, {
    headingPath: ['Second'],
  });
  const { body: createBody } = await createComment(baseUrl, {
    filePath: 'docs/readme',
    annotation: {
      text: 'Track the second one',
      isGlobal: false,
      anchor: secondAnchor,
    },
  });

  const spacer = '\n\n' + 'Spacer text. '.repeat(24) + '\n\n';
  const rebasedMarkdown = '# First\n\nRepeat me.' + spacer + '# Second\n\nRepeat me.\n';
  const saveResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: rebasedMarkdown }),
  });
  assert.equal(saveResponse.status, 200);

  const listResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  const rebasedComment = listBody.comments.find((comment) => comment.id === createBody.comment.id);
  const expectedSecondStart = rebasedMarkdown.lastIndexOf('Repeat me.');

  assert.equal(rebasedComment.anchor.rangeStart, expectedSecondStart);
  assert.deepEqual(rebasedComment.anchor.headingPath, ['Second']);
});

test('removed quote text keeps comments unresolved but still editable and deletable', async (t) => {
  const originalMarkdown = '# Section\n\nRemove me.\n';
  const { contentRoot, baseUrl } = await createFixture(t, {
    'docs/readme.md': originalMarkdown,
  });

  const originalAnchor = buildInlineAnchor(originalMarkdown, 'Remove me.', 0, {
    headingPath: ['Section'],
  });
  const { body: createBody } = await createComment(baseUrl, {
    filePath: 'docs/readme',
    annotation: {
      text: 'This may become stale',
      isGlobal: false,
      anchor: originalAnchor,
    },
  });

  const updatedMarkdown = '# Section\n\nReplacement text.\n';
  const saveResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: updatedMarkdown }),
  });
  assert.equal(saveResponse.status, 200);

  const listResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  const unresolvedComment = listBody.comments.find((comment) => comment.id === createBody.comment.id);

  assert.equal(unresolvedComment.anchor.exact, 'Remove me.');
  assert.equal('rangeStart' in unresolvedComment.anchor, false);
  assert.equal('rangeEnd' in unresolvedComment.anchor, false);

  const updateResponse = await fetch(`${baseUrl}/api/comments/${createBody.comment.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: 'docs/readme', text: 'Still useful' }),
  });
  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  assert.equal(updateBody.comment.text, 'Still useful');

  const store = await readCommentStore(contentRoot);
  const storedInline = store.files['docs/readme'].annotations.find((annotation) => annotation.id === createBody.comment.id);
  assert.equal(storedInline.start, 0);
  assert.equal(storedInline.end, 0);
  assert.equal(storedInline.attributes['-markdown-viewer-unresolved'], true);

  const deleteResponse = await fetch(`${baseUrl}/api/comments/${createBody.comment.id}?file=docs/readme`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 204);

  const emptyListResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  const emptyListBody = await emptyListResponse.json();
  assert.equal(emptyListBody.comments.length, 0);
});
