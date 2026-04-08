import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Button, buttonVariants } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '~/components/ui/breadcrumb';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Loader2Icon, PlusIcon, MessageSquareIcon, MessageSquareOffIcon, PanelLeftIcon, PanelRightIcon } from 'lucide-react';
import { useAnnotationStore, type Annotation } from '~/contexts/AnnotationStore';
import { useAppChrome } from '~/contexts/AppChromeContext';
import { cn } from '~/lib/utils';
import { CommentHighlighter } from './CommentHighlighter';
import { CommentSidebar } from './CommentSidebar';
import { ImageWithFallback } from './ImageWithFallback';
import { MermaidBlock } from './MermaidBlock';

interface LineAnnotatedMarkdownProps {
  content: string;
  proseClass: string;
  themeClass: string;
  relativeFilePath: string;
  fullFilePath: string;
}

function getTextQuote() {
  return import('dom-anchor-text-quote');
}

interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

type MarkdownImageProps = ComponentPropsWithoutRef<'img'> & { node?: unknown };

function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_~[\]()>#+.!-]/g, '')
    .replace(/&amp;|&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeHeadingText(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
}

function extractOutline(content: string): OutlineItem[] {
  const slugCounts = new Map<string, number>();

  return content
    .split('\n')
    .flatMap((line) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (!match) return [];

      const text = normalizeHeadingText(match[2]);
      if (!text) return [];

      const baseSlug = slugifyHeading(text) || 'section';
      const count = slugCounts.get(baseSlug) ?? 0;
      slugCounts.set(baseSlug, count + 1);

      return [{
        id: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
        level: match[1].length,
        text,
      } satisfies OutlineItem];
    });
}

function ButtonTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function LineAnnotatedMarkdown({
  content,
  proseClass,
  themeClass,
  relativeFilePath,
  fullFilePath,
}: LineAnnotatedMarkdownProps) {
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
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOutlineDrawerOpen, setIsOutlineDrawerOpen] = useState(false);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const outlineNavRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { setActions, setBreadcrumbs } = useAppChrome();

  const documentMeta = useMemo(() => {
    const normalizedPath = relativeFilePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    const filename = parts[parts.length - 1] || relativeFilePath;

    return {
      title: filename,
    };
  }, [relativeFilePath]);
  const commentsVisible = isDesktopViewport ? sidebarOpen : isCommentsDrawerOpen;
  const outlineItems = useMemo(() => extractOutline(content), [content]);
  const outlineVisible = isDesktopViewport ? outlineOpen : isOutlineDrawerOpen;
  const hasOutline = outlineItems.length > 0;
  const showOutlineLabel = hasOutline ? `Show outline (${outlineItems.length})` : 'Show outline';
  const hideOutlineLabel = hasOutline ? `Hide outline (${outlineItems.length})` : 'Hide outline';
  const showCommentsLabel = `Show comments (${annotations.length})`;
  const hideCommentsLabel = `Hide comments (${annotations.length})`;
  const isDarkTheme = themeClass.includes('dark');

  const markdownComponents = {
    img: ({ node, ...props }: MarkdownImageProps) => <ImageWithFallback {...props} />,
    code: ({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) => {
      const language = className?.match(/language-(\w+)/)?.[1];
      const code = Array.isArray(children)
        ? children.map((child) => String(child)).join('')
        : String(children ?? '');

      if (language === 'mermaid') {
        return <MermaidBlock code={code.replace(/\n$/, '')} isDarkTheme={isDarkTheme} />;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

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

    let anchoringSpinnerTimeout: number | undefined;

    try {
      anchoringSpinnerTimeout = window.setTimeout(() => {
        setIsAnchoring(true);
      }, 150);

      const textQuote = await getTextQuote();
      const anchor = textQuote.fromRange(container, range);

      window.clearTimeout(anchoringSpinnerTimeout);
      setIsAnchoring(false);

      if (!anchor?.exact?.trim()) {
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        return;
      }

      setPopoverPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      setPendingAnchor({
        exact: anchor.exact,
        prefix: anchor.prefix || '',
        suffix: anchor.suffix || '',
      });
    } catch (error) {
      if (anchoringSpinnerTimeout !== undefined) {
        window.clearTimeout(anchoringSpinnerTimeout);
      }
      setIsAnchoring(false);
      console.warn('anchor error:', error);
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

  const toggleOutline = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsOutlineDrawerOpen((open) => !open);
      return;
    }

    setOutlineOpen((open) => !open);
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

  useEffect(() => {
    setActiveOutlineId(outlineItems[0]?.id ?? null);
  }, [outlineItems]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    headings.forEach((heading, index) => {
      const item = outlineItems[index];
      if (!(heading instanceof HTMLElement) || !item) return;

      heading.id = item.id;
      heading.dataset.outlineId = item.id;
      heading.classList.add('scroll-mt-32');
    });
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !outlineItems.length) return;

    const container = containerRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter((heading): heading is HTMLElement => heading instanceof HTMLElement);

    if (!headings.length) return;

    const updateActiveHeading = () => {
      const nextActive = [...headings].reverse().find((heading: HTMLElement) => heading.getBoundingClientRect().top <= 140) ?? headings[0];
      const nextIndex = headings.indexOf(nextActive);
      setActiveOutlineId(outlineItems[nextIndex]?.id ?? outlineItems[0]?.id ?? null);
    };

    updateActiveHeading();
    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    window.addEventListener('resize', updateActiveHeading, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', updateActiveHeading);
    };
  }, [outlineItems]);

  useEffect(() => {
    if (!activeOutlineId) return;

    const nav = outlineNavRef.current;
    const activeButton = nav?.querySelector(`[data-outline-nav-item="${activeOutlineId}"]`);
    if (!(nav instanceof HTMLElement) || !(activeButton instanceof HTMLElement)) return;

    const nextTop = activeButton.offsetTop - nav.clientHeight / 2 + activeButton.clientHeight / 2;
    nav.scrollTo({ top: Math.max(nextTop, 0), behavior: 'smooth' });
  }, [activeOutlineId]);

  useEffect(() => {
    setBreadcrumbs(
      <Breadcrumb>
        <BreadcrumbList className="gap-2 text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Markdown Files</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{documentMeta.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    setActions(
      <>
        <ButtonTooltip label="Add note">
          <Button variant="secondary" size="sm" className="rounded-sm px-3.5" onClick={() => openDialog(true)}>
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Add note</span>
            <span className="sm:hidden">Note</span>
          </Button>
        </ButtonTooltip>

        {hasOutline && isDesktopViewport ? (
          <ButtonTooltip label={outlineOpen ? hideOutlineLabel : showOutlineLabel}>
            <Button
              variant={outlineOpen ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-sm border border-border/70 px-3.5"
              onClick={toggleOutline}
            >
              <PanelLeftIcon className="h-4 w-4" />
              {outlineOpen ? hideOutlineLabel : showOutlineLabel}
            </Button>
          </ButtonTooltip>
        ) : hasOutline ? (
          <ButtonTooltip label={showOutlineLabel}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-sm border border-border/70 px-3.5"
              onClick={() => setIsOutlineDrawerOpen(true)}
            >
              <PanelLeftIcon className="h-4 w-4" />
              {showOutlineLabel}
            </Button>
          </ButtonTooltip>
        ) : null}

        {isDesktopViewport ? (
          <ButtonTooltip label={sidebarOpen ? hideCommentsLabel : showCommentsLabel}>
            <Button
              variant={sidebarOpen ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-sm border border-border/70 px-3.5"
              onClick={toggleComments}
            >
              <PanelRightIcon className="h-4 w-4" />
              {sidebarOpen ? hideCommentsLabel : showCommentsLabel}
            </Button>
          </ButtonTooltip>
        ) : (
          <ButtonTooltip label={showCommentsLabel}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-sm border border-border/70 px-3.5"
              onClick={() => setIsCommentsDrawerOpen(true)}
            >
              <MessageSquareIcon className="h-4 w-4" />
              {showCommentsLabel}
            </Button>
          </ButtonTooltip>
        )}
      </>,
    );

    return () => {
      setBreadcrumbs(null);
      setActions(null);
    };
  }, [
    documentMeta.title,
    hasOutline,
    hideCommentsLabel,
    hideOutlineLabel,
    isDesktopViewport,
    outlineOpen,
    openDialog,
    setActions,
    setBreadcrumbs,
    showCommentsLabel,
    showOutlineLabel,
    sidebarOpen,
    toggleOutline,
    toggleComments,
  ]);

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
      relativeFilePath={relativeFilePath}
      fullFilePath={fullFilePath}
      onUpdate={updateAnnotationText}
      onRemove={removeAnnotation}
      onClose={toggleComments}
      onAnnotationClick={handleAnnotationClick}
      activeAnnotationId={activeAnnotationId}
      className="h-full"
    />
  );

  const handleOutlineClick = useCallback((id: string, index: number) => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    const heading = container?.querySelectorAll('h1, h2, h3, h4, h5, h6')?.[index] ?? document.getElementById(id);
    if (!(heading instanceof HTMLElement)) return;

    setActiveOutlineId(id);

    const topOffset = 112;
    const nextTop = window.scrollY + heading.getBoundingClientRect().top - topOffset;
    window.scrollTo({ top: Math.max(nextTop, 0), behavior: 'smooth' });

    if (window.innerWidth < 1280) {
      setIsOutlineDrawerOpen(false);
    }
  }, []);

  const outline = hasOutline ? (
    <Card className="h-full rounded-md border border-border/65 bg-surface shadow-none">
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-border/65 pb-3">
            <div>
              <h2 className="font-[var(--font-display)] text-xl leading-none tracking-tight">Outline</h2>
              <p className="mt-1 text-sm text-muted-foreground">{outlineItems.length} sections</p>
            </div>

            {isDesktopViewport ? (
              <Button variant="ghost" size="icon-sm" className="rounded-sm border border-border/70" onClick={toggleOutline}>
                <PanelLeftIcon className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <nav
            ref={outlineNavRef}
            aria-label="Document outline"
            className="max-h-[calc(100vh-13rem)] space-y-1 overflow-y-auto pr-1"
          >
            {outlineItems.map((item, index) => (
              <a
                key={item.id}
                data-outline-nav-item={item.id}
                href={`#${item.id}`}
                className={cn(
                  buttonVariants({ variant: activeOutlineId === item.id ? 'secondary' : 'ghost', size: 'sm' }),
                  'h-auto w-full justify-start rounded-sm px-2 py-2 text-left text-sm whitespace-normal',
                )}
                style={{ paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem` }}
                onClick={(event) => {
                  event.preventDefault();
                  handleOutlineClick(item.id, index);
                }}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </div>
      </CardContent>
    </Card>
  ) : null;

  const layoutClassName = [
    'grid items-start gap-5',
    outlineOpen && sidebarOpen && 'xl:grid-cols-[16rem_minmax(0,1fr)_21rem]',
    outlineOpen && !sidebarOpen && 'xl:grid-cols-[16rem_minmax(0,1fr)]',
    !outlineOpen && sidebarOpen && 'xl:grid-cols-[minmax(0,1fr)_21rem]',
    !outlineOpen && !sidebarOpen && 'xl:grid-cols-1',
  ].filter(Boolean).join(' ');

  return (
    <TooltipProvider delay={180}>
      <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 px-4">
        <div className="mx-auto max-w-[1420px] space-y-5">
          <div className={layoutClassName}>
            {outlineOpen && outline ? (
              <div className="hidden min-w-0 xl:sticky xl:top-28 xl:block">
                {outline}
              </div>
            ) : null}

            <Card className="min-w-0 overflow-hidden rounded-md border border-border/65 bg-surface shadow-none">
              <CardContent className="p-3 sm:p-4">
                <article className={`w-full ${sidebarOpen ? 'mx-auto max-w-4xl' : 'max-w-none'}`}>
                  <div ref={containerRef} className="min-w-0 overflow-hidden" onMouseUp={handleMouseUp}>
                    <div className={`${proseClass} markdown-article ${themeClass}`.trim()}>
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={markdownComponents}
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
          <ButtonTooltip label={commentsVisible ? 'Hide comments' : 'Show comments'}>
            <Button
              variant={commentsVisible ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-border/70 bg-surface shadow-none"
              onClick={toggleComments}
              aria-label={commentsVisible ? 'Hide comments' : 'Show comments'}
            >
              {commentsVisible ? (
                <MessageSquareOffIcon className="h-4 w-4" />
              ) : (
                <MessageSquareIcon className="h-4 w-4" />
              )}
            </Button>
          </ButtonTooltip>,
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
            <ButtonTooltip label="Add comment">
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
            </ButtonTooltip>
          </div>,
          document.body,
        )}

        <Sheet open={isOutlineDrawerOpen} onOpenChange={setIsOutlineDrawerOpen}>
          <SheetContent side="left" className="h-full w-[min(100vw,22rem)] border-r border-border/65 bg-background xl:hidden">
            <SheetHeader>
              <SheetTitle>Outline</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4 pt-0">{outline}</div>
          </SheetContent>
        </Sheet>

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
              <ButtonTooltip label="Cancel">
                <Button variant="ghost" className="rounded-sm border border-border/70 px-4" onClick={closeDialog}>
                  Cancel
                </Button>
              </ButtonTooltip>
              <ButtonTooltip label="Add comment">
                <Button className="rounded-sm px-4" disabled={!commentText.trim()} onClick={handleSubmit}>
                  Add comment
                </Button>
              </ButtonTooltip>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}
