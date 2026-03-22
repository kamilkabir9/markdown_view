import { useState, useMemo } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { getMarkdownFiles, type FileInfo } from '~/utils/files.server';
import { Card, Alert, SearchField, Breadcrumbs, Badge, Separator, Label } from '@heroui/react';

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
  const [search, setSearch] = useState('');

  const filteredFiles = useMemo(
    () =>
      search.trim()
        ? files.filter((f: FileInfo) =>
            f.relativePath.toLowerCase().includes(search.toLowerCase())
          )
        : files,
    [files, search]
  );

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <Alert status="accent" role="alert">
          No markdown files found. Add some .md files to get started!
        </Alert>
      </div>
    );
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
          <Breadcrumbs.Item>Markdown Files</Breadcrumbs.Item>
        </Breadcrumbs>
      </nav>

      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Markdown Files</h1>
            <p className="mt-1 text-muted">Click any file to view it rendered as HTML</p>
          </div>
          <Badge.Anchor>
            <Badge color="accent" size="sm">
              {filteredFiles.length}
            </Badge>
          </Badge.Anchor>
        </div>
      </header>

      {files.length > 3 && (
        <SearchField className="mb-4" value={search} onChange={setSearch}>
          <SearchField.Group className="h-12">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search files..." className="h-12" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      )}

      {filteredFiles.length === 0 && search.trim() ? (
        <Alert status="accent" role="alert">
          No files matching &ldquo;{search}&rdquo;
        </Alert>
      ) : (
        <Card>
          <Card.Content>
            <ul className="flex flex-col">
              {filteredFiles.map((file: FileInfo, idx: number) => (
                <li key={file.path}>
                  <Link
                    to={`/${file.relativePath}`}
                    className="flex items-center gap-3 p-4 rounded-lg hover:bg-surface transition-colors min-h-[56px]"
                  >
                    <span className="text-xl">📄</span>
                    <span className="flex-1 font-medium">{file.relativePath}</span>
                    <span className="text-sm text-[var(--heroui-muted)]">
                      {formatFileSize(file.size)} · {new Date(file.modified).toLocaleDateString()}
                    </span>
                  </Link>
                  {idx < filteredFiles.length - 1 && <Separator className="mx-2" />}
                </li>
              ))}
            </ul>
            <div className="text-muted mt-4 text-sm">
              {search.trim()
                ? `Showing ${filteredFiles.length} of ${files.length}`
                : `${files.length} file${files.length !== 1 ? 's' : ''}`}
            </div>
          </Card.Content>
        </Card>
      )}
    </>
  );
}
