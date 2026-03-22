import { useState, useRef, useCallback, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useAnnotationStore, type Annotation } from '~/contexts/AnnotationStore';
import { CommentHighlighter } from './CommentHighlighter';
import { CommentSidebar } from './CommentSidebar';
import { Button, Modal, TextArea, Spinner, Tooltip, Badge } from '@heroui/react';

interface LineAnnotatedMarkdownProps {
  content: string;
  proseClass: string;
  themeClass: string;
}

function getTextQuote() {
  return import('dom-anchor-text-quote');
}

export function LineAnnotatedMarkdown({
  content,
  proseClass,
  themeClass,
}: LineAnnotatedMarkdownProps) {
  const { annotations, addAnnotation, removeAnnotation } = useAnnotationStore();
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<{ exact: string; prefix: string; suffix: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isGlobalComment, setIsGlobalComment] = useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (typeof window === 'undefined') return;

    if (popoverRef.current?.contains(e.target as Node)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPopoverPos(null);
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText.trim() || !containerRef.current) return;

    const range = selection.getRangeAt(0);
    if (!range) return;

    try {
      setIsAnchoring(true);
      const container = containerRef.current;
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
    } catch (err) {
      console.warn('anchor error:', err);
      setIsAnchoring(false);
    }
  }, []);

  const openDialog = useCallback((global = false) => {
    setPopoverPos(null);
    setCommentText('');
    setIsGlobalComment(global);
    setIsModalOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsModalOpen(false);
    setPendingAnchor(null);
    setCommentText('');
    setIsGlobalComment(false);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!commentText.trim()) return;
    if (isGlobalComment) {
      addAnnotation(null, commentText.trim(), true);
    } else if (pendingAnchor) {
      addAnnotation(pendingAnchor, commentText.trim());
    }
    closeDialog();
  }, [pendingAnchor, commentText, addAnnotation, closeDialog, isGlobalComment]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
    setTimeout(() => setActiveAnnotationId(null), 2000);

    if (!containerRef.current) return;
    const mark = containerRef.current.querySelector(`mark[data-annotation-id="${annotation.id}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverPos && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverPos(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [popoverPos]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-end gap-2 mb-4">
          <Tooltip delay={0}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => openDialog(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="ml-1">Add Comment</span>
            </Button>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              <p>Add a global comment to this document</p>
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={0}>
            <Button
              variant="ghost"
              size="sm"
              className={sidebarOpen ? '' : 'bg-surface'}
              onPress={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Hide comments panel' : 'Show comments panel'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {annotations.length > 0 && (
                <Badge color="accent" size="sm" className="ml-1">
                  {annotations.length}
                </Badge>
              )}
            </Button>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              <p>{sidebarOpen ? 'Hide' : 'Show'} comments panel</p>
            </Tooltip.Content>
          </Tooltip>
        </div>

        <div ref={containerRef} className="min-w-0 overflow-hidden" onMouseUp={handleMouseUp}>
          <div className={`${proseClass} ${themeClass} overflow-x-auto`}>
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{content}</Markdown>
          </div>
        </div>

        <CommentHighlighter
          containerRef={containerRef}
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
        />

        {isAnchoring && (
          <div className="fixed z-50 top-4 right-4">
            <Spinner size="sm" />
          </div>
        )}
        {popoverPos && pendingAnchor && (
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
              variant="primary"
              size="sm"
              className="shadow-lg"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPress={() => {
                openDialog();
              }}
            >
              + Comment
            </Button>
          </div>
        )}

        <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
          <Modal.Backdrop isDismissable>
            <Modal.Container size="sm" placement="center">
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>
                    {isGlobalComment ? 'Add Global Comment' : 'Add Comment'}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  {!isGlobalComment && pendingAnchor && (
                    <div className="bg-surface rounded-lg p-3 mb-4 font-mono text-sm max-h-32 overflow-auto">
                      <span className="whitespace-pre-wrap">{pendingAnchor.exact}</span>
                    </div>
                  )}

                  {isGlobalComment && (
                    <div className="bg-surface rounded-lg p-3 mb-4 text-sm">
                      <span className="text-muted">This comment applies to the entire document</span>
                    </div>
                  )}

                  <TextArea
                    placeholder="Enter your comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    autoFocus
                    rows={4}
                    fullWidth
                    onKeyDown={handleKeyDown}
                  />

                  <p className="text-xs text-muted mt-2">
                    <kbd className="px-1.5 py-0.5 bg-surface rounded text-xs">Cmd+Enter</kbd> to submit · <kbd className="px-1.5 py-0.5 bg-surface rounded text-xs">Esc</kbd> to cancel
                  </p>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="ghost">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={!commentText.trim()}
                    onPress={handleSubmit}
                  >
                    Add Comment
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      {sidebarOpen && (
        <CommentSidebar
          annotations={annotations}
          rawContent={content}
          onRemove={removeAnnotation}
          onAnnotationClick={handleAnnotationClick}
          activeAnnotationId={activeAnnotationId}
        />
      )}
    </div>
  );
}
