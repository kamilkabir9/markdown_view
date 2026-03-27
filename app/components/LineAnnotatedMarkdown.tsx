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
import { Button, Card, Drawer, Modal, Spinner, TextArea } from '@heroui/react';
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
      onAnnotationClick={handleAnnotationClick}
      activeAnnotationId={activeAnnotationId}
      className="h-full"
    />
  );

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 px-4">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="rounded-[1.1rem] border border-border/60 bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="space-y-1.5">
                <p className="truncate text-sm text-muted">{documentMeta.directory}</p>
                <h1 className="break-words font-[var(--font-display)] text-[clamp(1.7rem,3vw,2.35rem)] leading-tight tracking-tight text-foreground">
                  {documentMeta.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
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
                  className="rounded-[0.8rem] px-3.5"
                  onPress={() => navigate('/')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span className="hidden sm:inline">Back to files</span>
                  <span className="sm:hidden">Back</span>
                </Button>

                <Button variant="secondary" size="sm" className="rounded-[0.8rem] px-3.5" onPress={() => openDialog(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.75v14.5M19.25 12H4.75" />
                  </svg>
                  <span className="hidden sm:inline">Add note</span>
                  <span className="sm:hidden">Note</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-[0.8rem] px-3.5 xl:hidden"
                  onPress={() => setIsCommentsDrawerOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 8.75h10M7 12h7m-7 3.25h4.5M5.75 4.75h12.5A1.75 1.75 0 0120 6.5v8.75A1.75 1.75 0 0118.25 17H10l-4.25 3.25V17H5.75A1.75 1.75 0 014 15.25V6.5a1.75 1.75 0 011.75-1.75z" />
                  </svg>
                  <span className="hidden sm:inline">Comments</span>
                  <span className="sm:hidden">Notes</span>
                  <span className="text-sm text-muted">{annotations.length}</span>
                </Button>

                <Button
                  variant={sidebarOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  className="hidden rounded-[0.8rem] px-3.5 xl:inline-flex"
                  onPress={() => setSidebarOpen((open) => !open)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.75 6.75h14.5M4.75 12h14.5M4.75 17.25h8.5" />
                  </svg>
                  {sidebarOpen ? 'Hide comments' : 'Show comments'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid items-start gap-6 ${sidebarOpen ? 'xl:grid-cols-[minmax(0,1fr)_22.5rem]' : 'xl:grid-cols-1'}`}>
          <Card className="min-w-0 overflow-hidden rounded-[1.15rem] border border-border/60 bg-surface shadow-none">
            <Card.Content className="p-3 sm:p-5">
              <article className={`w-full ${sidebarOpen ? 'mx-auto max-w-5xl' : 'max-w-none'}`}>
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
            </Card.Content>
          </Card>

          {sidebarOpen && (
            <div className="hidden min-w-0 xl:sticky xl:top-24 xl:block">
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
          <div className="fixed right-4 top-4 z-50 rounded-[0.85rem] border border-border/60 bg-surface p-3 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.35)]">
            <Spinner size="sm" />
          </div>,
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
              className="rounded-[0.8rem] px-4 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.28)]"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPress={() => openDialog()}
            >
              + Comment
            </Button>
          </div>,
          document.body,
        )}

        {isCommentsDrawerOpen && (
          <Drawer.Backdrop
            isOpen={isCommentsDrawerOpen}
            onOpenChange={setIsCommentsDrawerOpen}
            variant="transparent"
            className="xl:hidden"
          >
            <Drawer.Content placement="right" className="xl:hidden">
              <Drawer.Dialog className="h-full w-[min(100vw,24rem)] border-l border-border/60 bg-background">
                <Drawer.CloseTrigger />
                <Drawer.Header>
                  <Drawer.Heading>Comments</Drawer.Heading>
                </Drawer.Header>
                <Drawer.Body className="px-4 pb-4 pt-0">{sidebar}</Drawer.Body>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        )}

        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) {
                closeDialog();
              }
            }}
          >
            <Modal.Backdrop isDismissable>
              <Modal.Container size="sm" placement="center">
                <Modal.Dialog className="rounded-[1.1rem] border border-border/60 bg-background shadow-[0_20px_40px_-34px_rgba(15,23,42,0.24)]">
                  <Modal.Header>
                    <Modal.Heading>
                      {isGlobalComment ? 'Add document note' : 'Add inline comment'}
                    </Modal.Heading>
                  </Modal.Header>

                  <Modal.Body>
                    {!isGlobalComment && pendingAnchor && (
                      <div className="mb-4 rounded-[0.9rem] border border-border/60 bg-surface p-3">
                        <p className="text-xs text-muted">
                          Selected text
                        </p>
                        <span className="mt-2 block whitespace-pre-wrap text-sm leading-6 text-foreground">
                          “{pendingAnchor.exact}”
                        </span>
                      </div>
                    )}

                    {isGlobalComment && (
                      <div className="mb-4 rounded-[0.9rem] border border-border/60 bg-surface p-3 text-sm leading-6 text-muted">
                        Document note
                      </div>
                    )}

                    <TextArea
                      placeholder="Capture the review note, edit request, or open question..."
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      autoFocus
                      rows={5}
                      fullWidth
                      onKeyDown={handleKeyDown}
                    />

                  </Modal.Body>

                  <Modal.Footer>
                    <Button slot="close" variant="ghost" className="rounded-[0.8rem] px-4" onPress={closeDialog}>
                      Cancel
                    </Button>
                    <Button className="rounded-[0.8rem] px-4" isDisabled={!commentText.trim()} onPress={handleSubmit}>
                      Add comment
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        )}
      </div>
    </div>
  );
}
