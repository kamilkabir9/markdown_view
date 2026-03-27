import { useMemo, useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Alert, Breadcrumbs, SearchField, Surface, Table } from '@heroui/react';
import { getMarkdownFiles, type FileInfo } from '~/utils/files.server';

export const meta: MetaFunction = () => [{ title: 'Markdown Viewer' }];

export async function loader({}: LoaderFunctionArgs) {
  const files = await getMarkdownFiles();
  return { files };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeDate(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  const days = Math.floor(delta / (1000 * 60 * 60 * 24));

  if (days <= 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;

  return `Updated ${new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function splitRelativePath(relativePath: string) {
  const segments = relativePath.split('/');
  const name = segments[segments.length - 1] || relativePath;
  const directory = segments.length > 1 ? segments.slice(0, -1).join(' / ') : 'Workspace root';

  return { name, directory };
}

function getDirectoryCount(files: FileInfo[]) {
  return new Set(
    files.map((file) => {
      const segments = file.relativePath.split('/');
      return segments.length > 1 ? segments.slice(0, -1).join('/') : '.';
    }),
  ).size;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border/80 pl-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export default function Index() {
  const { files } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState('');

  const filteredFiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matches = normalizedSearch
      ? files.filter((file: FileInfo) => file.relativePath.toLowerCase().includes(normalizedSearch))
      : files;

    return [...matches].sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
  }, [files, search]);

  const directoryCount = useMemo(() => getDirectoryCount(files), [files]);
  const recentCount = useMemo(
    () =>
      files.filter(
        (file: FileInfo) => Date.now() - new Date(file.modified).getTime() < 1000 * 60 * 60 * 24 * 7,
      ).length,
    [files],
  );

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <nav aria-label="Breadcrumb">
          <Breadcrumbs className="gap-2 text-sm">
            <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
            <Breadcrumbs.Item>Markdown Files</Breadcrumbs.Item>
          </Breadcrumbs>
        </nav>

        <Surface variant="transparent" className="app-shell-panel rounded-[1.1rem] p-6 sm:p-8">
          <div className="max-w-2xl space-y-4">
            <div>
              <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-[2.8rem]">
                No markdown files found.
              </h1>
              <p className="mt-3 text-base leading-7 text-muted">
                Add a few `.md` files to this folder and they will appear here as a simple reading library.
              </p>
            </div>
            <Alert status="accent" role="alert" className="max-w-lg border-border/60 bg-surface text-left">
              <Alert.Content>
                <Alert.Title>Tip</Alert.Title>
                <Alert.Description>
                  The CLI can also point at another folder with `markdown-viewer --cwd ./docs`.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <Breadcrumbs className="gap-2 text-sm">
          <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
          <Breadcrumbs.Item>Markdown Files</Breadcrumbs.Item>
        </Breadcrumbs>
      </nav>

      <section>
        <Surface variant="transparent" className="app-shell-panel rounded-[1.1rem] p-6 sm:p-8">
          <div className="flex flex-col gap-8">
            <div className="max-w-3xl">
               <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
                 Markdown library
               </h1>
               <p className="mt-4 text-base leading-7 text-muted">
                 Browse the current folder, search by name, and open any document in a quiet reading view.
               </p>
             </div>

            <div className="grid gap-5 border-t border-border/70 pt-5 sm:grid-cols-3">
              <StatCard
                label="Files"
                value={String(files.length)}
              />
              <StatCard
                label="Folders"
                value={String(directoryCount)}
              />
              <StatCard
                label="Fresh This Week"
                value={String(recentCount)}
              />
            </div>
          </div>
        </Surface>
      </section>

      <Surface variant="transparent" className="app-shell-panel rounded-[1.1rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Files</h2>
            <p className="mt-1 text-sm text-muted">
              {search.trim() ? `${filteredFiles.length} results for “${search}”` : `${files.length} documents in this folder`}
            </p>
          </div>

          <div className="w-full max-w-xl">
            <SearchField aria-label="Search markdown files" value={search} onChange={setSearch}>
              <SearchField.Group className="h-11 rounded-[0.75rem] border border-border/70 bg-surface px-3">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search by file name or nested path..." className="h-11" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
        </div>

        <div className="pt-5">
          {filteredFiles.length === 0 && search.trim() ? (
            <Alert status="accent" role="alert" className="border-border/60 bg-surface">
              <Alert.Content>
                <Alert.Title>No matches yet</Alert.Title>
                <Alert.Description>
                  No files matched “{search}”. Try a shorter name, a folder segment, or clear the search.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <Table variant="secondary" className="border border-border/60 rounded-[0.95rem]">
              <Table.ScrollContainer>
                <Table.Content aria-label="Markdown files" className="min-w-[42rem] bg-transparent">
                  <Table.Header className="border-b border-border/60 bg-surface/70">
                    <Table.Column isRowHeader className="px-4 py-3 text-sm font-medium text-muted">
                      File
                    </Table.Column>
                    <Table.Column className="px-4 py-3 text-sm font-medium text-muted">
                      Location
                    </Table.Column>
                    <Table.Column className="px-4 py-3 text-sm font-medium text-muted">
                      Size
                    </Table.Column>
                    <Table.Column className="px-4 py-3 text-sm font-medium text-muted">
                      Updated
                    </Table.Column>
                  </Table.Header>
                  <Table.Body items={filteredFiles}>
                    {(file) => {
                      const { name, directory } = splitRelativePath(file.relativePath);

                      return (
                        <Table.Row
                          key={file.path}
                          id={file.path}
                          className="border-b border-border/60 last:border-b-0 data-[hovered]:bg-surface/55"
                        >
                          <Table.Cell className="px-4 py-3.5 align-top">
                            <Link
                              to={`/${file.relativePath}`}
                              className="block min-w-0 text-foreground transition-colors duration-150 hover:text-foreground/82"
                            >
                              <span className="block truncate text-base font-semibold tracking-tight">{name}</span>
                            </Link>
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3.5 align-top text-sm text-muted">
                            <span className="block min-w-0 truncate">{directory}</span>
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3.5 align-top text-sm text-muted whitespace-nowrap">
                            {formatFileSize(file.size)}
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3.5 align-top text-sm text-muted whitespace-nowrap">
                            {formatRelativeDate(file.modified)}
                          </Table.Cell>
                        </Table.Row>
                      );
                    }}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </div>
      </Surface>
    </div>
  );
}
