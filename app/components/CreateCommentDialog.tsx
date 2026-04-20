import { Button } from '~/components/ui/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { getSelectedTextPreview } from '~/lib/comment-copy';

interface CreateCommentDialogProps {
  draftText: string;
  isCreatingDocumentComment: boolean;
  pendingAnchorText?: string | null;
  createDisabledReason?: string | null;
  onDraftTextChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void> | void;
}

export function CreateCommentDialog({
  draftText,
  isCreatingDocumentComment,
  pendingAnchorText,
  createDisabledReason,
  onDraftTextChange,
  onCancel,
  onSave,
}: CreateCommentDialogProps) {
  const isSaveDisabled =
    !draftText.trim()
    || (!isCreatingDocumentComment && (!pendingAnchorText || Boolean(createDisabledReason)));

  return (
    <DialogContent className="sm:max-w-[32rem]">
      <DialogHeader>
        <DialogTitle>Add comment</DialogTitle>
        <DialogDescription>
          {isCreatingDocumentComment
            ? 'This comment will be saved as a document-level note.'
            : pendingAnchorText
              ? 'Your comment will be attached to the selected preview text.'
              : 'Select text in preview before adding an inline comment.'}
        </DialogDescription>
      </DialogHeader>

      {!isCreatingDocumentComment && pendingAnchorText ? (
        <div className="rounded-sm border border-border/65 bg-surface px-3 py-3">
          <p className="text-[0.67rem] tracking-[0.12em] text-muted-foreground uppercase">Selected text</p>
          <p className="mt-2 text-sm leading-6 text-foreground/90">"{getSelectedTextPreview(pendingAnchorText, 260)}"</p>
        </div>
      ) : null}

      <textarea
        value={draftText}
        onChange={(event) => onDraftTextChange(event.target.value)}
        className="min-h-[8rem] w-full rounded-sm border border-border/70 bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus:border-foreground/20 focus:ring-2 focus:ring-foreground/8"
        rows={5}
        placeholder="Add your comment"
        autoFocus
      />

      <DialogFooter className="-mx-0 -mb-0 rounded-sm border-0 bg-transparent p-0 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSaveDisabled} onClick={() => void onSave()}>
          Save comment
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
