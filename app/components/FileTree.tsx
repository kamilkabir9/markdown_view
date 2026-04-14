import { ChevronRightIcon, FileTextIcon, FolderIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import type { FileTreeNode } from '~/lib/file-tree';

interface FileTreeProps {
  nodes: FileTreeNode[];
  search: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTreeNodeList({ nodes, search }: FileTreeProps) {
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

export function FileTree({ nodes, search }: FileTreeProps) {
  return <FileTreeNodeList nodes={nodes} search={search} />;
}
