import express from 'express';
import { toErrorResponse, ApiError } from './errors.js';
import { listComments, createComment, deleteComment, importComments, updateComment } from './comment-service.js';
import { listMarkdownFiles, requireMarkdownFile } from './file-service.js';
import { getContentRoot } from './content-root.js';

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      if (!(error instanceof ApiError)) {
        console.error(error);
      }
      res.status(status).json(body);
    }
  };
}

export function createApiRouter() {
  const router = express.Router();

  router.get('/files', asyncRoute(async (_req, res) => {
    const files = await listMarkdownFiles();
    res.json({ files, contentRoot: getContentRoot() });
  }));

  router.get('/files/*', asyncRoute(async (req, res) => {
    const file = await requireMarkdownFile(req.params[0] || '');
    res.json(file);
  }));

  router.get('/comments', asyncRoute(async (req, res) => {
    const filePath = typeof req.query.file === 'string' ? req.query.file : '';
    if (!filePath) {
      throw new ApiError(400, 'missing_file_path', 'The `file` query parameter is required.');
    }

    const comments = await listComments(filePath);
    res.json({ comments });
  }));

  router.post('/comments', asyncRoute(async (req, res) => {
    const filePath = typeof req.body?.filePath === 'string' ? req.body.filePath : '';
    const annotation = req.body?.annotation;
    if (!filePath) {
      throw new ApiError(400, 'missing_file_path', 'The `filePath` field is required.');
    }

    const comment = await createComment({ filePath, annotation });
    res.status(201).json({ comment });
  }));

  router.post('/comments/import', asyncRoute(async (req, res) => {
    const filePath = typeof req.body?.filePath === 'string' ? req.body.filePath : '';
    if (!filePath) {
      throw new ApiError(400, 'missing_file_path', 'The `filePath` field is required.');
    }

    const comments = await importComments({
      filePath,
      annotations: req.body?.annotations,
    });

    res.status(201).json({ comments });
  }));

  router.put('/comments/:id', asyncRoute(async (req, res) => {
    const filePath = typeof req.body?.filePath === 'string' ? req.body.filePath : '';
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    if (!filePath) {
      throw new ApiError(400, 'missing_file_path', 'The `filePath` field is required.');
    }

    const comment = await updateComment({ filePath, id: req.params.id, text });
    res.json({ comment });
  }));

  router.delete('/comments/:id', asyncRoute(async (req, res) => {
    const filePath = typeof req.query.file === 'string' ? req.query.file : '';
    if (!filePath) {
      throw new ApiError(400, 'missing_file_path', 'The `file` query parameter is required.');
    }

    await deleteComment({ filePath, id: req.params.id });
    res.status(204).send();
  }));

  return router;
}
