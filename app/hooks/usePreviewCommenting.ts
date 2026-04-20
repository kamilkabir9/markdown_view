import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Anchor } from '~/contexts/AnnotationStore';
import { isRangeWithinSingleAnnotationBlock } from '~/lib/annotation-blocks';
import { enrichAnchorFromMarkdown } from '~/lib/comment-anchors';

interface PendingAnchor {
  anchor: Anchor;
  quote: string;
}

interface SelectionActionPosition {
  top: number;
  left: number;
}

interface UsePreviewCommentingOptions {
  previewRef: RefObject<HTMLElement | null>;
  fileContent: string | null;
  isEditing: boolean;
  addAnnotation: (anchor: Anchor | null, text: string, isGlobal?: boolean) => Promise<void>;
  onError: (message: string) => void;
}

export function usePreviewCommenting({
  previewRef,
  fileContent,
  isEditing,
  addAnnotation,
  onError,
}: UsePreviewCommentingOptions) {
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnchor | null>(null);
  const [selectionActionPosition, setSelectionActionPosition] = useState<SelectionActionPosition | null>(null);
  const [isCreateCommentDialogOpen, setIsCreateCommentDialogOpen] = useState(false);
  const [isCreatingDocumentComment, setIsCreatingDocumentComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

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

    if (!isRangeWithinSingleAnnotationBlock(range, container)) {
      clearPendingSelection();
      onError('Inline comments must stay within a single paragraph, list item, heading, or table cell.');
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
        left: Math.min(
          Math.max(rangeRect.left - containerRect.left + rangeRect.width / 2, 72),
          Math.max(containerRect.width - 72, 72),
        ),
      });
      setIsCreatingDocumentComment(false);
    } catch {
      onError('Selected text could not be anchored for commenting.');
    }
  }, [clearPendingSelection, isEditing, onError, previewRef]);

  const handleCreateComment = useCallback(async () => {
    if (!fileContent || !pendingAnchor || !commentDraft.trim() || isEditing) {
      return;
    }

    await addAnnotation(
      enrichAnchorFromMarkdown(fileContent, pendingAnchor.anchor),
      commentDraft.trim(),
      false,
    );
    setCommentDraft('');
    clearPendingSelection();
  }, [addAnnotation, clearPendingSelection, commentDraft, fileContent, isEditing, pendingAnchor]);

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
        left: Math.min(
          Math.max(rangeRect.left - containerRect.left + rangeRect.width / 2, 72),
          Math.max(containerRect.width - 72, 72),
        ),
      });
    };

    updatePosition();
    container.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      container.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [pendingAnchor, previewRef]);

  return {
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
  };
}
