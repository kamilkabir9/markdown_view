import { resolve } from 'node:path';

export function getContentRoot() {
  return resolve(process.env.MARKDOWN_VIEWER_CONTENT_ROOT || process.cwd());
}
