import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { ImageUploadDialog } from '~/components/ImageUploadDialog';
import { MarkdownEditorPane } from '~/components/MarkdownEditorPane';
import { MarkdownPageActions } from '~/components/MarkdownPageActions';
import { MarkdownPageAlerts } from '~/components/MarkdownPageAlerts';
import { CommentSidebar } from '~/components/CommentSidebar';
import { MarkdownOutline } from '~/components/MarkdownOutline';
import { MarkdownSourceEditorHandle } from '~/components/MarkdownSourceEditor';
import { MarkdownViewerPane } from '~/components/MarkdownViewerPane';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useAppChrome } from '~/contexts/AppChromeContext';
import { useCopySettings } from '~/contexts/CopySettingsContext';
import { AnnotationStoreProvider, useAnnotationStore, type Annotation } from '~/contexts/AnnotationStore';
import { useDesktopEditSplit } from '~/hooks/useDesktopEditSplit';
import { useImageUpload } from '~/hooks/useImageUpload';
import { useMarkdownDocument } from '~/hooks/useMarkdownDocument';
import { usePreviewCommenting } from '~/hooks/usePreviewCommenting';
import { useUnsavedChangesProtection } from '~/hooks/useUnsavedChangesProtection';
import { buildMarkdownBreadcrumbs } from '~/lib/breadcrumbs';
import { extractMarkdownSections } from '~/lib/markdown-sections';
import { cn } from '~/lib/utils';

