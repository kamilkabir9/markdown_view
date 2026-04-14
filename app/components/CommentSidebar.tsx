import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { CreateCommentDialog } from '~/components/CreateCommentDialog';
import { CommentsList } from '~/components/CommentsList';
import { Dialog } from '~/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { CheckIcon, CopyIcon, XIcon } from 'lucide-react';
import type { Annotation } from '~/contexts/AnnotationStore';
import { getCopyFormatFallbacks, useCopySettings } from '~/contexts/CopySettingsContext';
import { buildAllCommentsCopyText, buildCommentCopyText } from '~/lib/comment-copy';

interface CommentSidebarProps {
  annotations: Annotation[];
  rawContent: string;
  relativeFilePath: string;
  fullFilePath: string;
  draftText: string;
  onDraftTextChange: (value: string) => void;
  onCreate: () => Promise<void> | void;
  onCreateDocumentComment: () => Promise<void> | void;
  isCreateDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
  isCreatingDocumentComment?: boolean;
  onOpenDocumentCommentDialog?: () => void;
  pendingAnchorText?: string | null;
  createDisabledReason?: string | null;
  onUpdate: (id: string, text: string) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  onClose?: () => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  activeAnnotationId?: string | null;
  className?: string;
}

type FilterKey = 'all' | 'linked' | 'global';

function ButtonTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function CommentSidebar({
  annotations,
  rawContent,
  relativeFilePath,
  fullFilePath,
  draftText,
  onDraftTextChange,
  onCreate,
  onCreateDocumentComment,
  isCreateDialogOpen,
  onCreateDialogOpenChange,
  isCreatingDocumentComment = false,
  onOpenDocumentCommentDialog,
  pendingAnchorText,
  createDisabledReason,
  onUpdate,
  onRemove,
  onClose,
  onAnnotationClick,
  activeAnnotationId,
  className = '',
}: CommentSidebarProps) {
  const { contextPrefix, commentPrefix, commentsDelimiter, pathMode } = useCopySettings();
  const activeRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [annotations],
  );

  const inlineNumberById = useMemo(() => {
    const mapping = new Map<string, number>();
    let inlineNumber = 1;

    annotations.forEach((annotation) => {
      if (annotation.isGlobal) return;
      mapping.set(annotation.id, inlineNumber);
      inlineNumber += 1;
    });

    return mapping;
  }, [annotations]);

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
    if (counts.all === 0 && filter !== 'all') {
      setFilter('all');
    }
  }, [counts, filter]);

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
      const fallbackValues = getCopyFormatFallbacks();
      copyToClipboard(
        buildCommentCopyText(annotation, rawContent, {
          contextPrefix: contextPrefix.trim() || fallbackValues.context,
          commentPrefix: commentPrefix.trim() || fallbackValues.comment,
          commentsDelimiter: commentsDelimiter.trim() || fallbackValues.delimiter,
          selectedPath: pathMode === 'full' ? fullFilePath : relativeFilePath,
        }),
        annotation.id,
      );
    },
    [commentPrefix, commentsDelimiter, contextPrefix, copyToClipboard, fullFilePath, pathMode, rawContent, relativeFilePath],
  );

  const handleCopyAll = useCallback(() => {
    const fallbackValues = getCopyFormatFallbacks();
    copyToClipboard(
      buildAllCommentsCopyText(annotations, rawContent, {
        contextPrefix: contextPrefix.trim() || fallbackValues.context,
        commentPrefix: commentPrefix.trim() || fallbackValues.comment,
        commentsDelimiter: commentsDelimiter.trim() || fallbackValues.delimiter,
        selectedPath: pathMode === 'full' ? fullFilePath : relativeFilePath,
      }),
      '__all__',
    );
  }, [annotations, commentPrefix, commentsDelimiter, contextPrefix, copyToClipboard, fullFilePath, pathMode, rawContent, relativeFilePath]);

  const handleCreate = useCallback(async () => {
    if (!draftText.trim()) {
      return;
    }

    if (isCreatingDocumentComment) {
      await onCreateDocumentComment();
    } else {
      if (!pendingAnchorText || createDisabledReason) {
        return;
      }
      await onCreate();
    }

    onCreateDialogOpenChange(false);
  }, [createDisabledReason, draftText, isCreatingDocumentComment, onCreate, onCreateDialogOpenChange, onCreateDocumentComment, pendingAnchorText]);

  return (
    <TooltipProvider delay={180}>
      <Dialog open={isCreateDialogOpen} onOpenChange={onCreateDialogOpenChange}>
        <Card className={`h-full min-h-0 overflow-hidden rounded-md border border-border/65 bg-surface shadow-none ${className}`.trim()}>
          <CardHeader className="gap-3 border-b border-border/65 px-4 py-4">
            <div className="flex w-full items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-[var(--font-display)] text-2xl leading-none tracking-tight">Comments</CardTitle>
                  <span className="text-sm text-muted-foreground">{counts.all}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <ButtonTooltip label="Copy all comments">
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
                </ButtonTooltip>

                {onClose ? (
                  <ButtonTooltip label="Close comments">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-sm border border-border/70"
                      aria-label="Close comments"
                      onClick={onClose}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </ButtonTooltip>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-4">
            <div className="grid grid-cols-3 gap-2 border-b border-border/65 pb-4">
              {[
                { key: 'all' as const, label: 'All', count: counts.all },
                { key: 'linked' as const, label: 'Inline', count: counts.linked },
                { key: 'global' as const, label: 'Document', count: counts.global },
              ].map((item) => (
                <ButtonTooltip key={item.key} label={`Show ${item.label.toLowerCase()} comments`}>
                  <Button
                    size="sm"
                    variant={filter === item.key ? 'secondary' : 'ghost'}
                    className="justify-between rounded-sm px-3"
                    onClick={() => setFilter(item.key)}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.count}</span>
                  </Button>
                </ButtonTooltip>
              ))}
            </div>

            {filter === 'global' ? (
              <Button className="w-full rounded-sm" onClick={onOpenDocumentCommentDialog}>
                Add comment
              </Button>
            ) : null}

            {counts.all === 0 ? (
              <div className="rounded-sm border border-dashed border-border/70 bg-background/72 p-5 text-sm">
                <p className="font-semibold tracking-tight text-foreground">No comments yet</p>
              </div>
            ) : filteredAnnotations.length === 0 ? (
              <div className="rounded-sm border border-dashed border-border/70 bg-background/72 p-5 text-sm">
                <p className="font-semibold tracking-tight text-foreground">No comments in this view</p>
              </div>
            ) : (
              <CommentsList
                annotations={filteredAnnotations}
                activeAnnotationId={activeAnnotationId}
                copiedId={copiedId}
                inlineNumberById={inlineNumberById}
                activeRef={activeRef}
                onAnnotationClick={onAnnotationClick}
                onCopy={handleCopyOne}
                onRemove={onRemove}
                onUpdate={onUpdate}
              />
            )}
          </CardContent>
        </Card>
        <CreateCommentDialog
          draftText={draftText}
          isCreatingDocumentComment={isCreatingDocumentComment}
          pendingAnchorText={pendingAnchorText}
          createDisabledReason={createDisabledReason}
          onDraftTextChange={onDraftTextChange}
          onCancel={() => onCreateDialogOpenChange(false)}
          onSave={handleCreate}
        />
      </Dialog>
    </TooltipProvider>
  );
}
