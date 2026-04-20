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

export function analyzeMarkdown(markdown: string): MarkdownAnalysis;
export function findHeadingPathAtIndex(markdown: string, index: number): string[];
export function findSectionByHeadingPath(markdown: string, path: string[]): MarkdownSection | null;
export function findBlockAtIndex(markdown: string, index: number): MarkdownBlockRange | null;
