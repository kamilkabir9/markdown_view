import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApiRouter } from '../server/api.js';

async function startApiServer(contentRoot) {
  process.env.MARKDOWN_VIEWER_CONTENT_ROOT = contentRoot;

  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter());

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

  const listResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.comments.length, 1);

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

  const emptyListResponse = await fetch(`${baseUrl}/api/comments?file=docs/readme`);
  const emptyListBody = await emptyListResponse.json();
  assert.equal(emptyListBody.comments.length, 0);
});
