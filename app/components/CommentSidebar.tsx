import { useCallback } from 'react';
import type { Annotation } from '~/contexts/AnnotationStore';

interface CommentSidebarProps {
  annotations: Annotation[];
  rawContent: string;
  onRemove: (id: string) => void;
}

export function CommentSidebar({ annotations, rawContent, onRemove }: CommentSidebarProps) {
  const findMarkdownContext = useCallback((exact: string): string => {
    const index = rawContent.indexOf(exact);
    if (index === -1) return exact;

    let lineStart = rawContent.lastIndexOf('\n', index);
    if (lineStart === -1) lineStart = 0;
    else lineStart += 1;

    let lineEnd = rawContent.indexOf('\n', index + exact.length);
    if (lineEnd === -1) lineEnd = rawContent.length;

    const lines: string[] = [];
    let currentStart = lineStart;
    
    for (let i = 0; i < 2; i++) {
      const prevNewline = rawContent.lastIndexOf('\n', currentStart - 1);
      if (prevNewline === -1) break;
      const prevLineStart = prevNewline + 1;
      lines.unshift(rawContent.slice(prevLineStart, prevNewline));
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
    const contextLines = lines.filter(l => l !== selectedLine);
    
    return [selectedLine, ...contextLines.slice(0, 2)].join('\n');
  }, [rawContent]);

  const handleCopyOne = useCallback((annotation: Annotation) => {
    const context = findMarkdownContext(annotation.anchor.exact);
    const copyText = `${context}\n\n// Comment: ${annotation.text}`;
    navigator.clipboard.writeText(copyText);
  }, [findMarkdownContext]);

  const handleCopyAll = useCallback(() => {
    const allComments = annotations.map((annotation) => {
      const context = findMarkdownContext(annotation.anchor.exact);
      return `${context}\n\n// Comment: ${annotation.text}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(allComments);
  }, [annotations, findMarkdownContext]);

  if (annotations.length === 0) return null;

  return (
    <div className="w-64 flex-shrink-0">
      <div className="sticky top-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-base-content/70">
            Comments ({annotations.length})
          </h4>
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleCopyAll}
            title="Copy all comments"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span className="ml-1">Copy All</span>
          </button>
        </div>
        <div className="space-y-2">
          {annotations.map((annotation) => (
            <div key={annotation.id} className="card card-compact bg-base-200 shadow-sm">
              <div className="card-body">
                <p className="text-xs text-base-content/60 line-clamp-2 font-mono">
                  "{annotation.anchor.exact.slice(0, 50)}
                  {annotation.anchor.exact.length > 50 ? '...' : ''}"
                </p>
                <p className="text-sm">{annotation.text}</p>
                <div className="card-actions justify-end mt-1">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleCopyOne(annotation)}
                    title="Copy with markdown"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => onRemove(annotation.id)}
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
