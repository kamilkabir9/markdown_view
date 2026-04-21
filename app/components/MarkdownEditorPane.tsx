import { useEffect, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { MarkdownPreview } from '~/components/MarkdownPreview';
import { MarkdownSourceEditor, type MarkdownSourceEditorHandle } from '~/components/MarkdownSourceEditor';
import { useCopySettings } from '~/contexts/CopySettingsContext';

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
  const { syncScroll } = useCopySettings();
  const previewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isDesktopSplit || !syncScroll) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 120;
    let animationFrameId: number | undefined;
    let detach: (() => void) | undefined;

    const attach = (editorScrollDOM: HTMLElement, previewEl: HTMLElement) => {
      let source: 'editor' | 'preview' | null = null;

      const clearSource = () => { source = null; };

      const onEditorScroll = () => {
        if (source === 'preview') return;
        source = 'editor';
        const ratio = editorScrollDOM.scrollTop / Math.max(editorScrollDOM.scrollHeight - editorScrollDOM.clientHeight, 1);
        previewEl.scrollTop = ratio * Math.max(previewEl.scrollHeight - previewEl.clientHeight, 1);
        requestAnimationFrame(clearSource);
      };

      const onPreviewScroll = () => {
        if (source === 'editor') return;
        source = 'preview';
        const ratio = previewEl.scrollTop / Math.max(previewEl.scrollHeight - previewEl.clientHeight, 1);
        editorScrollDOM.scrollTop = ratio * Math.max(editorScrollDOM.scrollHeight - editorScrollDOM.clientHeight, 1);
        requestAnimationFrame(clearSource);
      };

      editorScrollDOM.addEventListener('scroll', onEditorScroll, { passive: true });
      previewEl.addEventListener('scroll', onPreviewScroll, { passive: true });

      return () => {
        editorScrollDOM.removeEventListener('scroll', onEditorScroll);
        previewEl.removeEventListener('scroll', onPreviewScroll);
      };
    };

    const setupScrollSync = () => {
      if (cancelled) return;
      const editorScrollDOM = sourceEditorRef.current?.getScrollDOM();
      const previewEl = previewRef.current;

      if (!editorScrollDOM || !previewEl) {
        if (attempts < maxAttempts) {
          attempts++;
          animationFrameId = requestAnimationFrame(setupScrollSync);
        }
        return;
      }

      detach = attach(editorScrollDOM, previewEl);
    };

    setupScrollSync();

    return () => {
      cancelled = true;
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
      }
      detach?.();
    };
  }, [isDesktopSplit, syncScroll, sourceEditorRef]);

  return (
    <div className="flex-1 min-h-[32rem] min-w-0 xl:min-h-0">
      {isDesktopSplit ? (
        <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0 min-w-0" id="markdown-edit-split-panels">
          <ResizablePanel defaultSize={55} minSize={25} className="min-w-0">
            <div className="h-full min-h-0 min-w-0 pr-2">
              <MarkdownSourceEditor ref={sourceEditorRef} value={draft} onChange={onDraftChange} className="h-full min-h-0" />
            </div>
          </ResizablePanel>
          <ResizableHandle
            className="group w-3 cursor-col-resize bg-transparent"
            aria-label="Resize editor and preview panels"
            withHandle
          />
          <ResizablePanel defaultSize={45} minSize={25} className="min-w-0">
            <div className="h-full min-h-0 min-w-0 pl-2">
              <MarkdownPreview ref={previewRef} content={draft} documentSourcePath={documentSourcePath} className="h-full min-h-0 min-w-0" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="grid min-h-[32rem] min-w-0 gap-5">
          <MarkdownSourceEditor ref={sourceEditorRef} value={draft} onChange={onDraftChange} className="min-h-[32rem]" />
          <MarkdownPreview content={draft} documentSourcePath={documentSourcePath} className="min-h-[32rem]" />
        </div>
      )}
    </div>
  );
}
