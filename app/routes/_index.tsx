import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { FileTree } from '~/components/FileTree';
import { fetchFiles, getErrorMessage, type FileInfo } from '~/lib/api';
import { buildMarkdownBreadcrumbs } from '~/lib/breadcrumbs';
import { buildFileTree } from '~/lib/file-tree';
import { SearchIcon, XIcon } from 'lucide-react';
import { useAppChrome } from '~/contexts/AppChromeContext';

export default function Index() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [contentRoot, setContentRoot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { setActions, setBreadcrumbs } = useAppChrome();

  useEffect(() => {
    const controller = new AbortController();

    async function loadFiles() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchFiles(controller.signal);
        setFiles(response.files);
        setContentRoot(response.contentRoot);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, 'The markdown library could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFiles();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.title = 'Markdown Viewer';

    setBreadcrumbs(buildMarkdownBreadcrumbs(null));
    setActions(null);

    return () => {
      setBreadcrumbs(null);
      setActions(null);
    };
  }, [setActions, setBreadcrumbs]);

  const filteredFiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matches = normalizedSearch
      ? files.filter((file: FileInfo) => file.relativePath.toLowerCase().includes(normalizedSearch))
      : files;

    return [...matches].sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
  }, [files, search]);

  const treeNodes = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  if (isLoading) {
    return (
      <div className="space-y-7">
        <section className="app-shell-panel rounded-md p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <h1 className="font-[var(--font-display)] text-[clamp(2rem,5vw,3.3rem)] leading-[0.95] tracking-tight text-foreground">
              Loading markdown library...
            </h1>
            <p className="text-base leading-8 text-muted-foreground">
              Scanning the selected content folder for markdown files.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-7">
        <section className="app-shell-panel rounded-md p-6 sm:p-8">
          <div className="max-w-3xl space-y-5">
            <div>
              <h1 className="font-[var(--font-display)] text-[clamp(2rem,5vw,3.3rem)] leading-[0.95] tracking-tight text-foreground">
                Markdown library unavailable.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                The app could not load the file index from the API.
              </p>
            </div>

            <Alert variant="destructive" className="max-w-xl rounded-sm border-border/65 text-left shadow-none">
              <AlertTitle>Library request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </section>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="space-y-7">
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
                  You can point the CLI at another folder with `markdown-viewer ./docs`.
                </AlertDescription>
              </Alert>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="app-shell-panel rounded-md p-4 sm:p-5">
        <div className="mb-5 space-y-5 border-b border-border/70 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="group flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-[clamp(2rem,4vw,3rem)] leading-[0.92] tracking-tight text-foreground">
                Markdown library
              </h1>
              <p className="max-w-[min(56vw,44rem)] truncate text-xs tracking-[0.08em] text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:max-w-[34rem]">
                <span className="normal-case tracking-normal text-foreground/90">{contentRoot}</span>
              </p>
            </div>
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              {search.trim() ? `${filteredFiles.length} results for "${search}"` : `${files.length} documents in this folder`}
            </p>
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

          <h2 className="font-[var(--font-display)] text-3xl leading-none tracking-tight text-foreground">Index</h2>
        </div>

        {filteredFiles.length === 0 && search.trim() ? (
          <Alert className="rounded-sm border-border/65 bg-surface shadow-none">
            <AlertTitle>No matches yet</AlertTitle>
            <AlertDescription>
              No files matched "{search}". Try a shorter name, a folder segment, or clear the search.
            </AlertDescription>
          </Alert>
        ) : (
          <FileTree nodes={treeNodes} search={search} />
        )}
      </section>
    </div>
  );
}
