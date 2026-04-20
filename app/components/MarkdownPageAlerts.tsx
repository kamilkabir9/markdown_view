import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

interface MarkdownPageAlertsProps {
  saveError: string | null;
  commentActionError: string | null;
  commentsError: string | null;
  isEditing: boolean;
  isDirty: boolean;
}

export function MarkdownPageAlerts({
  saveError,
  commentActionError,
  commentsError,
  isEditing,
  isDirty,
}: MarkdownPageAlertsProps) {
  return (
    <>
      {saveError && (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {commentActionError && (
        <Alert variant="destructive">
          <AlertTitle>Comment action failed</AlertTitle>
          <AlertDescription>{commentActionError}</AlertDescription>
        </Alert>
      )}

      {commentsError && (
        <Alert variant="destructive">
          <AlertTitle>Comments unavailable</AlertTitle>
          <AlertDescription>{commentsError}</AlertDescription>
        </Alert>
      )}

      {isEditing && isDirty && (
        <Alert>
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>
            This document has unsaved changes. Use Cmd/Ctrl+S or the Save button to write the raw markdown back to disk.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
