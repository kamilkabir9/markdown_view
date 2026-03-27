import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button, Card, ScrollShadow } from '@heroui/react';
import type { Annotation } from '~/contexts/AnnotationStore';

interface CommentSidebarProps {
  annotations: Annotation[];
  rawContent: string;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  activeAnnotationId?: string | null;
  className?: string;
}

type FilterKey = 'all' | 'linked' | 'global';

function formatCreatedAt(value: string): string {
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

export function CommentSidebar({
  annotations,
  rawContent,
  onUpdate,
  onRemove,
  onAnnotationClick,
  activeAnnotationId,
  className = '',
}: CommentSidebarProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [annotations],
  );

  const counts = useMemo(
    () => ({
      all: sortedAnnotations.length,
      linked: sortedAnnotations.filter((annotation) => !annotation.isGlobal).length,
      global: sortedAnnotations.filter((annotation) => annotation.isGlobal).length,
    }),
    [sortedAnnotations],
  );

  const filteredAnnotations = useMemo(() => {
    if (filter === 'linked') {
      return sortedAnnotations.filter((annotation) => !annotation.isGlobal);
    }

    if (filter === 'global') {
      return sortedAnnotations.filter((annotation) => annotation.isGlobal);
    }

    return sortedAnnotations;
  }, [filter, sortedAnnotations]);

  useEffect(() => {
    if (activeAnnotationId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeAnnotationId]);

  useEffect(() => {
    if (filter === 'linked' && counts.linked === 0 && counts.all > 0) {
      setFilter(counts.global > 0 ? 'global' : 'all');
    }

    if (filter === 'global' && counts.global === 0 && counts.all > 0) {
      setFilter(counts.linked > 0 ? 'linked' : 'all');
    }

    if (counts.all === 0 && filter !== 'all') {
      setFilter('all');
    }
  }, [counts, filter]);

  const findMarkdownContext = useCallback(
    (exact: string): string => {
      const index = rawContent.indexOf(exact);
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
    },
    [rawContent],
  );

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

  const handleCopyOne = useCallback(
    (annotation: Annotation) => {
      if (annotation.isGlobal || !annotation.anchor) {
        copyToClipboard(`// Global Comment: ${annotation.text}`, annotation.id);
        return;
      }

      const context = findMarkdownContext(annotation.anchor.exact);
      const copyText = `${context}\n\n// Comment: ${annotation.text}`;
      copyToClipboard(copyText, annotation.id);
    },
    [copyToClipboard, findMarkdownContext],
  );

  const handleCopyAll = useCallback(() => {
    const allComments = annotations
      .map((annotation) => {
        if (annotation.isGlobal || !annotation.anchor) {
          return `// Global Comment: ${annotation.text}`;
        }

        const context = findMarkdownContext(annotation.anchor.exact);
        return `${context}\n\n// Comment: ${annotation.text}`;
      })
      .join('\n\n---\n\n');

    copyToClipboard(allComments, '__all__');
  }, [annotations, copyToClipboard, findMarkdownContext]);

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

  const handleEditKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        saveEditing();
      }
    },
    [saveEditing],
  );

  return (
    <Card className={`h-full rounded-[1.1rem] border border-border/60 bg-surface shadow-none ${className}`.trim()}>
      <Card.Header className="gap-3 border-b border-border/60 px-4 py-4">
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Card.Title className="text-base tracking-tight">Comments</Card.Title>
              <span className="text-sm text-muted">{counts.all}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="rounded-[0.8rem]"
            aria-label="Copy all comments"
            isDisabled={!annotations.length}
            onPress={handleCopyAll}
          >
            {copiedId === '__all__' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7.75A2.25 2.25 0 0110.25 5.5h6A2.25 2.25 0 0118.5 7.75v8.5A2.25 2.25 0 0116.25 18.5h-6A2.25 2.25 0 018 16.25v-8.5zm-2.5 9V8.25A2.25 2.25 0 018 6" />
              </svg>
            )}
          </Button>
        </div>
      </Card.Header>

      <Card.Content className="flex flex-1 flex-col gap-4 p-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'all' as const, label: 'All', count: counts.all },
            { key: 'linked' as const, label: 'Inline', count: counts.linked },
            { key: 'global' as const, label: 'Document', count: counts.global },
          ].map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? 'secondary' : 'ghost'}
              className="justify-between rounded-[0.8rem] px-3"
              onPress={() => setFilter(item.key)}
            >
              <span>{item.label}</span>
              <span className="text-xs text-muted">{item.count}</span>
            </Button>
          ))}
        </div>

        {counts.all === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-border/70 bg-background/72 p-5 text-sm">
            <p className="font-semibold tracking-tight text-foreground">No comments yet</p>
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-border/70 bg-background/72 p-5 text-sm">
            <p className="font-semibold tracking-tight text-foreground">No comments in this view</p>
          </div>
        ) : (
          <ScrollShadow className="max-h-[min(65vh,42rem)] pr-1" hideScrollBar>
            <div className="space-y-3 pb-1">
              {filteredAnnotations.map((annotation, index) => {
                const isActive = annotation.id === activeAnnotationId;

                return (
                  <div
                    key={annotation.id}
                    ref={isActive ? activeRef : undefined}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('button, textarea, input')) return;
                      onAnnotationClick?.(annotation);
                    }}
                  >
                    <Card
                      variant={isActive ? 'secondary' : 'default'}
                      className={`cursor-pointer rounded-[1rem] border transition-all duration-200 ${
                        isActive
                          ? 'border-foreground/12 bg-surface'
                          : 'border-border/60 bg-background shadow-none hover:border-foreground/12'
                      }`}
                    >
                      <Card.Content className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-[0.85rem] border text-sm font-semibold ${isActive ? 'border-foreground/12 bg-background text-foreground' : 'border-border/70 bg-surface text-muted'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold tracking-tight text-foreground">
                                  {annotation.isGlobal ? 'Document note' : 'Inline note'}
                                </p>
                                <span className="text-xs text-muted">{annotation.isGlobal ? 'Document' : 'Linked'}</span>
                              </div>
                              <p className="mt-1 text-xs font-medium text-muted">
                                {formatCreatedAt(annotation.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              className="rounded-[0.8rem]"
                              aria-label="Edit comment"
                              onPress={() => startEditing(annotation)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.862 4.487a2.1 2.1 0 112.97 2.97L8.75 18.539 5 19l.461-3.75 11.4-10.763z" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              className="rounded-[0.8rem]"
                              aria-label="Copy comment"
                              onPress={() => handleCopyOne(annotation)}
                            >
                              {copiedId === annotation.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7.75A2.25 2.25 0 0110.25 5.5h6A2.25 2.25 0 0118.5 7.75v8.5A2.25 2.25 0 0116.25 18.5h-6A2.25 2.25 0 018 16.25v-8.5zm-2.5 9V8.25A2.25 2.25 0 018 6" />
                                </svg>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              className="rounded-[0.8rem]"
                              aria-label="Remove comment"
                              onPress={() => onRemove(annotation.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </Button>
                          </div>
                        </div>

                        {annotation.isGlobal ? (
                          <div className="rounded-[0.9rem] border border-border/60 bg-surface px-3 py-2.5 text-sm text-muted">
                            Document note
                          </div>
                        ) : (
                          <div className="rounded-[0.9rem] border border-border/60 bg-surface px-3 py-3">
                            <p className="text-xs text-muted">
                              Selected text
                            </p>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground/90">
                              “{annotation.anchor?.exact}”
                            </p>
                          </div>
                        )}

                        {editingId === annotation.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="min-h-[7rem] w-full rounded-[0.9rem] border border-border/70 bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus:border-foreground/20 focus:ring-2 focus:ring-foreground/8"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="rounded-[0.8rem] px-3" onPress={cancelEditing}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="rounded-[0.8rem] px-3" isDisabled={!editingText.trim()} onPress={saveEditing}>
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-7 text-foreground">{annotation.text}</p>
                        )}
                      </Card.Content>
                    </Card>
                  </div>
                );
              })}
            </div>
          </ScrollShadow>
        )}
      </Card.Content>
    </Card>
  );
}
