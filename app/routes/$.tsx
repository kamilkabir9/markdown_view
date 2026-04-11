import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '~/components/ui/breadcrumb';
import { Button } from '~/components/ui/button';
import { Toggle } from '~/components/ui/toggle';
import { CommentHighlighter } from '~/components/CommentHighlighter';
import { CommentSidebar } from '~/components/CommentSidebar';
import { MarkdownOutline } from '~/components/MarkdownOutline';
import { MarkdownPreview } from '~/components/MarkdownPreview';
import { MarkdownSourceEditor } from '~/components/MarkdownSourceEditor';
import { useAppChrome } from '~/contexts/AppChromeContext';
import { useCopySettings } from '~/contexts/CopySettingsContext';
import { AnnotationStoreProvider, useAnnotationStore, type Anchor, type Annotation } from '~/contexts/AnnotationStore';
import { fetchFile, getErrorMessage, saveFile, type MarkdownFile } from '~/lib/api';
import { enrichAnchorFromMarkdown } from '~/lib/comment-anchors';
import { extractMarkdownSections } from '~/lib/markdown-sections';
import { cn } from '~/lib/utils';

interface PendingAnchor {
  anchor: Anchor;
  quote: string;
}

interface SelectionActionPosition {
  top: number;
  left: number;
}

