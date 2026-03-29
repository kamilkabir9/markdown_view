import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { Loader2Icon, ChevronLeftIcon, PlusIcon, MessageSquareIcon, XIcon, PanelRightIcon } from 'lucide-react';
import { useAnnotationStore, type Annotation } from '~/contexts/AnnotationStore';
import { CommentHighlighter } from './CommentHighlighter';
import { CommentSidebar } from './CommentSidebar';
import { ImageWithFallback } from './ImageWithFallback';
import { ThemeSwitcher } from './ThemeSwitcher';

interface LineAnnotatedMarkdownProps {
  content: string;
  proseClass: string;
  themeClass: string;
  filePath: string;
}

function getTextQuote() {
  return import('dom-anchor-text-quote');
}

export function LineAnnotatedMarkdown({
  content,
  proseClass,
  themeClass,
  filePath,
}: LineAnnotatedMarkdownProps) {
  const navigate = useNavigate();
  const { annotations, addAnnotation, updateAnnotationText, removeAnnotation } = useAnnotationStore();
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<{
    exact: string;
    prefix: string;
    suffix: string;
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isGlobalComment, setIsGlobalComment] = useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const lineCount = useMemo(() => content.split(/\r?\n/).length, [content]);
  const annotationLabel = annotations.length === 1 ? '1 saved comment' : `${annotations.length} saved comments`;
  const readTime = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 220))} min read`;
  }, [content]);
  const documentMeta = useMemo(() => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    const filename = parts[parts.length - 1] || filePath;

    return {
      title: filename.replace(/\.md$/i, ''),
      directory: parts.length > 1 ? parts.slice(0, -1).join(' / ') : 'Workspace root',
    };
  }, [filePath]);
  const commentsVisible = isDesktopViewport ? sidebarOpen : isCommentsDrawerOpen;

  const handleMouseUp = useCallback(async (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if (typeof window === 'undefined') return;
    if (popoverRef.current?.contains(event.target as Node)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPopoverPos(null);
      return;
    }

    const selectedText = selection.toString();
    const container = containerRef.current;
    if (!selectedText.trim() || !container) return;

    const range = selection.getRangeAt(0);
    if (!range || !container.contains(range.commonAncestorContainer)) {
      setPopoverPos(null);
      return;
    }

    try {
      setIsAnchoring(true);
      const textQuote = await getTextQuote();
      const anchor = textQuote.fromRange(container, range);

      if (!anchor?.exact?.trim()) {
        setIsAnchoring(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        setIsAnchoring(false);
        return;
      }

      setPopoverPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      setPendingAnchor({
        exact: anchor.exact,
        prefix: anchor.prefix || '',
        suffix: anchor.suffix || '',
      });
      setIsAnchoring(false);
    } catch (error) {
      console.warn('anchor error:', error);
      setIsAnchoring(false);
    }
  }, []);

  const openDialog = useCallback((global = false) => {
    setPopoverPos(null);
    setCommentText('');
    setIsGlobalComment(global);

    if (global) {
      setPendingAnchor(null);
    }

    setIsModalOpen(true);
  }, []);

  const toggleComments = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsCommentsDrawerOpen((open) => !open);
      return;
    }

    setSidebarOpen((open) => !open);
  }, []);

  const closeDialog = useCallback(() => {
    setIsModalOpen(false);
    setPendingAnchor(null);
    setCommentText('');
    setIsGlobalComment(false);

    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!commentText.trim()) return;

    if (isGlobalComment) {
      addAnnotation(null, commentText.trim(), true);
    } else if (pendingAnchor) {
      addAnnotation(pendingAnchor, commentText.trim());
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsCommentsDrawerOpen(true);
    }

    closeDialog();
  }, [addAnnotation, closeDialog, commentText, isGlobalComment, pendingAnchor]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
    setTimeout(() => setActiveAnnotationId(null), 2000);

    if (!containerRef.current) return;

    const mark = containerRef.current.querySelector(`mark[data-annotation-id="${annotation.id}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsCommentsDrawerOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncViewport = () => setIsDesktopViewport(window.innerWidth >= 1280);
    syncViewport();

    window.addEventListener('resize', syncViewport, { passive: true });
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (popoverPos && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverPos(null);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [popoverPos]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const sidebar = (
    <CommentSidebar
      annotations={annotations}
      rawContent={content}
      onUpdate={updateAnnotationText}
      onRemove={removeAnnotation}
      onClose={toggleComments}
      onAnnotationClick={handleAnnotationClick}
      activeAnnotationId={activeAnnotationId}
      className="h-full"
    />
  );

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 px-4">
      <div className="mx-auto max-w-[1420px] space-y-5">
        <div className="rounded-md border border-border/65 bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="space-y-1.5">
                <p className="truncate text-xs tracking-[0.12em] text-muted-foreground uppercase">{documentMeta.directory}</p>
                <h1 className="break-words font-[var(--font-display)] text-[clamp(1.95rem,4vw,2.9rem)] leading-[0.94] tracking-tight text-foreground">
                  {documentMeta.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                <span>{annotationLabel}</span>
                <span aria-hidden="true">/</span>
                <span>{lineCount} lines rendered</span>
                <span aria-hidden="true">/</span>
                <span>{readTime}</span>
                <span aria-hidden="true">/</span>
                <span className="truncate">{filePath}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:min-w-[18rem] lg:items-end">
              <div className="w-full lg:w-auto">
                <ThemeSwitcher />
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-sm border border-border/70 px-3.5"
                  onClick={() => navigate('/')}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to files</span>
                  <span className="sm:hidden">Back</span>
                </Button>

                <Button variant="secondary" size="sm" className="rounded-sm px-3.5" onClick={() => openDialog(true)}>
                  <PlusIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Add note</span>
                  <span className="sm:hidden">Note</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-sm border border-border/70 px-3.5 xl:hidden"
                  onClick={() => setIsCommentsDrawerOpen(true)}
                >
                  <MessageSquareIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Comments</span>
                  <span className="sm:hidden">Notes</span>
                  <span className="text-sm text-muted-foreground">{annotations.length}</span>
                </Button>

                <Button
                  variant={sidebarOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  className="hidden rounded-sm border border-border/70 px-3.5 xl:inline-flex"
                  onClick={toggleComments}
                >
                  <PanelRightIcon className="h-4 w-4" />
                  {sidebarOpen ? 'Hide comments' : 'Show comments'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid items-start gap-5 ${sidebarOpen ? 'xl:grid-cols-[minmax(0,1fr)_21rem]' : 'xl:grid-cols-1'}`}>
          <Card className="min-w-0 overflow-hidden rounded-md border border-border/65 bg-surface shadow-none">
            <CardContent className="p-3 sm:p-4">
              <article className={`w-full ${sidebarOpen ? 'mx-auto max-w-4xl' : 'max-w-none'}`}>
                <div ref={containerRef} className="min-w-0 overflow-hidden" onMouseUp={handleMouseUp}>
                  <div className={`${proseClass} markdown-article ${themeClass}`.trim()}>
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        img: ({ node, ...props }) => <ImageWithFallback {...props} />,
                      }}
                    >
                      {content}
                    </Markdown>
                  </div>
                </div>
              </article>
            </CardContent>
          </Card>

          {sidebarOpen && (
            <div className="hidden min-w-0 xl:sticky xl:top-28 xl:block">
              {sidebar}
            </div>
          )}
        </div>

        <CommentHighlighter
          containerRef={containerRef}
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
          activeAnnotationId={activeAnnotationId}
        />

        {typeof document !== 'undefined' && isAnchoring && createPortal(
          <div className="fixed top-4 right-4 z-50 rounded-sm border border-border/70 bg-surface p-3 shadow-none">
            <Loader2Icon className="h-4 w-4 animate-spin" />
          </div>,
          document.body,
        )}

        {typeof document !== 'undefined' && createPortal(
          <Button
            variant={commentsVisible ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-border/70 bg-surface shadow-none"
            onClick={toggleComments}
            aria-label={commentsVisible ? 'Hide comments' : 'Show comments'}
          >
            {commentsVisible ? (
              <XIcon className="h-4 w-4" />
            ) : (
              <MessageSquareIcon className="h-4 w-4" />
            )}
          </Button>,
          document.body,
        )}

        {typeof document !== 'undefined' && popoverPos && pendingAnchor && createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50"
            style={{
              left: popoverPos.x,
              top: popoverPos.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <Button
              size="sm"
              className="rounded-sm border border-border/70 px-4 shadow-none"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => openDialog()}
            >
              Add comment
            </Button>
          </div>,
          document.body,
        )}

        <Sheet open={isCommentsDrawerOpen} onOpenChange={setIsCommentsDrawerOpen}>
          <SheetContent side="right" className="h-full w-[min(100vw,24rem)] border-l border-border/65 bg-background xl:hidden">
            <SheetHeader>
              <SheetTitle>Comments</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4 pt-0">{sidebar}</div>
          </SheetContent>
        </Sheet>

        <Dialog open={isModalOpen} onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDialog();
          }
        }}>
          <DialogContent className="rounded-md border border-border/65 bg-background shadow-none">
            <DialogHeader>
              <DialogTitle>
                {isGlobalComment ? 'Add document note' : 'Add inline comment'}
              </DialogTitle>
            </DialogHeader>

            <div className="py-2">
              {!isGlobalComment && pendingAnchor && (
                <div className="mb-4 rounded-sm border border-border/65 bg-surface p-3">
                  <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    Selected text
                  </p>
                  <span className="mt-2 block whitespace-pre-wrap text-sm leading-6 text-foreground">
                    "{pendingAnchor.exact}"
                  </span>
                </div>
              )}

              {isGlobalComment && (
                <div className="mb-4 rounded-sm border border-border/65 bg-surface p-3 text-sm leading-6 text-muted-foreground">
                  Document note
                </div>
              )}

              <Textarea
                placeholder="Capture the review note, edit request, or open question..."
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                autoFocus
                rows={5}
                className="w-full"
                onKeyDown={handleKeyDown}
              />
            </div>

            <DialogFooter>
              <Button variant="ghost" className="rounded-sm border border-border/70 px-4" onClick={closeDialog}>
                Cancel
              </Button>
              <Button className="rounded-sm px-4" disabled={!commentText.trim()} onClick={handleSubmit}>
                Add comment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
