import { useState, useRef, useCallback, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAnnotationStore, type Annotation } from '~/contexts/AnnotationStore';
import { CommentHighlighter } from './CommentHighlighter';
import { CommentSidebar } from './CommentSidebar';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (typeof window === 'undefined') return;

    // Don't capture mouseup from inside the popover button
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
      const container = containerRef.current;
      const textQuote = await getTextQuote();
      const anchor = textQuote.fromRange(container, range);
      if (!anchor?.exact?.trim()) return;

      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0) return;

      setPopoverPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      setPendingAnchor({
        exact: anchor.exact,
        prefix: anchor.prefix || '',
        suffix: anchor.suffix || '',
      });
    } catch (err) {
      console.warn('anchor error:', err);
    }
  }, []);

  const openDialog = useCallback(() => {
    setPopoverPos(null);
    setCommentText('');
    dialogRef.current?.showModal();
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
    setPendingAnchor(null);
    setCommentText('');
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!pendingAnchor || !commentText.trim()) return;
    addAnnotation(pendingAnchor, commentText.trim());
    closeDialog();
  }, [pendingAnchor, commentText, addAnnotation, closeDialog]);

  const handleAnnotationClick = useCallback((_annotation: Annotation) => {}, []);

  // Close popover on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverPos && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverPos(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [popoverPos]);

  return (
    <div className="flex gap-4">
      <CommentSidebar
        annotations={annotations}
        rawContent={content}
        onRemove={removeAnnotation}
      />

      <div ref={containerRef} className="flex-1 min-w-0" onMouseUp={handleMouseUp}>
        <div className={`${proseClass} ${themeClass}`}>
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>

        <CommentHighlighter
          containerRef={containerRef}
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
        />

        {/* Inline popover button — uses onMouseDown + preventDefault so it fires before selection clears */}
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
            <button
              className="btn btn-primary btn-sm shadow-lg"
              onMouseDown={(e) => {
                e.preventDefault(); // prevents selection from clearing before click
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                openDialog();
              }}
            >
              + Comment
            </button>
          </div>
        )}

        {/* Native <dialog> — immune to outside-click issues by spec */}
        <dialog
          ref={dialogRef}
          className="modal"
          onClick={(e) => {
            // close only when clicking the backdrop (dialog itself), not its contents
            if (e.target === dialogRef.current) closeDialog();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onClose={closeDialog}
        >
          {pendingAnchor && (
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Add Comment</h3>

              <div className="bg-base-200 rounded p-3 mb-4 font-mono text-sm max-h-32 overflow-auto">
                <span className="whitespace-pre-wrap">{pendingAnchor.exact}</span>
              </div>

              <textarea
                className="textarea textarea-bordered w-full h-24 resize-none"
                placeholder="Enter your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                autoFocus
              />

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!commentText.trim()}
                  onClick={handleSubmit}
                >
                  Add Comment
                </button>
              </div>

              <p className="text-xs text-base-content/50 mt-3">
                <kbd className="kbd kbd-sm">Cmd+Enter</kbd> to submit · <kbd className="kbd kbd-sm">Esc</kbd> to cancel
              </p>
            </div>
          )}
        </dialog>
      </div>
    </div>
  );
}
