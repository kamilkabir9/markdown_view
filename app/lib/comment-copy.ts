import type { Annotation } from '~/contexts/AnnotationStore';
import { resolveAnchorInMarkdown } from '~/lib/comment-anchors';

export interface CommentCopyOptions {
  contextPrefix: string;
  commentPrefix: string;
  commentsDelimiter: string;
  selectedPath: string;
}

export function formatCreatedAt(value: string): string {
  const date = new Date(value);
  const delta = Date.now() - date.getTime();
  const minutes = Math.floor(delta / (1000 * 60));
  const hours = Math.floor(delta / (1000 * 60 * 60));
  const days = Math.floor(delta / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getSelectedTextPreview(value: string, maxLength = 180): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  const startLength = Math.max(60, Math.floor((maxLength - 5) * 0.55));
  const endLength = Math.max(32, maxLength - startLength - 5);
  return `${compact.slice(0, startLength)} ... ${compact.slice(-endLength)}`;
}

export function findMarkdownContext(rawContent: string, annotation: Annotation): string {
  const exact = annotation.anchor?.exact ?? '';
  const resolved = resolveAnchorInMarkdown(rawContent, annotation.anchor);
  const index = resolved?.start ?? rawContent.indexOf(exact);
  if (index === -1) return exact;

  let lineStart = rawContent.lastIndexOf('\n', index);
  if (lineStart === -1) lineStart = 0;
  else lineStart += 1;

  let lineEnd = rawContent.indexOf('\n', index + exact.length);
  if (lineEnd === -1) lineEnd = rawContent.length;

  const lines: string[] = [];
  let currentStart = lineStart;

  for (let i = 0; i < 2; i += 1) {
    const prevNewline = rawContent.lastIndexOf('\n', currentStart - 1);
    if (prevNewline === -1) break;
    const prevLineStart = prevNewline + 1;
    lines.unshift(rawContent.slice(prevLineStart, currentStart - 1));
    currentStart = prevLineStart;
  }

  let currentEnd = lineEnd;
  while (currentEnd < rawContent.length && lines.length < 5) {
    const nextNewline = rawContent.indexOf('\n', currentEnd + 1);
    if (nextNewline === -1) {
      if (currentEnd < rawContent.length) {
        lines.push(rawContent.slice(currentEnd + 1));
      }
      break;
    }
    lines.push(rawContent.slice(currentEnd + 1, nextNewline));
    currentEnd = nextNewline;
  }

  const selectedLine = rawContent.slice(lineStart, lineEnd);
  const contextLines = lines.filter((line) => line !== selectedLine);

  return [selectedLine, ...contextLines.slice(0, 2)].join('\n');
}

export function buildCommentCopyText(
  annotation: Annotation,
  rawContent: string,
  options: CommentCopyOptions,
): string {
  const filePrefix = `File Path: ${options.selectedPath}`;

  const text = annotation.text.trim();

  if (annotation.isGlobal || !annotation.anchor) {
    return `${filePrefix}\n\n// ${options.commentPrefix}: ${text}`;
  }

  const context = findMarkdownContext(rawContent, annotation).trim();
  return `${filePrefix}\n\n// ${options.contextPrefix}:\n${context}\n\n// ${options.commentPrefix}: ${text}`;
}

export function buildAllCommentsCopyText(
  annotations: Annotation[],
  rawContent: string,
  options: CommentCopyOptions,
): string {
  const allComments = annotations
    .map((annotation) => buildCommentCopyText(annotation, rawContent, options).replace(/^File Path: .*?\n\n/, ''))
    .join(`\n\n${options.commentsDelimiter}\n\n`);

  return `File Path: ${options.selectedPath}\n\n${allComments}`;
}