function ErrorState({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {buildMarkdownBreadcrumbs(null)}

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
  const [isOutlineVisible, setIsOutlineVisible] = useState(true);
  const [isCommentsVisible, setIsCommentsVisible] = useState(true);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [commentActionError, setCommentActionError] = useState<string | null>(null);
  const isDesktopEditSplit = useDesktopEditSplit();
  const { annotations, isLoading: areCommentsLoading, error: commentsError, addAnnotation, updateAnnotationText, removeAnnotation } = useAnnotationStore();
  const handleEnterEditingLayout = useCallback(() => {
    setIsOutlineVisible(false);
    setIsCommentsVisible(false);
  }, []);
  const {
    file,
    draft,
    setDraft,
    setFile,
    isLoading,
    isEditing,
    isSaving,
    error,
    saveError,
    setSaveError,
    saveStatus,
    isDirty,
    handleStartEditing,
    handleCancelEditing: handleCancelEditingBase,
    handleSave: handleSaveBase,
  } = useMarkdownDocument({
    routePath,
    returnToPreviewAfterSave,
    onEnterEditingLayout: handleEnterEditingLayout,
  });
  const {
    pendingAnchor,
    selectionActionPosition,
    isCreateCommentDialogOpen,
    isCreatingDocumentComment,
    commentDraft,
    setCommentDraft,
    capturePreviewSelection,
    handleCreateComment,
    handleCreateDocumentComment,
    handleCreateDialogOpenChange,
    handleOpenDocumentCommentDialog,
  } = usePreviewCommenting({
    previewRef,
    fileContent: file?.content ?? null,
    isEditing,
    addAnnotation,
    onError: setCommentActionError,
  });
  const {
    imageInputRef,
    isImageDialogOpen,
    isImageUploadDragging,
    isUploadingImage,
    imageUploadError,
    handleImageDialogOpenChange,
    handleImageInputChange,
    handleImageUpload,
    setIsImageUploadDragging,
    cleanupUploadedDraftImages,
    clearUploadedDraftImages,
  } = useImageUpload({
    documentPath: file?.path ?? null,
    isEditing,
    setDraft,
    sourceEditorRef,
    onSaveError: setSaveError,
  });

  useEffect(() => {
    if (isEditing) {
      return;
    }

    previewRef.current?.scrollTo({ top: 0 });
  }, [file?.modified, file?.path, isEditing]);

  const outlineSections = useMemo(() => extractMarkdownSections(isEditing ? draft : file?.content ?? ''), [draft, file?.content, isEditing]);
  const breadcrumbs = useMemo(() => buildMarkdownBreadcrumbs(file?.sourcePath ?? null), [file?.sourcePath]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
  }, []);

  useEffect(() => {
    if (pendingAnchor || isCreateCommentDialogOpen) {
      setCommentActionError(null);
    }
  }, [isCreateCommentDialogOpen, pendingAnchor]);

  const handleCancelEditing = useCallback(async () => {
    if (!file) return;

    const { removedCount, failedCount } = await cleanupUploadedDraftImages();

    const didCancel = handleCancelEditingBase();
    if (!didCancel) return;
    handleImageDialogOpenChange(false);

    if (removedCount > 0) {
      const label = removedCount === 1 ? 'image' : 'images';
      toast.info(`Removed ${removedCount} uploaded ${label} from this draft.`);
    }

    if (failedCount > 0) {
      const label = failedCount === 1 ? 'image file' : 'image files';
      setSaveError(`Some uploaded ${label} could not be cleaned up automatically.`);
      toast.warning('Some uploaded images could not be removed automatically.');
    }
  }, [cleanupUploadedDraftImages, file, handleCancelEditingBase, handleImageDialogOpenChange, setSaveError]);

  const handleSave = useCallback(async () => {
    const didSave = await handleSaveBase();
    if (didSave) {
      clearUploadedDraftImages();
    }
  }, [clearUploadedDraftImages, handleSaveBase]);

  useUnsavedChangesProtection({
    isEditing,
    isDirty,
    isSaving,
    onSave: handleSave,
  });

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

    let target = container.querySelector<HTMLElement>(`#${CSS.escape(slug)}`);
    if (!target) {
      const headings = Array.from(container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
      target = headings.find((h) => h.id === slug) ?? null;
      if (!target) {
        return;
      }
    }

    let node: HTMLElement | null = target;
    let scroller: HTMLElement = container;
    while (node) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
        scroller = node;
        break;
      }
      node = node.parentElement;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = scroller.scrollTop + targetRect.top - scrollerRect.top - 16;
    scroller.scrollTo({ top: Math.max(nextTop, 0), behavior: 'smooth' });
    window.history.replaceState(null, '', `#${slug}`);
  }, [isEditing, outlineSections]);

  const actions = useMemo(
    () =>
      file ? (
        <MarkdownPageActions
          isEditing={isEditing}
          isOutlineVisible={isOutlineVisible}
          isCommentsVisible={isCommentsVisible}
          isDirty={isDirty}
          isSaving={isSaving}
          isUploadingImage={isUploadingImage}
          saveStatus={saveStatus}
          onToggleOutline={() => setIsOutlineVisible((current) => !current)}
          onToggleComments={() => setIsCommentsVisible((current) => !current)}
          onStartEditing={handleStartEditing}
          onOpenImageDialog={() => handleImageDialogOpenChange(true)}
          onCancelEditing={() => void handleCancelEditing()}
          onSave={() => void handleSave()}
        />
      ) : null,
    [
      file,
      handleCancelEditing,
      handleImageDialogOpenChange,
      handleSave,
      handleStartEditing,
      isCommentsVisible,
      isDirty,
      isEditing,
      isOutlineVisible,
      isSaving,
      isUploadingImage,
      saveStatus,
    ],
  );

  useEffect(() => {
    document.title = file?.sourcePath ? `${file.sourcePath} - Markdown Viewer` : 'Markdown Viewer';
  }, [file?.sourcePath]);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    setActions(actions);
  }, [actions, breadcrumbs, setActions, setBreadcrumbs]);

  useEffect(() => {
    return () => {
      setBreadcrumbs(null);
      setActions(null);
    };
  }, [setActions, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {buildMarkdownBreadcrumbs(null)}
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
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <MarkdownPageAlerts
        saveError={saveError}
        commentActionError={commentActionError}
        commentsError={commentsError}
        isEditing={isEditing}
        isDirty={isDirty}
      />

      {isEditing || !isDesktopEditSplit ? (
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

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {isEditing ? (
              <MarkdownEditorPane
                draft={draft}
                documentSourcePath={file.sourcePath}
                isDesktopSplit={isDesktopEditSplit}
                sourceEditorRef={sourceEditorRef}
                onDraftChange={setDraft}
              />
            ) : (
              <MarkdownViewerPane
                previewKey={`view:${file.path}:${file.modified}`}
                content={file.content}
                documentSourcePath={file.sourcePath}
                previewRef={previewRef}
                pendingAnchorQuote={pendingAnchor?.quote ?? null}
                selectionActionPosition={selectionActionPosition}
                annotations={annotations}
                activeAnnotationId={activeAnnotationId}
                onCaptureSelection={capturePreviewSelection}
                onOpenCreateComment={() => handleCreateDialogOpenChange(true)}
                onAnnotationClick={handleAnnotationClick}
              />
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
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1" id="markdown-view-panels">
          {isOutlineVisible ? (
            <>
              <ResizablePanel defaultSize={20} minSize={15} className="min-w-0 pr-2.5">
                <MarkdownOutline sections={outlineSections} onNavigate={handleOutlineNavigate} className="min-h-0" />
              </ResizablePanel>
              <ResizableHandle className="w-3 cursor-col-resize bg-transparent" withHandle aria-label="Resize outline and preview panels" />
            </>
          ) : null}

          <ResizablePanel defaultSize={isOutlineVisible && isCommentsVisible ? 55 : isCommentsVisible || isOutlineVisible ? 75 : 100} minSize={30} className="min-w-0 px-0">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <MarkdownViewerPane
                previewKey={`view:${file.path}:${file.modified}`}
                content={file.content}
                documentSourcePath={file.sourcePath}
                previewRef={previewRef}
                pendingAnchorQuote={pendingAnchor?.quote ?? null}
                selectionActionPosition={selectionActionPosition}
                annotations={annotations}
                activeAnnotationId={activeAnnotationId}
                onCaptureSelection={capturePreviewSelection}
                onOpenCreateComment={() => handleCreateDialogOpenChange(true)}
                onAnnotationClick={handleAnnotationClick}
              />
            </div>
          </ResizablePanel>

          {isCommentsVisible ? (
            <>
              <ResizableHandle className="w-3 cursor-col-resize bg-transparent" withHandle aria-label="Resize preview and comments panels" />
              <ResizablePanel defaultSize={isOutlineVisible ? 25 : 30} minSize={20} className="min-w-0 pl-2.5">
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
                  pendingAnchorText={pendingAnchor?.quote ?? null}
                  createDisabledReason={null}
                  onUpdate={updateAnnotationText}
                  onRemove={removeAnnotation}
                  onAnnotationClick={handleAnnotationClick}
                  activeAnnotationId={activeAnnotationId}
                  onOpenDocumentCommentDialog={handleOpenDocumentCommentDialog}
                  className={areCommentsLoading ? 'min-h-0 opacity-70' : 'min-h-0'}
                />
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      )}

      <ImageUploadDialog
        open={isImageDialogOpen}
        onOpenChange={handleImageDialogOpenChange}
        inputRef={imageInputRef}
        isDragging={isImageUploadDragging}
        isUploading={isUploadingImage}
        error={imageUploadError}
        onInputChange={handleImageInputChange}
        onDraggingChange={setIsImageUploadDragging}
        onUpload={handleImageUpload}
      />
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
