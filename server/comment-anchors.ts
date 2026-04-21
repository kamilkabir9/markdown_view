import { findBlockAtIndex, findHeadingPathAtIndex, findSectionByHeadingPath } from '../shared/markdown-analysis.js';

export interface TextAnchor {
  exact: string;
  prefix?: string;
  suffix?: string;
  rangeStart?: number;
  rangeEnd?: number;
  headingPath?: string[];
  fallbackLine?: number;
  sectionSlug?: string;
  blockType?: string;
}

function findAllIndices(haystack: string, needle: string): number[] {
  if (!needle) return [];

  const indices: number[] = [];
  let index = 0;

  while (index < haystack.length) {
    const next = haystack.indexOf(needle, index);
    if (next === -1) break;
    indices.push(next);
    index = next + Math.max(needle.length, 1);
  }

  return indices;
}

export function lineNumberAtIndex(markdown: string, index: number): number {
  if (index <= 0) return 1;
  return markdown.slice(0, Math.min(index, markdown.length)).split('\n').length;
}

function scoreCandidate(markdown: string, anchor: TextAnchor, candidateStart: number): number {
  let score = 0;
  const prefix = anchor.prefix ?? '';
  const suffix = anchor.suffix ?? '';
  const before = markdown.slice(Math.max(0, candidateStart - prefix.length), candidateStart);
  const after = markdown.slice(candidateStart + anchor.exact.length, candidateStart + anchor.exact.length + suffix.length + 96);

  if (prefix && before.endsWith(prefix)) score += 50;
  if (suffix && after.includes(suffix)) score += 50;

  if (typeof anchor.rangeStart === 'number') {
    score += Math.max(0, 100 - Math.abs(candidateStart - anchor.rangeStart) / 2);
  }

  if (typeof anchor.fallbackLine === 'number') {
    score += Math.max(0, 75 - Math.abs(lineNumberAtIndex(markdown, candidateStart) - anchor.fallbackLine) * 10);
  }

  if (anchor.headingPath?.length) {
    const section = findSectionByHeadingPath(markdown, anchor.headingPath);
    if (section && candidateStart >= section.startOffset && candidateStart < section.endOffset) {
      score += 120;
    }
  }

  if (anchor.sectionSlug) {
    const section = findSectionByHeadingPath(markdown, anchor.headingPath ?? []);
    if (section?.slug === anchor.sectionSlug) {
      score += 80;
    }
  }

  if (anchor.blockType) {
    const block = findBlockAtIndex(markdown, candidateStart);
    if (block?.type === anchor.blockType) {
      score += 45;
    }
  }

  return score;
}

export function resolveAnchorInMarkdown(markdown: string, anchor: TextAnchor): { start: number; end: number } | null {
  if (!anchor?.exact) return null;

  if (typeof anchor.rangeStart === 'number' && typeof anchor.rangeEnd === 'number') {
    const slice = markdown.slice(anchor.rangeStart, anchor.rangeEnd);
    if (slice === anchor.exact) {
      return { start: anchor.rangeStart, end: anchor.rangeEnd };
    }
  }

  const candidates = findAllIndices(markdown, anchor.exact);
  if (candidates.length === 0) {
    return null;
  }

  let bestStart = candidates[0];
  let bestScore = scoreCandidate(markdown, anchor, bestStart);

  for (const candidateStart of candidates.slice(1)) {
    const candidateScore = scoreCandidate(markdown, anchor, candidateStart);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestStart = candidateStart;
    }
  }

  return { start: bestStart, end: bestStart + anchor.exact.length };
}

export function enrichAnchorFromMarkdown(markdown: string, anchor: TextAnchor): TextAnchor {
  const match = resolveAnchorInMarkdown(markdown, anchor);
  if (!match) return anchor;

  return {
    ...anchor,
    rangeStart: match.start,
    rangeEnd: match.end,
    fallbackLine: lineNumberAtIndex(markdown, match.start),
    headingPath: findHeadingPathAtIndex(markdown, match.start),
    sectionSlug: findSectionByHeadingPath(markdown, findHeadingPathAtIndex(markdown, match.start))?.slug,
    blockType: findBlockAtIndex(markdown, match.start)?.type,
  };
}
