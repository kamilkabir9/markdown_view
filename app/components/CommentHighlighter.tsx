import { useEffect, type RefObject } from 'react';
import type { Annotation } from '~/contexts/AnnotationStore';

const BLOCK_SELECTOR = 'p, li, blockquote, pre, table, h1, h2, h3, h4, h5, h6';

interface CommentHighlighterProps {
  containerRef: RefObject<HTMLElement | null>;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  activeAnnotationId?: string | null;
}

function getIntersectingTextNodes(range: Range, container: HTMLElement): Text[] {
  const root =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;

  if (!root) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (!container.contains(node.parentNode)) return NodeFilter.FILTER_REJECT;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  return nodes;
}

function wrapRangeWithMarks(range: Range, annotationId: string, isActive: boolean): HTMLElement[] {
  const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? (range.commonAncestorContainer as HTMLElement)
    : range.commonAncestorContainer.parentElement;

  if (!container) return [];

  const textNodes = getIntersectingTextNodes(range, container);
  const marks: HTMLElement[] = [];

  textNodes.forEach((textNode) => {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(textNode);

    const startOffset = textNode === range.startContainer ? range.startOffset : 0;
    const endOffset = textNode === range.endContainer ? range.endOffset : textNode.textContent?.length ?? 0;

    if (startOffset >= endOffset) return;

    nodeRange.setStart(textNode, startOffset);
    nodeRange.setEnd(textNode, endOffset);

    const mark = document.createElement('mark');
    mark.setAttribute('data-annotation-id', annotationId);
    mark.className = [
      'annotation-mark',
      'box-decoration-clone cursor-pointer',
      isActive ? 'annotation-mark--active' : '',
    ].filter(Boolean).join(' ');

    try {
      nodeRange.surroundContents(mark);
      marks.push(mark);
    } catch {}
  });

  return marks;
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
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;
    const highlightContainer = container;

    const abortController = new AbortController();
    let isApplyingHighlights = false;
    let pendingFrame: number | null = null;
    let mutationObserver: MutationObserver | null = null;
    let clickHandlers: Array<{ mark: Element; handler: () => void }> = [];

    function removeAllMarks() {
      const annotatedBlocks = highlightContainer.querySelectorAll('[data-annotation-block]');
      annotatedBlocks.forEach((block) => {
        block.removeAttribute('data-annotation-block');
        block.removeAttribute('data-annotation-active');
      });

      const existingMarks = highlightContainer.querySelectorAll('mark[data-annotation-id]');
      existingMarks.forEach((mark) => {
        try {
          const parent = mark.parentNode;
          if (!parent) return;
          while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
          }
          parent.removeChild(mark);
          parent.normalize();
        } catch {}
      });

      clickHandlers.forEach(({ mark, handler }) => {
        try {
          mark.removeEventListener('click', handler);
        } catch {}
      });
      clickHandlers = [];
    }

    function applyHighlights() {
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
      }

      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        if (abortController.signal.aborted) return;

        isApplyingHighlights = true;

        if (annotations.length === 0) {
          removeAllMarks();
          isApplyingHighlights = false;
          return;
        }

        import('dom-anchor-text-quote')
          .then((textQuote) => {
            if (abortController.signal.aborted) return;

            try {
              removeAllMarks();

              annotations.forEach((annotation) => {
                try {
                  if (!annotation.anchor) return;
                  const range = textQuote.toRange(highlightContainer, annotation.anchor);
                  if (!range || range.collapsed) return;

                  const marks = wrapRangeWithMarks(
                    range,
                    annotation.id,
                    annotation.id === activeAnnotationId,
                  );
                  marks.forEach((mark) => {
                    const block = findAnnotatedBlock(mark, highlightContainer);
                    if (block) {
                      block.setAttribute('data-annotation-block', 'true');
                      if (annotation.id === activeAnnotationId) {
                        block.setAttribute('data-annotation-active', 'true');
                      }
                    }

                    const clickHandler = () => onAnnotationClick?.(annotation);
                    mark.addEventListener('click', clickHandler);
                    clickHandlers.push({ mark, handler: clickHandler });
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
        if (mutation.type === 'characterData') return true;

        if (mutation.type === 'childList') {
          return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
            if (!(node instanceof Element)) {
              return node.nodeType === Node.TEXT_NODE;
            }

            return !node.matches('mark[data-annotation-id]')
              && !node.closest('mark[data-annotation-id]');
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
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
      }
      mutationObserver?.disconnect();
      removeAllMarks();
    };
  }, [containerRef, annotations, onAnnotationClick, activeAnnotationId]);

  return null;
}
