import { useMemo, useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { SearchIcon, XIcon } from 'lucide-react';
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 border-l border-border/70 pl-4">
      <p className="text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl leading-none font-semibold tracking-tight text-foreground">{value}</p>
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
      <div className="space-y-7">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Markdown Files</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <section className="app-shell-panel rounded-md p-6 sm:p-8">
          <div className="max-w-3xl space-y-5">
            <div>
              <h1 className="font-[var(--font-display)] text-[clamp(2rem,5vw,3.3rem)] leading-[0.95] tracking-tight text-foreground">
                No markdown files found.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                Add a few `.md` files to this folder and they will appear here as a quiet, searchable library.
              </p>
            </div>

            <Alert className="max-w-xl rounded-sm border-border/65 bg-surface text-left shadow-none">
              <AlertTitle>Tip</AlertTitle>
              <AlertDescription>
                You can point the CLI at another folder with `markdown-viewer --cwd ./docs`.
              </AlertDescription>
            </Alert>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Markdown Files</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="app-shell-panel rounded-md p-6 sm:p-8">
        <div className="space-y-6">
          <div className="max-w-3xl">
            <h1 className="font-[var(--font-display)] text-[clamp(2.15rem,5vw,3.8rem)] leading-[0.92] tracking-tight text-foreground">
              Markdown library
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              Browse every file in this workspace, scan metadata quickly, and open each document in a focused reader.
            </p>
          </div>

          <div className="grid gap-5 border-y border-border/70 py-5 sm:grid-cols-3">
            <Stat label="Files" value={String(files.length)} />
            <Stat label="Folders" value={String(directoryCount)} />
            <Stat label="Fresh this week" value={String(recentCount)} />
          </div>

          <div className="max-w-2xl">
            <label htmlFor="file-search" className="mb-2 block text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
              Search files
            </label>
            <div className="flex h-11 items-center gap-3 border-b border-border/80 px-1">
              <SearchIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="file-search"
                type="text"
                aria-label="Search markdown files"
                placeholder="Type a file name or folder path"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/90 outline-none"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="rounded-sm p-1 text-muted-foreground transition hover:text-foreground"
                  aria-label="Clear search"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="app-shell-panel rounded-md p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
          <h2 className="font-[var(--font-display)] text-3xl leading-none tracking-tight text-foreground">Index</h2>
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            {search.trim() ? `${filteredFiles.length} results for "${search}"` : `${files.length} documents in this folder`}
          </p>
        </div>

        {filteredFiles.length === 0 && search.trim() ? (
          <Alert className="rounded-sm border-border/65 bg-surface shadow-none">
            <AlertTitle>No matches yet</AlertTitle>
            <AlertDescription>
              No files matched "{search}". Try a shorter name, a folder segment, or clear the search.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="divide-y divide-border/65">
            {filteredFiles.map((file: FileInfo) => {
              const { name, directory } = splitRelativePath(file.relativePath);

              return (
                <li key={file.path}>
                  <Link
                    to={`/${file.relativePath}`}
                    className="block px-1 py-4 transition-colors duration-150 hover:bg-surface-secondary/35"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(9rem,13rem)_minmax(8rem,10rem)_minmax(11rem,13rem)] md:items-start md:gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-lg leading-tight font-semibold tracking-tight text-foreground">{name}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{directory}</p>
                      </div>
                      <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase md:text-right">{formatFileSize(file.size)}</p>
                      <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase md:text-right">{new Date(file.modified).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground md:text-right">{formatRelativeDate(file.modified)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
