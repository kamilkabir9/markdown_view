import { Button } from '~/components/ui/button';
import { CommentHighlighter } from '~/components/CommentHighlighter';
import { MarkdownPreview } from '~/components/MarkdownPreview';
import type { Annotation } from '~/contexts/AnnotationStore';

interface SelectionActionPosition {
  top: number;
  left: number;
}

interface MarkdownViewerPaneProps {
  content: string;
  previewKey: string;
  documentSourcePath: string;
  previewRef: React.RefObject<HTMLElement | null>;
  pendingAnchorQuote?: string | null;
  selectionActionPosition?: SelectionActionPosition | null;
  annotations: Annotation[];
  activeAnnotationId?: string | null;
  onCaptureSelection: () => Promise<void> | void;
  onOpenCreateComment: () => void;
  onAnnotationClick?: (annotation: Annotation) => void;
}

export function MarkdownViewerPane({
  content,
  previewKey,
  documentSourcePath,
  previewRef,
  pendingAnchorQuote,
  selectionActionPosition,
  annotations,
  activeAnnotationId,
  onCaptureSelection,
  onOpenCreateComment,
  onAnnotationClick,
}: MarkdownViewerPaneProps) {
  return (
    <div
      className="relative flex min-h-[32rem] min-w-0 flex-1 overflow-hidden xl:min-h-0"
      onMouseUp={() => void onCaptureSelection()}
      onKeyUp={() => void onCaptureSelection()}
    >
      <MarkdownPreview
        key={previewKey}
        ref={previewRef}
        content={content}
        documentSourcePath={documentSourcePath}
        className="min-h-0 min-w-0 flex-1"
      />
      {pendingAnchorQuote && selectionActionPosition ? (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            top: `${selectionActionPosition.top}px`,
            left: `${selectionActionPosition.left}px`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <Button
            className="pointer-events-auto h-8 rounded-sm px-3 shadow-sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onOpenCreateComment}
          >
            Add comment
          </Button>
        </div>
      ) : null}
      <CommentHighlighter
        containerRef={previewRef}
        annotations={annotations.filter((annotation) => !annotation.isGlobal)}
        activeAnnotationId={activeAnnotationId}
        onAnnotationClick={onAnnotationClick}
      />
    </div>
  );
}
