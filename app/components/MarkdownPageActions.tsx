import { ImagePlusIcon, MessageSquareIcon, PencilIcon, SaveIcon, XIcon, ListTreeIcon } from 'lucide-react';
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
      <Toggle className="h-11 w-full px-3 sm:h-8 sm:w-auto" variant="outline" pressed={isOutlineVisible} onClick={onToggleOutline}>
        <ListTreeIcon data-icon="inline-start" />
        Summary
      </Toggle>
      <Toggle className="h-11 w-full px-3 sm:h-8 sm:w-auto" variant="outline" pressed={isCommentsVisible} onClick={onToggleComments}>
        <MessageSquareIcon data-icon="inline-start" />
        Comments
      </Toggle>
      {isEditing ? (
        <>
          {saveStatus === 'saved' && <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1">Saved</span>}
          <Button className="h-11 w-full sm:h-8 sm:w-auto" variant="outline" onClick={onOpenImageDialog} disabled={isSaving || isUploadingImage}>
            <ImagePlusIcon data-icon="inline-start" />
            {isUploadingImage ? 'Uploading image...' : 'Add image'}
          </Button>
          <Button className="h-11 w-full sm:h-8 sm:w-auto" variant="outline" onClick={onCancelEditing} disabled={isSaving || isUploadingImage}>
            <XIcon data-icon="inline-start" />
            Cancel
          </Button>
          <Button className="h-11 w-full sm:h-8 sm:w-auto" onClick={onSave} disabled={!isDirty || isSaving}>
            <SaveIcon data-icon="inline-start" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      ) : (
        <>
          {saveStatus === 'saved' && <span className="text-xs text-muted-foreground">Saved</span>}
          <Button className="h-11 w-full sm:h-8 sm:w-auto" onClick={onStartEditing}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
        </>
      )}
    </>
  );
}
