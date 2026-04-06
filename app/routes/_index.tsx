import { useEffect, useMemo, useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { ChevronRightIcon, FileTextIcon, FolderIcon, SearchIcon, XIcon } from 'lucide-react';
import { useAppChrome } from '~/contexts/AppChromeContext';
import { getMarkdownFiles, type FileInfo } from '~/utils/files.server';

export const meta: MetaFunction = () => [{ title: 'Markdown Viewer' }];

export async function loader({}: LoaderFunctionArgs) {
  const files = await getMarkdownFiles();
  const contentRoot = process.env.MARKDOWN_VIEWER_CONTENT_ROOT || process.cwd();
  return { files, contentRoot };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileTreeLeafNode {
  kind: 'file';
  name: string;
  file: FileInfo;
}

interface FileTreeDirectoryNode {
  kind: 'directory';
  name: string;
  children: FileTreeNode[];
}

type FileTreeNode = FileTreeLeafNode | FileTreeDirectoryNode;

interface MutableDirectoryNode {
  name: string;
  directories: Map<string, MutableDirectoryNode>;
  files: FileTreeLeafNode[];
}

function createMutableDirectory(name: string): MutableDirectoryNode {
  return {
    name,
    directories: new Map<string, MutableDirectoryNode>(),
    files: [],
  };
}

function toFileTreeNodes(directory: MutableDirectoryNode): FileTreeNode[] {
  const childDirectories = Array.from(directory.directories.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((childDirectory) => ({
      kind: 'directory' as const,
      name: childDirectory.name,
      children: toFileTreeNodes(childDirectory),
    }));

  const childFiles = [...directory.files].sort((a, b) => a.name.localeCompare(b.name));

  return [...childDirectories, ...childFiles];
}

function buildFileTree(files: FileInfo[]): FileTreeNode[] {
  const root = createMutableDirectory('');

  for (const file of files) {
    const segments = file.relativePath.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let currentDirectory = root;

    for (const segment of segments.slice(0, -1)) {
      let nextDirectory = currentDirectory.directories.get(segment);
      if (!nextDirectory) {
        nextDirectory = createMutableDirectory(segment);
        currentDirectory.directories.set(segment, nextDirectory);
      }
      currentDirectory = nextDirectory;
    }

    const filename = segments[segments.length - 1] || file.relativePath;
    currentDirectory.files.push({
      kind: 'file',
      name: filename,
      file,
    });
  }

  return toFileTreeNodes(root);
}

function FileTreeNodeList({ nodes, search }: { nodes: FileTreeNode[]; search: string }) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => {
        if (node.kind === 'directory') {
          return (
            <li key={`dir:${node.name}:${node.children.length}`}>
              <Collapsible defaultOpen={search.trim().length > 0} className="group/collapsible">
                <CollapsibleTrigger
                  className="group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-secondary/35"
                  aria-label={`Toggle ${node.name} directory`}
                >
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-90" />
                  <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{node.name}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-5">
                  <div className="ml-1 border-l border-border/55 pl-2">
                    <FileTreeNodeList nodes={node.children} search={search} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        }

        return (
          <li key={node.file.path}>
            <Link
              to={`/${node.file.relativePath}`}
              className="flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-secondary/35"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground">{node.name}</span>
              </span>
              <span className="hidden text-xs tracking-[0.12em] text-muted-foreground uppercase md:inline">
                {formatFileSize(node.file.size)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Index() {
  const { files, contentRoot } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState('');
  const { setActions, setBreadcrumbs } = useAppChrome();

  useEffect(() => {
    setBreadcrumbs(
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
      </Breadcrumb>,
    );
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
          <FileTreeNodeList nodes={treeNodes} search={search} />
        )}
      </section>
    </div>
  );
}
