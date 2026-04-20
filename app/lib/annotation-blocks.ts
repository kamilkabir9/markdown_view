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

function getDeepestBoundaryNode(node: Node | null, preferLastChild: boolean): Node | null {
  let current = node;

  while (current && current.hasChildNodes()) {
    current = preferLastChild
      ? current.lastChild
      : current.firstChild;
  }

  return current;
}

function resolveRangeBoundaryNode(containerNode: Node, offset: number, preferPreviousSibling: boolean): Node {
  if (!(containerNode instanceof Element)) {
    return containerNode;
  }

  const childCount = containerNode.childNodes.length;
  if (childCount === 0) {
    return containerNode;
  }

  const targetIndex = preferPreviousSibling
    ? Math.min(Math.max(offset - 1, 0), childCount - 1)
    : Math.min(Math.max(offset, 0), childCount - 1);
  const targetNode = containerNode.childNodes.item(targetIndex);

  if (!targetNode) {
    return containerNode;
  }

  return getDeepestBoundaryNode(targetNode, preferPreviousSibling) ?? targetNode;
}

function getAnnotationBlockAncestors(node: Node, container: HTMLElement): HTMLElement[] {
  const element = getClosestElement(node);
  if (!element) {
    return [];
  }

  const ancestors: HTMLElement[] = [];
  let current: Element | null = element;

  while (current && container.contains(current)) {
    if (current instanceof HTMLElement && current.matches(ANNOTATION_BLOCK_SELECTOR)) {
      ancestors.push(current);
    }

    current = current.parentElement;
  }

  return ancestors;
}

export function isRangeWithinSingleAnnotationBlock(range: Range, container: HTMLElement): boolean {
  const startNode = resolveRangeBoundaryNode(range.startContainer, range.startOffset, false);
  const endNode = resolveRangeBoundaryNode(range.endContainer, range.endOffset, true);
  const startBlocks = getAnnotationBlockAncestors(startNode, container);
  const endBlocks = getAnnotationBlockAncestors(endNode, container);

  if (startBlocks.length === 0 || endBlocks.length === 0) {
    return false;
  }

  return startBlocks.some((block) => endBlocks.includes(block));
}
