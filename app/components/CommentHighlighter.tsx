import { useEffect, useState, type RefObject } from 'react';
import type { Annotation } from '~/contexts/AnnotationStore';

const BLOCK_SELECTOR = 'p, li, blockquote, pre, table, h1, h2, h3, h4, h5, h6';
const SQUIGGLE_SELECTOR = 'span[data-annotation-squiggle][data-annotation-id][data-annotation-number]';
const ANNOTATION_CONTENT_SELECTOR = '[data-annotation-content]';

interface CommentHighlighterProps {
  containerRef: RefObject<HTMLElement | null>;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  activeAnnotationId?: string | null;
}

interface ResolvedAnnotationRange {
  annotation: Annotation;
  range: Range;
  number: number;
}

interface ActiveTooltip {
  squiggle: HTMLElement;
  label: string;
  left: number;
  top: number;
  placement: 'top' | 'bottom';
}

function formatTooltipComment(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

function buildTooltipLabel(number: number, commentText: string): string {
  const comment = formatTooltipComment(commentText);
  return comment ? `#${number} - ${comment}` : `#${number}`;
}

function createSquiggle(annotationId: string, number: number, commentText: string, isActive: boolean): HTMLSpanElement {
  const squiggle = document.createElement('span');
  squiggle.setAttribute('data-annotation-squiggle', 'true');
  squiggle.setAttribute('data-annotation-id', annotationId);
  squiggle.setAttribute('data-annotation-number', String(number));
  squiggle.className = ['annotation-squiggle', isActive ? 'annotation-squiggle--active' : ''].filter(Boolean).join(' ');
  squiggle.setAttribute('role', 'button');
  squiggle.setAttribute('tabindex', '0');

  const tooltipLabel = buildTooltipLabel(number, commentText);
  squiggle.setAttribute('aria-label', `Jump to inline comment ${tooltipLabel}`);

  return squiggle;
}

function measureTooltip(squiggle: HTMLElement, label: string): ActiveTooltip {
  const rect = squiggle.getBoundingClientRect();
  const left = Math.min(Math.max(rect.left + rect.width / 2, 16), window.innerWidth - 16);
  const placement = rect.top > 72 ? 'top' : 'bottom';

  return {
    squiggle,
    label,
    left,
    top: placement === 'top' ? rect.top : rect.bottom,
    placement,
  };
}

function trimRangeEdges(range: Range): Range | null {
  const nextRange = range.cloneRange();

  if (nextRange.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = nextRange.startContainer as Text;
    const text = textNode.textContent ?? '';
    let start = Math.min(nextRange.startOffset, text.length);

    while (start < text.length && /\s/.test(text[start] ?? '')) {
      start += 1;
    }

    nextRange.setStart(textNode, start);
  }

  if (nextRange.endContainer.nodeType === Node.TEXT_NODE) {
    const textNode = nextRange.endContainer as Text;
    const text = textNode.textContent ?? '';
    let end = Math.min(nextRange.endOffset, text.length);

    while (end > 0 && /\s/.test(text[end - 1] ?? '')) {
      end -= 1;
    }

    nextRange.setEnd(textNode, end);
  }

  if (nextRange.collapsed) {
    return null;
  }

  return nextRange;
}

function findAnnotatedBlock(mark: HTMLElement, container: HTMLElement): HTMLElement | null {
  const block = mark.closest(BLOCK_SELECTOR);
  if (block instanceof HTMLElement && container.contains(block)) {
    return block;
  }

  const fallback = mark.parentElement;
  return fallback && container.contains(fallback) ? fallback : null;
}

export function CommentHighlighter({
  containerRef,
  annotations,
  onAnnotationClick,
  activeAnnotationId,
}: CommentHighlighterProps) {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeTooltip) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && activeTooltip.squiggle.contains(target)) {
        return;
      }

      setActiveTooltip(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTooltip(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTooltip]);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeTooltip) return;

    const container = containerRef.current;
    if (!container) {
      setActiveTooltip(null);
      return;
    }

    const updateTooltipPosition = () => {
      setActiveTooltip((current) => {
        if (!current) return null;
        if (!document.contains(current.squiggle)) return null;
        return measureTooltip(current.squiggle, current.label);
      });
    };

    container.addEventListener('scroll', updateTooltipPosition, { passive: true });
    window.addEventListener('resize', updateTooltipPosition);

    return () => {
      container.removeEventListener('scroll', updateTooltipPosition);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [activeTooltip, containerRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    const highlightContainer = container;
    const abortController = new AbortController();
    let isApplyingHighlights = false;
    let pendingFrame: number | null = null;
    let mutationObserver: MutationObserver | null = null;
    let pendingSingleClick: number | null = null;
    let handlers: Array<{
      element: HTMLElement;
      click: (event: MouseEvent) => void;
      keydown: (event: KeyboardEvent) => void;
    }> = [];

    function removeAllMarks() {
      setActiveTooltip(null);
      if (pendingSingleClick !== null) {
        window.clearTimeout(pendingSingleClick);
        pendingSingleClick = null;
      }

      const annotatedBlocks = highlightContainer.querySelectorAll('[data-annotation-block]');
      annotatedBlocks.forEach((block) => {
        block.removeAttribute('data-annotation-block');
        block.removeAttribute('data-annotation-active');
      });

      const existingMarks = highlightContainer.querySelectorAll(SQUIGGLE_SELECTOR);
      existingMarks.forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;

        const contentWrapper = mark.querySelector(`:scope > ${ANNOTATION_CONTENT_SELECTOR}`);
        if (contentWrapper) {
          while (contentWrapper.firstChild) {
            parent.insertBefore(contentWrapper.firstChild, mark);
          }
        }

        parent.removeChild(mark);
      });

      handlers.forEach(({ element, click, keydown }) => {
        try {
          element.removeEventListener('click', click);
          element.removeEventListener('keydown', keydown);
        } catch {}
      });

      handlers = [];
    }

    function applyHighlights() {
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
      }

      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        if (abortController.signal.aborted) return;

        isApplyingHighlights = true;

        const inlineAnnotations = annotations.filter(
          (annotation): annotation is Annotation & { anchor: NonNullable<Annotation['anchor']> } =>
            !annotation.isGlobal && annotation.anchor !== null,
        );

        if (inlineAnnotations.length === 0) {
          removeAllMarks();
          isApplyingHighlights = false;
          return;
        }

        import('dom-anchor-text-quote')
          .then((textQuote) => {
            if (abortController.signal.aborted) return;

            try {
              removeAllMarks();

              const resolvedRanges: ResolvedAnnotationRange[] = [];

              inlineAnnotations.forEach((annotation, index) => {
                try {
                  const exact = annotation.anchor.exact.trim();
                  if (!exact) return;

                  const range = textQuote.toRange(highlightContainer, {
                    ...annotation.anchor,
                    exact,
                  });
                  if (!range || range.collapsed) return;

                  const trimmedRange = trimRangeEdges(range);
                  if (!trimmedRange) return;

                  resolvedRanges.push({
                    annotation,
                    range: trimmedRange,
                    number: index + 1,
                  });
                } catch {}
              });

              resolvedRanges
                .sort((left, right) => right.range.compareBoundaryPoints(Range.START_TO_START, left.range) || right.number - left.number)
                .forEach(({ annotation, range, number }) => {
                  try {
                    const squiggle = createSquiggle(annotation.id, number, annotation.text, annotation.id === activeAnnotationId);
                    const content = range.extractContents();
                    const contentWrapper = document.createElement('span');
                    contentWrapper.setAttribute('data-annotation-content', 'true');
                    contentWrapper.className = 'annotation-squiggle__content';
                    contentWrapper.append(content);
                    squiggle.append(contentWrapper);
                    range.insertNode(squiggle);

                    const block = findAnnotatedBlock(squiggle, highlightContainer);
                    if (block) {
                      block.setAttribute('data-annotation-block', 'true');
                      if (annotation.id === activeAnnotationId) {
                        block.setAttribute('data-annotation-active', 'true');
                      }
                    }

                    const tooltipLabel = buildTooltipLabel(number, annotation.text);
                    const clickHandler = (event: MouseEvent) => {
                      if (pendingSingleClick !== null) {
                        window.clearTimeout(pendingSingleClick);
                        pendingSingleClick = null;
                      }

                      if (event.detail >= 2) {
                        onAnnotationClick?.(annotation);
                        setActiveTooltip(measureTooltip(squiggle, tooltipLabel));
                        return;
                      }

                      pendingSingleClick = window.setTimeout(() => {
                        setActiveTooltip(null);
                        onAnnotationClick?.(annotation);
                        pendingSingleClick = null;
                      }, 220);
                    };
                    const keydownHandler = (event: KeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveTooltip(null);
                        onAnnotationClick?.(annotation);
                        return;
                      }

                      if (event.key === 'Escape') {
                        setActiveTooltip((current) => (current?.squiggle === squiggle ? null : current));
                        return;
                      }

                      if (event.key.toLowerCase() === 'd') {
                        event.preventDefault();
                        onAnnotationClick?.(annotation);
                        setActiveTooltip(measureTooltip(squiggle, tooltipLabel));
                      }
                    };

                    squiggle.addEventListener('click', clickHandler);
                    squiggle.addEventListener('keydown', keydownHandler);

                    handlers.push({
                      element: squiggle,
                      click: clickHandler,
                      keydown: keydownHandler,
                    });
                  } catch {}
                });
            } catch {}
            finally {
              isApplyingHighlights = false;
            }
          })
          .catch(() => {
            isApplyingHighlights = false;
          });
      });
    }

    mutationObserver = new MutationObserver((mutations) => {
      if (abortController.signal.aborted || isApplyingHighlights) return;

      const hasRelevantMutation = mutations.some((mutation) => {
        if (mutation.type === 'characterData') {
          if (mutation.target.parentElement?.closest(SQUIGGLE_SELECTOR)) {
            return false;
          }

          return true;
        }

        if (mutation.type === 'childList') {
          return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
            if (!(node instanceof Element)) {
              if (node.parentElement?.closest(SQUIGGLE_SELECTOR)) {
                return false;
              }

              return node.nodeType === Node.TEXT_NODE;
            }

            return !node.matches(SQUIGGLE_SELECTOR) && !node.closest(SQUIGGLE_SELECTOR);
          });
        }

        return false;
      });

      if (hasRelevantMutation) {
        applyHighlights();
      }
    });

    mutationObserver.observe(highlightContainer, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    applyHighlights();

    return () => {
      abortController.abort();
      if (pendingSingleClick !== null) {
        window.clearTimeout(pendingSingleClick);
      }
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
      }
      mutationObserver?.disconnect();
      removeAllMarks();
    };
  }, [containerRef, annotations, onAnnotationClick, activeAnnotationId]);

  if (!activeTooltip) {
    return null;
  }

  return (
    <div
      role="tooltip"
      className={[
        'annotation-floating-tooltip',
        activeTooltip.placement === 'top'
          ? 'annotation-floating-tooltip--top'
          : 'annotation-floating-tooltip--bottom',
      ].join(' ')}
      style={{
        top: `${activeTooltip.top}px`,
        left: `${activeTooltip.left}px`,
      }}
    >
      {activeTooltip.label}
    </div>
  );
}
