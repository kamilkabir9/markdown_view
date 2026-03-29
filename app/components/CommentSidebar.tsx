import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { CheckIcon, CopyIcon, PencilIcon, XIcon, ClipboardIcon } from 'lucide-react';
import type { Annotation } from '~/contexts/AnnotationStore';

interface CommentSidebarProps {
  annotations: Annotation[];
  rawContent: string;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onClose?: () => void;
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
  onClose,
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
    <Card className={`h-full rounded-md border border-border/65 bg-surface shadow-none ${className}`.trim()}>
      <CardHeader className="gap-3 border-b border-border/65 px-4 py-4">
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
                <CardTitle className="font-[var(--font-display)] text-2xl leading-none tracking-tight">Comments</CardTitle>
                <span className="text-sm text-muted-foreground">{counts.all}</span>
              </div>
            </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-sm border border-border/70"
              aria-label="Copy all comments"
              disabled={!annotations.length}
              onClick={handleCopyAll}
            >
              {copiedId === '__all__' ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>

            {onClose ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-sm border border-border/70"
                aria-label="Close comments"
                onClick={onClose}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-4">
        <div className="grid grid-cols-3 gap-2 border-b border-border/65 pb-4">
          {[
            { key: 'all' as const, label: 'All', count: counts.all },
            { key: 'linked' as const, label: 'Inline', count: counts.linked },
            { key: 'global' as const, label: 'Document', count: counts.global },
          ].map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? 'secondary' : 'ghost'}
              className="justify-between rounded-sm px-3"
              onClick={() => setFilter(item.key)}
            >
              <span>{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.count}</span>
            </Button>
          ))}
        </div>

        {counts.all === 0 ? (
          <div className="rounded-sm border border-dashed border-border/70 bg-background/72 p-5 text-sm">
            <p className="font-semibold tracking-tight text-foreground">No comments yet</p>
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border/70 bg-background/72 p-5 text-sm">
            <p className="font-semibold tracking-tight text-foreground">No comments in this view</p>
          </div>
        ) : (
          <div className="max-h-[min(65vh,42rem)] overflow-y-auto pr-1 scrollbar-hide">
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
                       className={`cursor-pointer rounded-sm border transition-all duration-200 ${
                        isActive
                          ? 'border-foreground/16 bg-surface'
                          : 'border-border/65 bg-background shadow-none hover:border-foreground/16'
                      }`}
                    >
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-sm border text-sm font-semibold ${isActive ? 'border-foreground/16 bg-background text-foreground' : 'border-border/70 bg-surface text-muted-foreground'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold tracking-tight text-foreground">
                                  {annotation.isGlobal ? 'Document note' : 'Inline note'}
                                </p>
                                <span className="text-[0.67rem] tracking-[0.12em] text-muted-foreground uppercase">{annotation.isGlobal ? 'Document' : 'Linked'}</span>
                              </div>
                              <p className="mt-1 text-xs font-medium text-muted-foreground">
                                {formatCreatedAt(annotation.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-sm border border-border/70"
                              aria-label="Edit comment"
                              onClick={() => startEditing(annotation)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-sm border border-border/70"
                              aria-label="Copy comment"
                              onClick={() => handleCopyOne(annotation)}
                            >
                              {copiedId === annotation.id ? (
                                <CheckIcon className="h-4 w-4 text-success" />
                              ) : (
                                <ClipboardIcon className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-sm border border-border/70"
                              aria-label="Remove comment"
                              onClick={() => onRemove(annotation.id)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {annotation.isGlobal ? (
                          <div className="rounded-sm border border-border/65 bg-surface px-3 py-2.5 text-sm text-muted-foreground">
                            Document note
                          </div>
                        ) : (
                          <div className="rounded-sm border border-border/65 bg-surface px-3 py-3">
                            <p className="text-[0.67rem] tracking-[0.12em] text-muted-foreground uppercase">
                              Selected text
                            </p>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground/90">
                              "{annotation.anchor?.exact}"
                            </p>
                          </div>
                        )}

                        {editingId === annotation.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="min-h-[7rem] w-full rounded-sm border border-border/70 bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus:border-foreground/20 focus:ring-2 focus:ring-foreground/8"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="rounded-sm border border-border/70 px-3" onClick={cancelEditing}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="rounded-sm px-3" disabled={!editingText.trim()} onClick={saveEditing}>
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-7 text-foreground">{annotation.text}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
