import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '~/components/ui/breadcrumb';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Toggle } from '~/components/ui/toggle';
import { CommentHighlighter } from '~/components/CommentHighlighter';
import { CommentSidebar } from '~/components/CommentSidebar';
import { MarkdownOutline } from '~/components/MarkdownOutline';
import { MarkdownPreview } from '~/components/MarkdownPreview';
import { MarkdownSourceEditor, type MarkdownSourceEditorHandle } from '~/components/MarkdownSourceEditor';
import { useAppChrome } from '~/contexts/AppChromeContext';
import { useCopySettings } from '~/contexts/CopySettingsContext';
import { AnnotationStoreProvider, useAnnotationStore, type Anchor, type Annotation } from '~/contexts/AnnotationStore';
import { deleteImageAsset, fetchFile, getErrorMessage, saveFile, uploadImageAsset, type MarkdownFile } from '~/lib/api';
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

const RESUME_EDIT_AFTER_SAVE_PATH_KEY = 'resume-edit-after-save-path';

function markResumeEditAfterSave(routePath: string): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY, routePath);
  } catch {}
}

function clearResumeEditAfterSave(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY);
  } catch {}
}

function consumeResumeEditAfterSave(routePath: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const savedRoutePath = sessionStorage.getItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY);
    sessionStorage.removeItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY);
    return savedRoutePath === routePath;
  } catch {
    return false;
  }
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
  const sourceEditorRef = useRef<MarkdownSourceEditorHandle | null>(null);
  const wasEditingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedImageMarkdownPathsRef = useRef<string[]>([]);
  const returnToPreviewAfterSaveRef = useRef(returnToPreviewAfterSave);
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
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isImageUploadDragging, setIsImageUploadDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnchor | null>(null);
  const [selectionActionPosition, setSelectionActionPosition] = useState<SelectionActionPosition | null>(null);
  const [isCreateCommentDialogOpen, setIsCreateCommentDialogOpen] = useState(false);
  const [isCreatingDocumentComment, setIsCreatingDocumentComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isDesktopEditSplit, setIsDesktopEditSplit] = useState(false);
  const { annotations, isLoading: areCommentsLoading, error: commentsError, addAnnotation, updateAnnotationText, removeAnnotation } = useAnnotationStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const sync = () => setIsDesktopEditSplit(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);

    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    returnToPreviewAfterSaveRef.current = returnToPreviewAfterSave;
  }, [returnToPreviewAfterSave]);

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

        const shouldResumeEditAfterSave = consumeResumeEditAfterSave(routePath);
        setFile(response);
        setDraft(response.content);
        if (shouldResumeEditAfterSave && !returnToPreviewAfterSaveRef.current) {
          setIsOutlineVisible(false);
          setIsCommentsVisible(false);
        }
        setIsEditing(shouldResumeEditAfterSave && !returnToPreviewAfterSaveRef.current);
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

  const refreshPreviewFile = useCallback(async () => {
    try {
      const response = await fetchFile(routePath);
      setFile(response);
      setDraft(response.content);
      setError(null);
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError, 'The markdown preview could not be refreshed.'));
    }
  }, [routePath]);

  useEffect(() => {
    if (isLoading) {
      wasEditingRef.current = isEditing;
      return;
    }

    if (wasEditingRef.current && !isEditing) {
      void refreshPreviewFile();
    }

    wasEditingRef.current = isEditing;
  }, [isEditing, isLoading, refreshPreviewFile]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    previewRef.current?.scrollTo({ top: 0 });
  }, [file?.modified, file?.path, isEditing]);

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
    setIsOutlineVisible(false);
    setIsCommentsVisible(false);
    setIsEditing(true);
  }, [file]);

  const cleanupUploadedDraftImages = useCallback(async () => {
    if (!file) {
      return { removedCount: 0, failedCount: 0 };
    }

    const uploadedPaths = [...new Set(uploadedImageMarkdownPathsRef.current)];
    if (uploadedPaths.length === 0) {
      return { removedCount: 0, failedCount: 0 };
    }

    const failedPaths: string[] = [];

    for (const markdownPath of uploadedPaths) {
      try {
        await deleteImageAsset(file.path, markdownPath);
      } catch {
        failedPaths.push(markdownPath);
      }
    }

    uploadedImageMarkdownPathsRef.current = failedPaths;

    return {
      removedCount: uploadedPaths.length - failedPaths.length,
      failedCount: failedPaths.length,
    };
  }, [file]);

  const handleCancelEditing = useCallback(async () => {
    if (!file) return;

    const { removedCount, failedCount } = await cleanupUploadedDraftImages();

    setDraft(file.content);
    setSaveError(null);
    setSaveStatus('idle');
    setIsEditing(false);
    setIsImageDialogOpen(false);

    if (removedCount > 0) {
      const label = removedCount === 1 ? 'image' : 'images';
      toast.info(`Removed ${removedCount} uploaded ${label} from this draft.`);
    }

    if (failedCount > 0) {
      const label = failedCount === 1 ? 'image file' : 'image files';
      setSaveError(`Some uploaded ${label} could not be cleaned up automatically.`);
      toast.warning('Some uploaded images could not be removed automatically.');
    }
  }, [cleanupUploadedDraftImages, file]);

  const handleSave = useCallback(async () => {
    if (!file || !isDirty || isSaving) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      const savedFile = await saveFile(file.path, draft);
      setFile(savedFile);
      setDraft(savedFile.content);
      setSaveStatus('saved');
      uploadedImageMarkdownPathsRef.current = [];

      const shouldReturnToPreview = returnToPreviewAfterSaveRef.current;
      if (shouldReturnToPreview) {
        clearResumeEditAfterSave();
        setIsEditing(false);
      } else {
        markResumeEditAfterSave(routePath);
        setIsEditing(true);
      }
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError, 'The markdown file could not be saved.'));
    } finally {
      setIsSaving(false);
    }
  }, [draft, file, isDirty, isSaving, routePath]);

  const handleImageDialogOpenChange = useCallback((open: boolean) => {
    setIsImageDialogOpen(open);
    if (!open) {
      setImageUploadError(null);
      setIsImageUploadDragging(false);
    }
  }, []);

  const handleUndoInsertedImage = useCallback(async ({ markdownPath, insertion }: { markdownPath: string; insertion: string }) => {
    if (!file) return;

    setDraft((current) => {
      const insertionIndex = current.indexOf(insertion);
      if (insertionIndex < 0) {
        return current;
      }

      return `${current.slice(0, insertionIndex)}${current.slice(insertionIndex + insertion.length)}`;
    });

    try {
      await deleteImageAsset(file.path, markdownPath);
      uploadedImageMarkdownPathsRef.current = uploadedImageMarkdownPathsRef.current.filter((path) => path !== markdownPath);
      toast.info('Image insertion was undone.');
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'The uploaded image file could not be deleted.');
      toast.warning(`Image text was removed, but file cleanup failed: ${message}`);
    }
  }, [file]);

  const handleImageUpload = useCallback(async (imageFile: File) => {
    if (!file || !isEditing) {
      return;
    }

    if (!imageFile.type.startsWith('image/')) {
      const message = 'Select a valid image file (GIF, JPEG, PNG, SVG, or WebP).';
      setImageUploadError(message);
      toast.error(message);
      return;
    }

    try {
      setImageUploadError(null);
      setIsUploadingImage(true);

      const uploadedAsset = await uploadImageAsset(file.path, imageFile);
      uploadedImageMarkdownPathsRef.current.push(uploadedAsset.markdownPath);
      const baseAltText = imageFile.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      const markdown = `![${baseAltText || 'image'}](${uploadedAsset.markdownPath})`;
      const insertion = `\n${markdown}\n`;
      const inserted = sourceEditorRef.current?.insertText(insertion) ?? false;

      if (!inserted) {
        setDraft((current) => `${current}${current.endsWith('\n') ? '' : '\n'}${markdown}\n`);
      }

      toast.success('Image added to the markdown draft. Click Save to persist changes.', {
        action: {
          label: 'Undo insert',
          onClick: () => {
            void handleUndoInsertedImage({
              markdownPath: uploadedAsset.markdownPath,
              insertion,
            });
          },
        },
      });
      setIsImageDialogOpen(false);
      setIsImageUploadDragging(false);
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'The image could not be uploaded.');
      setImageUploadError(message);
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }, [file, handleUndoInsertedImage, isEditing]);

  const handleImageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    void handleImageUpload(selectedFile);
  }, [handleImageUpload]);

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
    if (isEditing) {
      const flatSections = [...outlineSections];
      for (let index = 0; index < flatSections.length; index += 1) {
        flatSections.splice(index + 1, 0, ...flatSections[index].children);
      }
      const targetSection = flatSections.find((section) => section.slug === slug);
      if (!targetSection) {
        return;
      }

      sourceEditorRef.current?.scrollToOffset(targetSection.startOffset);
      return;
    }

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
  }, [isEditing, outlineSections]);

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
              <Button variant="outline" onClick={() => handleImageDialogOpenChange(true)} disabled={isSaving || isUploadingImage}>
                {isUploadingImage ? 'Uploading image...' : 'Add image'}
              </Button>
              <Button variant="outline" onClick={() => void handleCancelEditing()} disabled={isSaving || isUploadingImage}>
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
  }, [file, handleCancelEditing, handleImageDialogOpenChange, handleSave, handleStartEditing, isCommentsVisible, isDirty, isEditing, isOutlineVisible, isSaving, isUploadingImage, saveStatus, setActions, setBreadcrumbs]);

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

      {isEditing && isDirty && (
        <Alert>
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>
            This document has unsaved changes. Use Cmd/Ctrl+S or the Save button to write the raw markdown back to disk.
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          'grid h-full min-h-0 flex-1 gap-5',
          isOutlineVisible && isCommentsVisible && 'xl:grid-cols-[18rem_minmax(0,1fr)_22rem]',
          isOutlineVisible && !isCommentsVisible && 'xl:grid-cols-[18rem_minmax(0,1fr)]',
          !isOutlineVisible && isCommentsVisible && 'xl:grid-cols-[minmax(0,1fr)_22rem]',
          !isOutlineVisible && !isCommentsVisible && 'xl:grid-cols-[minmax(0,1fr)]',
        )}
      >
        {isOutlineVisible ? <MarkdownOutline sections={outlineSections} onNavigate={handleOutlineNavigate} className="min-h-0" /> : null}

        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          {isEditing ? (
            <div className="flex-1 min-h-[32rem] min-w-0 xl:min-h-0">
              {isDesktopEditSplit ? (
                <Group orientation="horizontal" className="h-full min-h-0 min-w-0" id="markdown-edit-split-panels">
                  <Panel defaultSize={55} minSize={25} className="min-w-0">
                    <div className="h-full min-h-0 min-w-0 pr-2">
                      <MarkdownSourceEditor ref={sourceEditorRef} value={draft} onChange={setDraft} className="h-full min-h-0" />
                    </div>
                  </Panel>
                  <Separator
                    className="group flex w-3 shrink-0 cursor-col-resize items-stretch justify-center"
                    aria-label="Resize editor and preview panels"
                  >
                    <span className="w-full rounded-sm border border-border/60 bg-surface transition-colors group-hover:border-primary/40 group-hover:bg-accent/50" />
                  </Separator>
                  <Panel defaultSize={45} minSize={25} className="min-w-0">
                    <div className="h-full min-h-0 min-w-0 pl-2">
                      <MarkdownPreview content={draft} documentSourcePath={file.sourcePath} className="h-full min-h-0 min-w-0" />
                    </div>
                  </Panel>
                </Group>
              ) : (
                <div className="grid min-h-[32rem] min-w-0 gap-5">
                  <MarkdownSourceEditor ref={sourceEditorRef} value={draft} onChange={setDraft} className="min-h-[32rem]" />
                  <MarkdownPreview content={draft} documentSourcePath={file.sourcePath} className="min-h-[32rem]" />
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex h-full flex-1 min-h-[32rem] min-w-0 overflow-hidden xl:min-h-0" onMouseUp={() => void capturePreviewSelection()} onKeyUp={() => void capturePreviewSelection()}>
              <MarkdownPreview
                key={`view:${file.path}:${file.modified}`}
                ref={previewRef}
                content={file.content}
                documentSourcePath={file.sourcePath}
                className="h-full min-h-0 min-w-0 flex-1"
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

      <Dialog open={isImageDialogOpen} onOpenChange={handleImageDialogOpenChange}>
        <DialogContent className="sm:max-w-[32rem]">
          <DialogHeader>
            <DialogTitle>Upload image</DialogTitle>
            <DialogDescription>
              Upload an image and insert a markdown link at the current cursor position.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleImageInputChange}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsImageUploadDragging(true);
              }}
              onDragLeave={() => setIsImageUploadDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsImageUploadDragging(false);
                const droppedFile = event.dataTransfer.files?.[0];
                if (!droppedFile) return;
                void handleImageUpload(droppedFile);
              }}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-9 text-center text-sm transition-colors',
                isImageUploadDragging
                  ? 'border-primary/60 bg-primary/5 text-foreground'
                  : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
              disabled={isUploadingImage}
            >
              <span className="font-medium text-foreground">Drop image here</span>
              <span>or click to choose a file</span>
              <span className="text-xs">GIF, JPEG, PNG, SVG, WebP</span>
            </button>

            {imageUploadError ? <p className="text-sm text-destructive">{imageUploadError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleImageDialogOpenChange(false)} disabled={isUploadingImage}>
              Cancel
            </Button>
            <Button onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>
              {isUploadingImage ? 'Uploading...' : 'Choose image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
