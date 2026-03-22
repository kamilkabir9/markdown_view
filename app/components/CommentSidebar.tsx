import { useCallback, useRef, useEffect, useState } from 'react';
import type { Annotation } from '~/contexts/AnnotationStore';

interface CommentSidebarProps {
  annotations: Annotation[];
  rawContent: string;
  onRemove: (id: string) => void;
  activeAnnotationId?: string | null;
}

export function CommentSidebar({ annotations, rawContent, onRemove, activeAnnotationId }: CommentSidebarProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (activeAnnotationId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeAnnotationId]);

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
    const contextLines = lines.filter(l => l !== selectedLine);

    return [selectedLine, ...contextLines.slice(0, 2)].join('\n');
  }, [rawContent]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      } catch {
        alert('Failed to copy to clipboard');
      }
    }
  }, []);

  const handleCopyOne = useCallback((annotation: Annotation) => {
    if (annotation.isGlobal || !annotation.anchor) {
      copyToClipboard(`// Global Comment: ${annotation.text}`, annotation.id);
      return;
    }
    const context = findMarkdownContext(annotation.anchor.exact);
    const copyText = `${context}\n\n// Comment: ${annotation.text}`;
    copyToClipboard(copyText, annotation.id);
  }, [findMarkdownContext, copyToClipboard]);

  const handleCopyAll = useCallback(() => {
    const allComments = annotations.map((annotation) => {
      if (annotation.isGlobal || !annotation.anchor) {
        return `// Global Comment: ${annotation.text}`;
      }
      const context = findMarkdownContext(annotation.anchor.exact);
      return `${context}\n\n// Comment: ${annotation.text}`;
    }).join('\n\n---\n\n');
    copyToClipboard(allComments, '__all__');
  }, [annotations, findMarkdownContext, copyToClipboard]);

  if (annotations.length === 0) return null;

  return (
    <div className="w-full lg:w-64 lg:flex-shrink-0">
      <div className="lg:sticky lg:top-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-base-content/70">
            Comments ({annotations.length})
          </h4>
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleCopyAll}
            title="Copy all comments"
          >
            {copiedId === '__all__' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
            <span className="ml-1">Copy All</span>
          </button>
        </div>
        <div className="space-y-2">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              ref={annotation.id === activeAnnotationId ? activeRef : undefined}
              className={`card card-compact bg-base-200 shadow-sm transition-all ${annotation.id === activeAnnotationId ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="card-body">
                {annotation.isGlobal ? (
                  <p className="text-xs text-base-content/60 font-semibold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Global Comment
                  </p>
                ) : (
                  <p className="text-xs text-base-content/60 line-clamp-2 font-mono">
                    &ldquo;{annotation.anchor?.exact.slice(0, 50)}
                    {(annotation.anchor?.exact.length || 0) > 50 ? '...' : ''}&rdquo;
                  </p>
                )}
                <p className="text-sm">{annotation.text}</p>
                <div className="card-actions justify-end mt-1">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleCopyOne(annotation)}
                    title="Copy with markdown"
                  >
                    {copiedId === annotation.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
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
