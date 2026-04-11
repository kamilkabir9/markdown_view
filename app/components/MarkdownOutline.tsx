import { useMemo } from 'react';
import type { MarkdownSection } from '~/lib/markdown-sections';
import { cn } from '~/lib/utils';

interface MarkdownOutlineProps {
  sections: MarkdownSection[];
  onNavigate?: (slug: string) => void;
  className?: string;
}

function flattenSections(sections: MarkdownSection[]): MarkdownSection[] {
  return sections.flatMap((section) => [section, ...flattenSections(section.children)]);
}

export function MarkdownOutline({ sections, onNavigate, className }: MarkdownOutlineProps) {
  const items = useMemo(() => flattenSections(sections), [sections]);

  return (
    <aside className={cn('flex min-h-0 flex-col space-y-3', className)}>
      <div className="app-shell-panel min-h-0 flex-1 overflow-y-auto rounded-md p-3">
        <h2 className="mb-3 text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">Summary</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No headings found in this file yet.</p>
        ) : (
          <nav aria-label="Document summary" className="space-y-1">
            {items.map((section) => (
              <button
                key={`${section.slug}:${section.startOffset}`}
                type="button"
                onClick={() => onNavigate?.(section.slug)}
                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/40"
                style={{ paddingLeft: `${section.depth * 0.75}rem` }}
              >
                <span className="block font-medium text-foreground">{section.title}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
