import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { cn } from '~/lib/utils';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  isUploading: boolean;
  error?: string | null;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDraggingChange: (isDragging: boolean) => void;
  onUpload: (file: File) => Promise<void> | void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  inputRef,
  isDragging,
  isUploading,
  error,
  onInputChange,
  onDraggingChange,
  onUpload,
}: ImageUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle>Upload image</DialogTitle>
          <DialogDescription>
            Upload an image and insert a markdown link at the current cursor position.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp"
            className="hidden"
            onChange={onInputChange}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              onDraggingChange(true);
            }}
            onDragLeave={() => onDraggingChange(false)}
            onDrop={(event) => {
              event.preventDefault();
              onDraggingChange(false);
              const droppedFile = event.dataTransfer.files?.[0];
              if (!droppedFile) return;
              void onUpload(droppedFile);
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-9 text-center text-sm transition-colors',
              isDragging
                ? 'border-primary/60 bg-primary/5 text-foreground'
                : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
            disabled={isUploading}
          >
            <span className="font-medium text-foreground">Drop image here</span>
            <span>or click to choose a file</span>
            <span className="text-xs">GIF, JPEG, PNG, SVG, WebP</span>
          </button>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Choose image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
