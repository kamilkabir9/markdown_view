import { analyzeMarkdown } from '../../shared/markdown-analysis.js';

export interface MarkdownSection {
  slug: string;
  depth: number;
  title: string;
  startOffset: number;
  endOffset: number;
  excerpt: string;
  children: MarkdownSection[];
}

function toMarkdownSection(section: import('../../shared/markdown-analysis.js').MarkdownSection): MarkdownSection {
  return {
    slug: section.slug,
    depth: section.depth,
    title: section.title,
    startOffset: section.startOffset,
    endOffset: section.endOffset,
    excerpt: section.excerpt,
    children: section.children.map(toMarkdownSection),
  };
}

export function extractMarkdownSections(markdown: string): MarkdownSection[] {
  return analyzeMarkdown(markdown).sections.map(toMarkdownSection);
}

export function extractHeadingPath(markdown: string, targetSlug: string): string[] {
  const match = analyzeMarkdown(markdown).headings.find((heading) => heading.slug === targetSlug);
  return match?.path ?? [];
}
