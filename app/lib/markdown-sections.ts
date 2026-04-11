import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Heading, Root } from 'mdast';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';

export interface MarkdownSection {
  slug: string;
  depth: number;
  title: string;
  startOffset: number;
  endOffset: number;
  excerpt: string;
  children: MarkdownSection[];
}

interface HeadingEntry {
  depth: number;
  title: string;
  slug: string;
  headingIndex: number;
  startOffset: number;
  endOffset: number;
}

function getExcerpt(root: Root, headingIndex: number, nextHeadingIndex: number): string {
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

export function extractMarkdownSections(markdown: string): MarkdownSection[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  const slugger = new GithubSlugger();
  const headings: HeadingEntry[] = [];

  visit(tree, 'heading', (node: Heading, index, parent) => {
    if (typeof index !== 'number' || !parent || !('children' in parent)) {
      return;
    }

    const title = toString(node).replace(/\s+/g, ' ').trim();
    if (!title) {
      return;
    }

    headings.push({
      depth: node.depth,
      title,
      slug: slugger.slug(title),
      headingIndex: index,
      startOffset: node.position?.start.offset ?? 0,
      endOffset: node.position?.end.offset ?? node.position?.start.offset ?? 0,
    });
  });

  const sections: MarkdownSection[] = [];
  const stack: MarkdownSection[] = [];

  headings.forEach((heading, index) => {
    const nextHeading = headings[index + 1];
    const section: MarkdownSection = {
      slug: heading.slug,
      depth: heading.depth,
      title: heading.title,
      startOffset: heading.startOffset,
      endOffset: nextHeading?.startOffset ?? markdown.length,
      excerpt: getExcerpt(tree, heading.headingIndex, nextHeading?.headingIndex ?? tree.children.length),
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

  return sections;
}

export function extractHeadingPath(markdown: string, targetSlug: string): string[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  const slugger = new GithubSlugger();
  const path: Array<{ depth: number; title: string }> = [];
  let headingPath: string[] = [];

  visit(tree, 'heading', (node: Heading) => {
    const title = toString(node).replace(/\s+/g, ' ').trim();
    if (!title) {
      return;
    }

    const slug = slugger.slug(title);
    while (path.length > 0 && path[path.length - 1].depth >= node.depth) {
      path.pop();
    }
    path.push({ depth: node.depth, title });

    if (slug === targetSlug) {
      headingPath = path.map((entry) => entry.title);
    }
  });

  return headingPath;
}
