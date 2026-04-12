import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApiRouter } from '../server/api.js';

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

test('file and comment APIs work against the configured content root', async (t) => {
  const contentRoot = await mkdtemp(join(tmpdir(), 'markdown-viewer-api-'));
  const docsDir = join(contentRoot, 'docs');
  const sampleFile = join(docsDir, 'readme.md');

  await mkdir(docsDir, { recursive: true });
  await writeFile(sampleFile, '# Test Document\n\nHello from the API test.\n', 'utf8');

  const { server, baseUrl } = await startApiServer(contentRoot);

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(contentRoot, { recursive: true, force: true });
  });

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
    body: JSON.stringify({ content: '# Test Document\n\nUpdated through save API.\n' }),
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

  const storedAsset = await readFile(join(docsDir, assetBody.markdownPath.replace(/^\.\//, '')));
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

  const markdownWithImage = `# Test Document\n\n![Pixel](${assetBody.markdownPath})\n`;
  const saveWithImageResponse = await fetch(`${baseUrl}/api/files/docs/readme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: markdownWithImage }),
  });
  assert.equal(saveWithImageResponse.status, 200);

  const persistedMarkdown = await readFile(sampleFile, 'utf8');
  assert.match(persistedMarkdown, new RegExp(`!\\[Pixel\\]\\(${assetBody.markdownPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`));

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

  const createResponse = await fetch(`${baseUrl}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'docs/readme',
      annotation: {
        text: 'First note',
        anchor: null,
        isGlobal: true,
      },
    }),
  });
  assert.equal(createResponse.status, 201);
  const createBody = await createResponse.json();
  assert.equal(createBody.comment.text, 'First note');

  const inlineCreateResponse = await fetch(`${baseUrl}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'docs/readme',
      annotation: {
        text: 'Inline note',
        isGlobal: false,
        anchor: {
          exact: 'Updated through save API.',
          prefix: 'Document\n\n',
          suffix: '\n',
          rangeStart: 17,
          rangeEnd: 41,
          headingPath: ['Test Document'],
          fallbackLine: 3,
        },
      },
    }),
  });
  assert.equal(inlineCreateResponse.status, 201);
  const inlineCreateBody = await inlineCreateResponse.json();
  assert.equal(inlineCreateBody.comment.anchor.rangeStart, 17);
  assert.deepEqual(inlineCreateBody.comment.anchor.headingPath, ['Test Document']);

  const listResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.comments.length, 2);

  const updateResponse = await fetch(`${baseUrl}/api/comments/${createBody.comment.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: 'docs/readme', text: 'Updated note' }),
  });
  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  assert.equal(updateBody.comment.text, 'Updated note');

  const deleteResponse = await fetch(`${baseUrl}/api/comments/${createBody.comment.id}?file=docs/readme`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 204);

  const deleteInlineResponse = await fetch(`${baseUrl}/api/comments/${inlineCreateBody.comment.id}?file=docs/readme`, {
    method: 'DELETE',
  });
  assert.equal(deleteInlineResponse.status, 204);

  const emptyListResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  const emptyListBody = await emptyListResponse.json();
  assert.equal(emptyListBody.comments.length, 0);
});
