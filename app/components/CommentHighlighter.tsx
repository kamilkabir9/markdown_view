import { useEffect, type RefObject } from 'react';
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
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    const abortController = new AbortController();

    function removeAllMarks() {
      const existingMarks = container!.querySelectorAll('mark[data-annotation-id]');
      existingMarks.forEach((mark) => {
        try {
          const parent = mark.parentNode;
          if (!parent) return;
          while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
          }
          parent.removeChild(mark);
        } catch {}
      });
    }

    if (annotations.length === 0) {
      removeAllMarks();
      return;
    }

    const clickHandlers: Array<{ mark: Element; handler: () => void }> = [];

    import('dom-anchor-text-quote').then((textQuote) => {
      if (abortController.signal.aborted) return;

      requestAnimationFrame(() => {
        if (abortController.signal.aborted) return;

        try {
          removeAllMarks();

          annotations.forEach((annotation) => {
            try {
              if (!annotation.anchor) return;
              const range = textQuote.toRange(container!, annotation.anchor);
              if (!range || range.collapsed) return;

              const contents = range.extractContents();
              const mark = document.createElement('mark');
              mark.setAttribute('data-annotation-id', annotation.id);
              mark.className = 'bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5 cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700/50 transition-colors';
              mark.appendChild(contents);
              range.insertNode(mark);

              const clickHandler = () => onAnnotationClick?.(annotation);
              mark.addEventListener('click', clickHandler);
              clickHandlers.push({ mark, handler: clickHandler });
            } catch {}
          });
        } catch {}
      });
    }).catch(() => {});

    return () => {
      abortController.abort();
      clickHandlers.forEach(({ mark, handler }) => {
        try {
          mark.removeEventListener('click', handler);
        } catch {}
      });
    };
  }, [containerRef, annotations, onAnnotationClick]);

  return null;
}
