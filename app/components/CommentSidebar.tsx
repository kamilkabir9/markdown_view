import { useCallback, useRef, useEffect, useState } from 'react';
import type { Annotation } from '~/contexts/AnnotationStore';
import { Button, Card, Badge } from '@heroui/react';

interface CommentSidebarProps {
  annotations: Annotation[];
  rawContent: string;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  activeAnnotationId?: string | null;
}

export function CommentSidebar({ annotations, rawContent, onUpdate, onRemove, onAnnotationClick, activeAnnotationId }: CommentSidebarProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

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

  const startEditing = useCallback((annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditingText(annotation.text);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);

  const saveEditing = useCallback(() => {
    if (!editingId) return;
    const nextText = editingText.trim();
    if (!nextText) return;
    onUpdate(editingId, nextText);
    setEditingId(null);
    setEditingText('');
  }, [editingId, editingText, onUpdate]);

  if (annotations.length === 0) return null;

  return (
    <div className="w-full xl:w-72 xl:flex-shrink-0">
      <div className="flex max-h-[calc(100vh-8rem)] flex-col bg-background border border-default-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-3 border-b border-default-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Comments
            </h4>
            <Badge color="accent" size="sm" variant="soft">
              {annotations.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Copy all comments"
            onPress={handleCopyAll}
          >
            {copiedId === '__all__' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </Button>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              ref={annotation.id === activeAnnotationId ? activeRef : undefined}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('button, textarea, input')) return;
                onAnnotationClick?.(annotation);
              }}
            >
              <Card
                variant={annotation.id === activeAnnotationId ? 'secondary' : 'default'}
                className={`cursor-pointer transition-all ${annotation.id === activeAnnotationId ? 'ring-2 ring-accent' : ''}`}
              >
                <Card.Content className="relative p-3">
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      aria-label="Edit comment"
                      onPress={() => startEditing(annotation)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      aria-label="Copy comment"
                      onPress={() => handleCopyOne(annotation)}
                    >
                      {copiedId === annotation.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      aria-label="Remove comment"
                      onPress={() => onRemove(annotation.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                  {annotation.isGlobal ? (
                    <p className="text-xs text-muted font-semibold flex items-center gap-1 mb-2 pr-16">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Global Comment
                    </p>
                  ) : (
                    <div className="bg-surface rounded-lg p-2.5 mb-2 pr-16">
                      <p className="text-xs text-muted line-clamp-2 font-mono">
                        &ldquo;{annotation.anchor?.exact.slice(0, 40)}
                        {(annotation.anchor?.exact.length || 0) > 40 ? '...' : ''}&rdquo;
                      </p>
                    </div>
                  )}
                  {editingId === annotation.id ? (
                    <div className="pr-16 space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        className="w-full rounded-md border border-default-300 bg-background px-2 py-1.5 text-sm text-foreground"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="primary" isDisabled={!editingText.trim()} onPress={saveEditing}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onPress={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground pr-16 break-words">{annotation.text}</p>
                  )}
                </Card.Content>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
