import { Group, Panel, Separator } from 'react-resizable-panels';
import { MarkdownPreview } from '~/components/MarkdownPreview';
import { MarkdownSourceEditor, type MarkdownSourceEditorHandle } from '~/components/MarkdownSourceEditor';

interface MarkdownEditorPaneProps {
  draft: string;
  documentSourcePath: string;
  isDesktopSplit: boolean;
  sourceEditorRef: React.RefObject<MarkdownSourceEditorHandle | null>;
  onDraftChange: (value: string) => void;
}

export function MarkdownEditorPane({
  draft,
  documentSourcePath,
  isDesktopSplit,
  sourceEditorRef,
  onDraftChange,
}: MarkdownEditorPaneProps) {
  return (
    <div className="flex-1 min-h-[32rem] min-w-0 xl:min-h-0">
      {isDesktopSplit ? (
        <Group orientation="horizontal" className="h-full min-h-0 min-w-0" id="markdown-edit-split-panels">
          <Panel defaultSize={55} minSize={25} className="min-w-0">
            <div className="h-full min-h-0 min-w-0 pr-2">
              <MarkdownSourceEditor ref={sourceEditorRef} value={draft} onChange={onDraftChange} className="h-full min-h-0" />
            </div>
          </Panel>
          <Separator
            className="group flex w-3 shrink-0 cursor-col-resize items-stretch justify-center"
            aria-label="Resize editor and preview panels"
          >
            <span className="w-full rounded-sm border border-border/60 bg-surface transition-colors group-hover:border-primary/40 group-hover:bg-accent/50" />
          </Separator>
          <Panel defaultSize={45} minSize={25} className="min-w-0">
            <div className="h-full min-h-0 min-w-0 pl-2">
              <MarkdownPreview content={draft} documentSourcePath={documentSourcePath} className="h-full min-h-0 min-w-0" />
            </div>
          </Panel>
        </Group>
      ) : (
        <div className="grid min-h-[32rem] min-w-0 gap-5">
          <MarkdownSourceEditor ref={sourceEditorRef} value={draft} onChange={onDraftChange} className="min-h-[32rem]" />
          <MarkdownPreview content={draft} documentSourcePath={documentSourcePath} className="min-h-[32rem]" />
        </div>
      )}
    </div>
  );
}
