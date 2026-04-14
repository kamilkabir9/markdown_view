import { Button } from '~/components/ui/button';
import { Toggle } from '~/components/ui/toggle';

interface MarkdownPageActionsProps {
  isEditing: boolean;
  isOutlineVisible: boolean;
  isCommentsVisible: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isUploadingImage: boolean;
  saveStatus: 'idle' | 'saved';
  onToggleOutline: () => void;
  onToggleComments: () => void;
  onStartEditing: () => void;
  onOpenImageDialog: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
}

export function MarkdownPageActions({
  isEditing,
  isOutlineVisible,
  isCommentsVisible,
  isDirty,
  isSaving,
  isUploadingImage,
  saveStatus,
  onToggleOutline,
  onToggleComments,
  onStartEditing,
  onOpenImageDialog,
  onCancelEditing,
  onSave,
}: MarkdownPageActionsProps) {
  return (
    <>
      <Toggle variant="outline" pressed={isOutlineVisible} onClick={onToggleOutline}>
        Summary
      </Toggle>
      <Toggle variant="outline" pressed={isCommentsVisible} onClick={onToggleComments}>
        Comments
      </Toggle>
      {isEditing ? (
        <>
          {saveStatus === 'saved' && <span className="text-xs text-muted-foreground">Saved</span>}
          <Button variant="outline" onClick={onOpenImageDialog} disabled={isSaving || isUploadingImage}>
            {isUploadingImage ? 'Uploading image...' : 'Add image'}
          </Button>
          <Button variant="outline" onClick={onCancelEditing} disabled={isSaving || isUploadingImage}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!isDirty || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      ) : (
        <>
          {saveStatus === 'saved' && <span className="text-xs text-muted-foreground">Saved</span>}
          <Button onClick={onStartEditing}>Edit</Button>
        </>
      )}
    </>
  );
}
