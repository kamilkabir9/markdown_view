export const ANNOTATION_BLOCK_SELECTOR = 'p, li, blockquote, pre, td, th, h1, h2, h3, h4, h5, h6';

function getClosestElement(node: Node): Element | null {
  if (node instanceof Element) {
    return node;
  }

  return node.parentElement;
}

export function findAnnotationBlock(node: Node, container: HTMLElement): HTMLElement | null {
  const element = getClosestElement(node);
  if (!element) {
    return null;
  }

  const block = element.closest(ANNOTATION_BLOCK_SELECTOR);
  if (block instanceof HTMLElement && container.contains(block)) {
    return block;
  }

  return null;
}

export function isRangeWithinSingleAnnotationBlock(range: Range, container: HTMLElement): boolean {
  const startBlock = findAnnotationBlock(range.startContainer, container);
  const endBlock = findAnnotationBlock(range.endContainer, container);

  return startBlock !== null && startBlock === endBlock;
}
