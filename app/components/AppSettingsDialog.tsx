import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Toggle } from '~/components/ui/toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { useCopySettings } from '~/contexts/CopySettingsContext';

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const {
    contextPrefix,
    commentPrefix,
    commentsDelimiter,
    pathMode,
    setContextPrefix,
    setCommentPrefix,
    setCommentsDelimiter,
    setPathMode,
    returnToPreviewAfterSave,
    setReturnToPreviewAfterSave,
  } = useCopySettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure reading theme and copy formatting.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div>
            <p className="mb-2 text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
              Theme
            </p>
            <ThemeSwitcher className="w-full" />
          </div>

          <div className="space-y-3">
            <p className="text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
              Editor
            </p>
            <div className="flex items-center justify-between gap-4 rounded-sm border border-border/70 bg-background px-3 py-2.5">
              <div>
                <Label htmlFor="return-to-preview-after-save">Return to preview after save</Label>
                <p className="text-xs text-muted-foreground">When off, source mode stays open after saving.</p>
              </div>
              <Toggle
                id="return-to-preview-after-save"
                variant="outline"
                pressed={returnToPreviewAfterSave}
                onClick={() => setReturnToPreviewAfterSave(!returnToPreviewAfterSave)}
              >
                {returnToPreviewAfterSave ? 'On' : 'Off'}
              </Toggle>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
              Copy format
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="copy-context-prefix">Context prefix</Label>
              <Input
                id="copy-context-prefix"
                value={contextPrefix}
                onChange={(event) => setContextPrefix(event.target.value)}
                placeholder="Context"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="copy-comment-prefix">Comment prefix</Label>
              <Input
                id="copy-comment-prefix"
                value={commentPrefix}
                onChange={(event) => setCommentPrefix(event.target.value)}
                placeholder="Comment"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="copy-comments-delimiter">Comments delimiter</Label>
              <Input
                id="copy-comments-delimiter"
                value={commentsDelimiter}
                onChange={(event) => setCommentsDelimiter(event.target.value)}
                placeholder="---"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="copy-path-mode">File path mode</Label>
              <Select
                value={pathMode}
                onValueChange={(value) => {
                  if (value === 'relative' || value === 'full') {
                    setPathMode(value);
                  }
                }}
              >
                <SelectTrigger id="copy-path-mode" className="h-8 w-full rounded-sm border-border/70 bg-background px-3 py-2">
                  <SelectValue>
                    {(value: string | null) => (value === 'full' ? 'Full path' : 'Relative path')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="rounded-sm">
                  <SelectGroup>
                    <SelectItem value="relative" className="rounded-sm">Relative path</SelectItem>
                    <SelectItem value="full" className="rounded-sm">Full path</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