function buildBreadcrumbs(sourcePath: string | null) {
  const parts = sourcePath?.split('/').filter(Boolean) ?? [];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/" />}>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/" />}>Markdown Files</BreadcrumbLink>
        </BreadcrumbItem>
        {parts.map((part, index) => {
          const isLast = index === parts.length - 1;

          return (
            <span key={`${part}:${index}`} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? <BreadcrumbPage>{part}</BreadcrumbPage> : <BreadcrumbPage>{part}</BreadcrumbPage>}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {buildBreadcrumbs(null)}

      <div className="app-shell-panel rounded-md p-8 sm:p-10">
        <div className="max-w-xl space-y-5 text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-destructive/30 bg-surface text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>

          <div>
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
          </div>

          <Alert variant="destructive" className="rounded-sm text-left shadow-none">
            <AlertTitle>Reader unavailable</AlertTitle>
            <AlertDescription>
              Head back to the file list and choose another document, or verify the markdown file still exists.
            </AlertDescription>
          </Alert>

          <div className="flex">
            <Button className="rounded-sm px-5" onClick={() => navigate('/')}>
              Back to file list
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownPageContent() {
  const params = useParams();
  const routePath = params['*'] || '';
  const { setActions, setBreadcrumbs } = useAppChrome();
  const { returnToPreviewAfterSave } = useCopySettings();
  const previewRef = useRef<HTMLElement | null>(null);
  const [file, setFile] = useState<MarkdownFile | null>(null);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOutlineVisible, setIsOutlineVisible] = useState(true);
  const [isCommentsVisible, setIsCommentsVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnchor | null>(null);
  const [selectionActionPosition, setSelectionActionPosition] = useState<SelectionActionPosition | null>(null);
  const [isCreateCommentDialogOpen, setIsCreateCommentDialogOpen] = useState(false);
  const [isCreatingDocumentComment, setIsCreatingDocumentComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const { annotations, isLoading: areCommentsLoading, error: commentsError, addAnnotation, updateAnnotationText, removeAnnotation } = useAnnotationStore();

  useEffect(() => {
    const controller = new AbortController();

    async function loadMarkdownFile() {
      try {
        setIsLoading(true);
        setError(null);
        setSaveError(null);
        setSaveStatus('idle');

        const response = await fetchFile(routePath, controller.signal);
        if (controller.signal.aborted) return;

        setFile(response);
        setDraft(response.content);
        setIsEditing(false);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setFile(null);
        setError(getErrorMessage(requestError, 'The markdown file could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadMarkdownFile();

    return () => controller.abort();
  }, [routePath]);

  const isDirty = file ? draft !== file.content : false;
  const outlineSections = useMemo(() => extractMarkdownSections(isEditing ? draft : file?.content ?? ''), [draft, file?.content, isEditing]);
  const shouldBlockNavigation = isEditing && isDirty && !isSaving;
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!shouldBlockNavigation) return false;

    return currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search;
  });

  const handleStartEditing = useCallback(() => {
    if (!file) return;
    setDraft(file.content);
    setSaveError(null);
    setSaveStatus('idle');
    setIsEditing(true);
  }, [file]);

  const handleCancelEditing = useCallback(() => {
    if (!file) return;
    setDraft(file.content);
    setSaveError(null);
    setSaveStatus('idle');
    setIsEditing(false);
  }, [file]);

  const handleSave = useCallback(async () => {
    if (!file || !isDirty || isSaving) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      const savedFile = await saveFile(file.path, draft);
      setFile(savedFile);
      setDraft(savedFile.content);
      setSaveStatus('saved');
      setIsEditing(!returnToPreviewAfterSave);
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError, 'The markdown file could not be saved.'));
    } finally {
      setIsSaving(false);
    }
  }, [draft, file, isDirty, isSaving, returnToPreviewAfterSave]);

  const clearPendingSelection = useCallback(() => {
    setPendingAnchor(null);
    setSelectionActionPosition(null);
    setIsCreateCommentDialogOpen(false);
    setIsCreatingDocumentComment(false);
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const capturePreviewSelection = useCallback(async () => {
    if (typeof window === 'undefined' || isEditing) return;

    const container = previewRef.current;
    const selection = window.getSelection();
    if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rangeRect = range.getBoundingClientRect();

    try {
      const textQuote = await import('dom-anchor-text-quote');
      const nextAnchor = textQuote.fromRange(container, range);
      const quote = nextAnchor.exact.trim();
      if (!quote) return;

      setPendingAnchor({
        anchor: {
          exact: quote,
          prefix: nextAnchor.prefix ?? '',
          suffix: nextAnchor.suffix ?? '',
        },
        quote,
      });
      setSelectionActionPosition({
        top: Math.max(rangeRect.top - containerRect.top - 42, 8),
        left: Math.min(Math.max(rangeRect.left - containerRect.left + rangeRect.width / 2, 72), Math.max(containerRect.width - 72, 72)),
      });
      setIsCreatingDocumentComment(false);
    } catch {
      setSaveError('Selected text could not be anchored for commenting.');
    }
  }, [isEditing]);

  const handleCreateComment = useCallback(async () => {
    if (!file || !pendingAnchor || !commentDraft.trim() || isEditing) {
      return;
    }

    await addAnnotation(enrichAnchorFromMarkdown(file.content, pendingAnchor.anchor), commentDraft.trim(), false);
    setCommentDraft('');
    clearPendingSelection();
  }, [addAnnotation, clearPendingSelection, commentDraft, file, isEditing, pendingAnchor]);

  const handleCreateDocumentComment = useCallback(async () => {
    if (!commentDraft.trim()) {
      return;
    }

    await addAnnotation(null, commentDraft.trim(), true);
    setCommentDraft('');
    setIsCreateCommentDialogOpen(false);
    setIsCreatingDocumentComment(false);
  }, [addAnnotation, commentDraft]);

  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    setIsCreateCommentDialogOpen(open);
    if (!open) {
      setCommentDraft('');
      setIsCreatingDocumentComment(false);
    }
  }, []);

  const handleOpenDocumentCommentDialog = useCallback(() => {
    setPendingAnchor(null);
    setSelectionActionPosition(null);
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }
    setIsCreatingDocumentComment(true);
    setCommentDraft('');
    setIsCreateCommentDialogOpen(true);
  }, []);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
  }, []);

  const handleOutlineNavigate = useCallback((slug: string) => {
    const container = previewRef.current;
    if (!container) {
      return;
    }

    const target = container.querySelector<HTMLElement>(`#${CSS.escape(slug)}`);
    if (!target) {
      return;
    }

    const targetTop = target.offsetTop - 16;
    container.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
    window.history.replaceState(null, '', `#${slug}`);
  }, []);

  useEffect(() => {
    if (!isEditing || !isDirty || saveStatus !== 'saved') {
      return;
    }

    setSaveStatus('idle');
  }, [isDirty, isEditing, saveStatus]);

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked') {
      return;
    }

    const shouldLeave = window.confirm('You have unsaved changes. Leave this page and discard them?');

    if (shouldLeave) {
      navigationBlocker.proceed();
      return;
    }

    navigationBlocker.reset();
  }, [navigationBlocker]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!isEditing || !isDirty || isSaving) {
        return;
      }

      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();
      void handleSave();
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [handleSave, isDirty, isEditing, isSaving]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isEditing || !isDirty) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isEditing]);

  useEffect(() => {
    document.title = file?.sourcePath ? `${file.sourcePath} - Markdown Viewer` : 'Markdown Viewer';

    setBreadcrumbs(buildBreadcrumbs(file?.sourcePath ?? null));
    setActions(
      file ? (
        <>
          <Toggle
            variant="outline"
            pressed={isOutlineVisible}
            onClick={() => setIsOutlineVisible((current) => !current)}
          >
            Summary
          </Toggle>
          <Toggle
            variant="outline"
            pressed={isCommentsVisible}
            onClick={() => setIsCommentsVisible((current) => !current)}
          >
            Comments
          </Toggle>
          {isEditing ? (
            <>
              {saveStatus === 'saved' && <span className="text-xs text-muted-foreground">Saved</span>}
              <Button variant="outline" onClick={handleCancelEditing} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={!isDirty || isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              {saveStatus === 'saved' && <span className="text-xs text-muted-foreground">Saved</span>}
              <Button onClick={handleStartEditing}>
                Edit
              </Button>
            </>
          )}
        </>
      ) : null,
    );

    return () => {
      setBreadcrumbs(null);
      setActions(null);
    };
  }, [file, handleCancelEditing, handleSave, handleStartEditing, isCommentsVisible, isDirty, isEditing, isOutlineVisible, isSaving, saveStatus, setActions, setBreadcrumbs]);

  useEffect(() => {
    if (isEditing) {
      clearPendingSelection();
    }
  }, [clearPendingSelection, isEditing]);

  useEffect(() => {
    if (!pendingAnchor) {
      return;
    }

    const container = previewRef.current;
    if (!container) {
      return;
    }

    const updatePosition = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectionActionPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setSelectionActionPosition(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const rangeRect = range.getBoundingClientRect();
      setSelectionActionPosition({
        top: Math.max(rangeRect.top - containerRect.top - 42, 8),
        left: Math.min(Math.max(rangeRect.left - containerRect.left + rangeRect.width / 2, 72), Math.max(containerRect.width - 72, 72)),
      });
    };

    updatePosition();
    container.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      container.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [pendingAnchor]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {buildBreadcrumbs(null)}
        <div className="app-shell-panel rounded-md p-8 text-sm text-muted-foreground">Loading markdown file...</div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <ErrorState
        title="File unavailable"
        description={error || 'The requested markdown file could not be loaded.'}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {saveError && (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {commentsError && (
        <Alert variant="destructive">
          <AlertTitle>Comments unavailable</AlertTitle>
          <AlertDescription>{commentsError}</AlertDescription>
        </Alert>
      )}

      {isEditing && (
        <Alert>
          <AlertTitle>{isDirty ? 'Unsaved changes' : 'Edit mode active'}</AlertTitle>
          <AlertDescription>
            {isDirty
              ? 'This document has unsaved changes. Use Cmd/Ctrl+S or the Save button to write the raw markdown back to disk.'
              : 'Source mode is active. Use Cmd/Ctrl+S after your next edit to save quickly.'}
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          'grid min-h-0 flex-1 gap-5',
          isOutlineVisible && isCommentsVisible && 'xl:grid-cols-[18rem_minmax(0,1fr)_22rem]',
          isOutlineVisible && !isCommentsVisible && 'xl:grid-cols-[18rem_minmax(0,1fr)]',
          !isOutlineVisible && isCommentsVisible && 'xl:grid-cols-[minmax(0,1fr)_22rem]',
          !isOutlineVisible && !isCommentsVisible && 'xl:grid-cols-[minmax(0,1fr)]',
        )}
      >
        {isOutlineVisible ? <MarkdownOutline sections={outlineSections} onNavigate={handleOutlineNavigate} className="min-h-0" /> : null}

        <div className="min-h-0">
          {isEditing ? (
            <MarkdownSourceEditor value={draft} onChange={setDraft} className="min-h-[32rem] xl:min-h-0" />
          ) : (
            <div className="relative h-full min-h-[32rem] xl:min-h-0" onMouseUp={() => void capturePreviewSelection()} onKeyUp={() => void capturePreviewSelection()}>
              <MarkdownPreview
                ref={previewRef}
                content={file.content}
                documentSourcePath={file.sourcePath}
              />
              {pendingAnchor && selectionActionPosition ? (
                <div
                  className="pointer-events-none absolute z-20"
                  style={{
                    top: `${selectionActionPosition.top}px`,
                    left: `${selectionActionPosition.left}px`,
                    transform: 'translate(-50%, 0)',
                  }}
                >
                    <Button
                      className="pointer-events-auto h-8 rounded-sm px-3 shadow-sm"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setIsCreatingDocumentComment(false);
                        setIsCreateCommentDialogOpen(true);
                      }}
                    >
                      Add comment
                    </Button>
                </div>
              ) : null}
              <CommentHighlighter
                containerRef={previewRef}
                annotations={annotations.filter((annotation) => !annotation.isGlobal)}
                activeAnnotationId={activeAnnotationId}
                onAnnotationClick={handleAnnotationClick}
              />
            </div>
          )}
        </div>

        {isCommentsVisible ? (
          <CommentSidebar
            annotations={annotations}
            rawContent={file.content}
            relativeFilePath={file.sourcePath}
            fullFilePath={file.absolutePath}
            draftText={commentDraft}
            onDraftTextChange={setCommentDraft}
            onCreate={handleCreateComment}
            onCreateDocumentComment={handleCreateDocumentComment}
            isCreateDialogOpen={isCreateCommentDialogOpen}
            onCreateDialogOpenChange={handleCreateDialogOpenChange}
            isCreatingDocumentComment={isCreatingDocumentComment}
            onClearSelection={clearPendingSelection}
            pendingAnchorText={pendingAnchor?.quote ?? null}
            createDisabledReason={isEditing ? 'Inline comments can be added from preview mode only.' : null}
            onUpdate={updateAnnotationText}
            onRemove={removeAnnotation}
            onAnnotationClick={handleAnnotationClick}
            activeAnnotationId={activeAnnotationId}
            onOpenDocumentCommentDialog={handleOpenDocumentCommentDialog}
            className={areCommentsLoading ? 'min-h-0 opacity-70' : 'min-h-0'}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function MarkdownPage() {
  const params = useParams();
  const routePath = params['*'] || '';

  return (
    <AnnotationStoreProvider filePath={routePath}>
      <MarkdownPageContent />
    </AnnotationStoreProvider>
  );
}
