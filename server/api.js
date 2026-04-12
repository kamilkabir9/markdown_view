import express from 'express';
import multer from 'multer';
import { toErrorResponse, ApiError } from './errors.js';
import { listComments, createComment, deleteComment, importComments, updateComment } from './comment-service.js';
import { deleteMarkdownAsset, listMarkdownFiles, requireMarkdownFile, saveMarkdownFile, storeMarkdownAsset } from './file-service.js';
import { getContentRoot } from './content-root.js';

const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_IMAGE_UPLOAD_BYTES,
  },
});

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

function withUpload(middleware, handler) {
  return (req, res) => {
    middleware(req, res, async (uploadError) => {
      if (uploadError) {
        const error =
          uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE'
            ? new ApiError(413, 'asset_too_large', `Image uploads are limited to ${Math.floor(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024))}MB.`)
            : new ApiError(400, 'invalid_upload', uploadError.message || 'The uploaded image could not be processed.');

        const { status, body } = toErrorResponse(error);
        res.status(status).json(body);
        return;
      }

      try {
        await handler(req, res);
      } catch (error) {
        const { status, body } = toErrorResponse(error);
        if (!(error instanceof ApiError)) {
          console.error(error);
        }
        res.status(status).json(body);
      }
    });
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

  router.put('/files/*', asyncRoute(async (req, res) => {
    const file = await saveMarkdownFile(req.params[0] || '', req.body?.content);
    res.json(file);
  }));

  router.post('/files/*/images', withUpload(imageUpload.single('image'), async (req, res) => {
    const uploadedFile = req.file;

    if (!uploadedFile) {
      throw new ApiError(400, 'missing_image_file', 'Attach an image file in the `image` form field.');
    }

    const asset = await storeMarkdownAsset({
      documentPath: req.params[0] || '',
      fileName: uploadedFile.originalname,
      contentType: uploadedFile.mimetype,
      buffer: uploadedFile.buffer,
    });

    res.status(201).json(asset);
  }));

  router.delete('/files/*/images', asyncRoute(async (req, res) => {
    const markdownPath = typeof req.query.path === 'string' ? req.query.path : '';

    await deleteMarkdownAsset({
      documentPath: req.params[0] || '',
      markdownPath,
    });

    res.status(204).send();
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
