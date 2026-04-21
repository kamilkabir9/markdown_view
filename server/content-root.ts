import { resolve } from 'node:path';

export function getContentRoot(): string {
  return resolve(process.env.MARKDOWN_VIEWER_CONTENT_ROOT || process.cwd());
}
