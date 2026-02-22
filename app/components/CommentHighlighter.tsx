import { useEffect, useRef, type RefObject } from 'react';
import type { Annotation } from '~/contexts/AnnotationStore';

interface CommentHighlighterProps {
  containerRef: RefObject<HTMLDivElement | null>;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
}

export function CommentHighlighter({ 
  containerRef, 
  annotations, 
  onAnnotationClick 
}: CommentHighlighterProps) {
  const isProcessing = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isProcessing.current) return;
    
    const container = containerRef.current;
    if (!container) return;

    if (annotations.length === 0) {
      const existingMarks = container.querySelectorAll('mark[data-annotation-id]');
      existingMarks.forEach((mark) => {
        try {
          const parent = mark.parentNode;
          while (mark.firstChild) {
            parent?.insertBefore(mark.firstChild, mark);
          }
          parent?.removeChild(mark);
        } catch {}
      });
      return;
    }

    isProcessing.current = true;

    import('dom-anchor-text-quote').then((textQuote) => {
      requestAnimationFrame(() => {
        try {
          const existingMarks = container.querySelectorAll('mark[data-annotation-id]');
          existingMarks.forEach((mark) => {
            try {
              const parent = mark.parentNode;
              while (mark.firstChild) {
                parent?.insertBefore(mark.firstChild, mark);
              }
              parent?.removeChild(mark);
            } catch {}
          });

          annotations.forEach((annotation) => {
            try {
              if (!annotation.anchor) return;
              const range = textQuote.toRange(container, annotation.anchor);
              if (!range) return;

              const contents = range.extractContents();
              const mark = document.createElement('mark');
              mark.setAttribute('data-annotation-id', annotation.id);
              mark.className = 'bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5 cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700/50 transition-colors';
              mark.appendChild(contents);
              range.insertNode(mark);

              const clickHandler = () => onAnnotationClick?.(annotation);
              mark.addEventListener('click', clickHandler);
            } catch {}
          });
        } finally {
          isProcessing.current = false;
        }
      });
    }).catch(() => {
      isProcessing.current = false;
    });
  }, [containerRef, annotations, onAnnotationClick]);

  return null;
}
