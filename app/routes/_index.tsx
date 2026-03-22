import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { getMarkdownFiles, type FileInfo } from '~/utils/files.server';
import { Card, Alert } from '@heroui/react';

export const meta: MetaFunction = () => [
  { title: 'Markdown Viewer' },
];

export async function loader({}: LoaderFunctionArgs) {
  const files = await getMarkdownFiles();
  return { files };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Index() {
  const { files } = useLoaderData<typeof loader>();

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <Alert status="accent">
          No markdown files found. Add some .md files to get started!
        </Alert>
      </div>
    );
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">📁 Markdown Files</h1>
        <p className="mt-2 text-muted">Click any file to view it rendered as HTML</p>
      </header>

      <Card>
        <Card.Content>
          <ul className="flex flex-col gap-1">
            {files.map((file: FileInfo) => (
              <li key={file.path}>
                <Link
                  to={`/${file.relativePath}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors"
                >
                  <span className="text-xl">📄</span>
                  <span className="flex-1">{file.relativePath}</span>
                  <span className="text-sm text-[var(--heroui-muted)]">
                    {formatFileSize(file.size)} • {new Date(file.modified).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="text-muted mt-4">
            Found {files.length} markdown file{files.length !== 1 ? 's' : ''}
          </div>
        </Card.Content>
      </Card>
    </>
  );
}
