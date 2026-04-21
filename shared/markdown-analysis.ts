import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';

export interface MarkdownBlockRange {
  type: string;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface MarkdownSection {
  slug: string;
  depth: number;
  title: string;
  path: string[];
  startOffset: number;
  endOffset: number;
  headingEndOffset: number;
  excerpt: string;
  children: MarkdownSection[];
}

export interface MarkdownHeading {
  depth: number;
  title: string;
  slug: string;
  headingIndex: number;
  startOffset: number;
  endOffset: number;
  path: string[];
}

export interface MarkdownAnalysis {
  headings: MarkdownHeading[];
  sections: MarkdownSection[];
  blockRanges: MarkdownBlockRange[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMarkdown(markdown: string): any {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getExcerpt(root: any, headingIndex: number, nextHeadingIndex: number): string {
  for (let index = headingIndex + 1; index < nextHeadingIndex; index += 1) {
    const node = root.children[index];
    if (!node || node.type === 'heading') {
      continue;
    }

    const text = toString(node).replace(/\s+/g, ' ').trim();
    if (text) {
      return text.slice(0, 180);
    }
  }

  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inferBlockType(node: any): string {
  switch (node.type) {
    case 'heading':
      return 'heading';
    case 'paragraph':
      return 'paragraph';
    case 'listItem':
      return 'list-item';
    case 'blockquote':
      return 'blockquote';
    case 'code':
      return 'code-block';
    case 'tableCell':
      return 'table-cell';
    case 'table':
      return 'table';
    default:
      return node.type;
  }
}

export function analyzeMarkdown(markdown: string): MarkdownAnalysis {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root: any = parseMarkdown(markdown);
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];
  const headingPath: { depth: number; title: string }[] = [];
  const blockRanges: MarkdownBlockRange[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(root, (node: any, index: number | undefined, parent: any) => {
    const startOffset: number | undefined = node.position?.start?.offset;
    const endOffset: number | undefined = node.position?.end?.offset;

    if (typeof startOffset === 'number' && typeof endOffset === 'number') {
      if (node.type === 'paragraph'
        || node.type === 'heading'
        || node.type === 'listItem'
        || node.type === 'blockquote'
        || node.type === 'code'
        || node.type === 'tableCell') {
        const text = toString(node).replace(/\s+/g, ' ').trim();
        blockRanges.push({
          type: inferBlockType(node),
          startOffset,
          endOffset,
          text: text.slice(0, 180),
        });
      }
    }

    if (node.type !== 'heading' || typeof index !== 'number' || !parent || !('children' in parent)) {
      return;
    }

    const title = toString(node).replace(/\s+/g, ' ').trim();
    if (!title) {
      return;
    }

    while (headingPath.length > 0 && headingPath[headingPath.length - 1].depth >= node.depth) {
      headingPath.pop();
    }

    const slug = slugger.slug(title);
    const path = [...headingPath.map((entry) => entry.title), title];
    const nextEntry: MarkdownHeading = {
      depth: node.depth,
      title,
      slug,
      headingIndex: index,
      startOffset: startOffset!,
      endOffset: endOffset!,
      path,
    };

    headings.push(nextEntry);
    headingPath.push({ depth: node.depth, title });
  });

  const sections: MarkdownSection[] = [];
  const stack: MarkdownSection[] = [];

  headings.forEach((heading, index) => {
    const nextHeading = headings[index + 1];
    const section: MarkdownSection = {
      slug: heading.slug,
      depth: heading.depth,
      title: heading.title,
      path: heading.path,
      startOffset: heading.startOffset,
      endOffset: nextHeading?.startOffset ?? markdown.length,
      headingEndOffset: heading.endOffset,
      excerpt: getExcerpt(root, heading.headingIndex, nextHeading?.headingIndex ?? root.children.length),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= section.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      sections.push(section);
    } else {
      stack[stack.length - 1].children.push(section);
    }

    stack.push(section);
  });

  return {
    headings,
    sections,
    blockRanges,
  };
}

export function findHeadingPathAtIndex(markdown: string, index: number): string[] {
  const { headings } = analyzeMarkdown(markdown);
  let match: string[] = [];

  headings.forEach((heading) => {
    if (heading.startOffset <= index) {
      match = heading.path;
    }
  });

  return match;
}

export function findSectionByHeadingPath(markdown: string, path: string[]): MarkdownSection | null {
  if (!Array.isArray(path) || path.length === 0) {
    return null;
  }

  const { sections } = analyzeMarkdown(markdown);
  const queue = [...sections];

  while (queue.length > 0) {
    const section = queue.shift();
    if (!section) {
      continue;
    }

    if (section.path.length === path.length && section.path.every((segment, index) => segment === path[index])) {
      return section;
    }

    queue.unshift(...section.children);
  }

  return null;
}

export function findBlockAtIndex(markdown: string, index: number): MarkdownBlockRange | null {
  const { blockRanges } = analyzeMarkdown(markdown);

  return blockRanges.find((block) => index >= block.startOffset && index <= block.endOffset) ?? null;
}
