import { useMemo, useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Alert, Breadcrumbs, Card, SearchField, Surface } from '@heroui/react';
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
    <div className="rounded-[1.5rem] border border-border/60 bg-background/78 p-4 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.7)] backdrop-blur-sm">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
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

        <Surface variant="transparent" className="app-shell-panel rounded-[2rem] p-8 text-center sm:p-10">
          <div className="mx-auto max-w-xl space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_85%,white),color-mix(in_oklab,var(--warning)_55%,var(--accent)))] text-accent-foreground shadow-[0_24px_48px_-28px_color-mix(in_oklab,var(--accent)_70%,transparent)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4.75h6.586a2 2 0 011.414.586l2.664 2.664A2 2 0 0118.25 9.414V18A2.25 2.25 0 0116 20.25H8A2.25 2.25 0 015.75 18V7A2.25 2.25 0 018 4.75z" />
              </svg>
            </div>
            <div>
              <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
                No markdown files found yet.
              </h1>
              <p className="mt-3 text-base leading-7 text-muted">
                Add a few `.md` files to this directory and the viewer will turn them into a searchable reading workspace.
              </p>
            </div>
            <Alert status="accent" role="alert" className="text-left">
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
        <Surface variant="transparent" className="app-shell-panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="flex h-full flex-col gap-6">
            <div className="max-w-2xl">
              <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
                Browse local markdown files.
              </h1>
              <p className="mt-4 text-base leading-7 text-muted">
                Search the current folder and open any document in reader mode.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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

      <Card className="overflow-hidden rounded-[2rem] border border-border/70 bg-surface/84 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.72)]">
        <Card.Header className="flex flex-col gap-5 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Card.Title className="text-2xl tracking-tight">Files ready to read</Card.Title>
              <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted">
                {search.trim() ? `${filteredFiles.length} matching` : `${files.length} total`}
              </span>
            </div>
          </div>

          <div className="w-full max-w-xl">
            <SearchField aria-label="Search markdown files" value={search} onChange={setSearch}>
              <SearchField.Group className="h-12 rounded-full border border-border/60 bg-background/80 pl-3 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search by file name or nested path..." className="h-12" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
        </Card.Header>

        <Card.Content className="p-6">
          {filteredFiles.length === 0 && search.trim() ? (
            <Alert status="accent" role="alert">
              <Alert.Content>
                <Alert.Title>No matches yet</Alert.Title>
                <Alert.Description>
                  No files matched “{search}”. Try a shorter name, a folder segment, or clear the search.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredFiles.map((file: FileInfo) => {
                  const { name, directory } = splitRelativePath(file.relativePath);

                  return (
                    <li key={file.path} className="h-full">
                      <Link to={`/${file.relativePath}`} className="group block h-full">
                        <Card className="flex h-full rounded-[1.6rem] border border-border/60 bg-background/74 shadow-none transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_24px_60px_-35px_color-mix(in_oklab,var(--accent)_40%,transparent)]">
                          <Card.Content className="flex h-full flex-col gap-5 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_18%,white),color-mix(in_oklab,var(--warning)_22%,white))] text-accent shadow-[0_14px_34px_-24px_color-mix(in_oklab,var(--accent)_65%,transparent)]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 4.75h6.586a2 2 0 011.414.586l2.664 2.664A2 2 0 0118.25 9.414V18A2.25 2.25 0 0116 20.25H8A2.25 2.25 0 015.75 18V7A2.25 2.25 0 018 4.75zm1.75 4.5h6.5m-6.5 4h6.5m-6.5 4h4.25" />
                                </svg>
                              </div>
                              <span className="rounded-full border border-border/60 bg-surface/90 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted">
                                md
                              </span>
                            </div>

                            <div className="space-y-2">
                              <h2 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
                                {name}
                              </h2>
                              <p className="min-h-[3rem] text-sm leading-6 text-muted">{directory}</p>
                            </div>

                            <div className="mt-auto flex flex-wrap gap-2 text-xs text-muted">
                              <span className="rounded-full border border-border/60 bg-surface/90 px-2.5 py-1">
                                {formatFileSize(file.size)}
                              </span>
                              <span className="rounded-full border border-border/60 bg-surface/90 px-2.5 py-1">
                                {formatRelativeDate(file.modified)}
                              </span>
                            </div>
                          </Card.Content>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>

            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
