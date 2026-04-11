import type { Anchor } from '~/contexts/AnnotationStore';

export interface AnchorMatch {
  start: number;
  end: number;
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

function lineNumberAtIndex(markdown: string, index: number): number {
  if (index <= 0) return 1;
  return markdown.slice(0, Math.min(index, markdown.length)).split('\n').length;
}

function extractHeadingPathAtIndex(markdown: string, index: number): string[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const path: Array<{ level: number; text: string }> = [];

  for (const match of markdown.matchAll(headingRegex)) {
    const headingIndex = match.index ?? 0;
    if (headingIndex > index) break;

    const level = match[1].length;
    const text = match[2].trim();

    while (path.length > 0 && path[path.length - 1].level >= level) {
      path.pop();
    }

    path.push({ level, text });
  }

  return path.map((entry) => entry.text);
}

function findSectionByHeadingPath(markdown: string, headingPath: string[]): AnchorMatch | null {
  if (headingPath.length === 0) return null;

  const lines = markdown.split('\n');
  const path: string[] = [];
  let offset = 0;
  let sectionStart = -1;
  let sectionLevel = 7;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();

      while (path.length >= level) {
        path.pop();
      }
      path.push(text);

      if (headingPath.length === path.length && headingPath.every((value, index) => value === path[index])) {
        sectionStart = offset + line.length + 1;
        sectionLevel = level;
      } else if (sectionStart >= 0 && level <= sectionLevel) {
        return { start: sectionStart, end: offset };
      }
    }

    offset += line.length + 1;
  }

  if (sectionStart >= 0) {
    return { start: sectionStart, end: markdown.length };
  }

  return null;
}

function scoreCandidate(markdown: string, anchor: Anchor, candidateStart: number): number {
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
    if (section && candidateStart >= section.start && candidateStart < section.end) {
      score += 120;
    }
  }

  return score;
}

export function resolveAnchorInMarkdown(markdown: string, anchor: Anchor | null): AnchorMatch | null {
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

export function enrichAnchorFromMarkdown(markdown: string, anchor: Anchor): Anchor {
  const match = resolveAnchorInMarkdown(markdown, anchor);
  if (!match) return anchor;

  return {
    ...anchor,
    rangeStart: match.start,
    rangeEnd: match.end,
    fallbackLine: lineNumberAtIndex(markdown, match.start),
    headingPath: extractHeadingPathAtIndex(markdown, match.start),
  };
}
