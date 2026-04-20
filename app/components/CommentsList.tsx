import type { RefObject } from 'react';
import { CommentCard } from '~/components/CommentCard';
import type { Annotation } from '~/contexts/AnnotationStore';

interface CommentsListProps {
  annotations: Annotation[];
  activeAnnotationId?: string | null;
  copiedId?: string | null;
  inlineNumberById: Map<string, number>;
  activeRef: RefObject<HTMLDivElement | null>;
  onAnnotationClick?: (annotation: Annotation) => void;
  onCopy: (annotation: Annotation) => void;
  onRemove: (id: string) => Promise<void> | void;
  onUpdate: (id: string, text: string) => Promise<void> | void;
}

export function CommentsList({
  annotations,
  activeAnnotationId,
  copiedId,
  inlineNumberById,
  activeRef,
  onAnnotationClick,
  onCopy,
  onRemove,
  onUpdate,
}: CommentsListProps) {
  return (
    <div className="scrollbar-on-active max-h-[min(65vh,42rem)] overflow-y-auto pr-1">
      <div className="space-y-3 pb-1">
        {annotations.map((annotation, index) => (
          <CommentCard
            key={annotation.id}
            annotation={annotation}
            inlineNumber={inlineNumberById.get(annotation.id)}
            fallbackNumber={index + 1}
            isActive={annotation.id === activeAnnotationId}
            isCopied={copiedId === annotation.id}
            onCopy={onCopy}
            onRemove={onRemove}
            onUpdate={onUpdate}
            onClick={onAnnotationClick}
            cardRef={annotation.id === activeAnnotationId ? activeRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}
