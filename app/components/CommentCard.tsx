import { useState, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from 'react';
import { CheckIcon, ClipboardIcon, PencilIcon, XIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import type { Annotation } from '~/contexts/AnnotationStore';
import { formatCreatedAt, getSelectedTextPreview } from '~/lib/comment-copy';

function ButtonTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

interface CommentCardProps {
  annotation: Annotation;
  inlineNumber?: number;
  fallbackNumber: number;
  isActive: boolean;
  isCopied: boolean;
  onCopy: (annotation: Annotation) => void;
  onRemove: (id: string) => Promise<void> | void;
  onUpdate: (id: string, text: string) => Promise<void> | void;
  onClick?: (annotation: Annotation) => void;
  cardRef?: ((node: HTMLDivElement | null) => void) | React.RefObject<HTMLDivElement | null>;
}

export function CommentCard({
  annotation,
  inlineNumber,
  fallbackNumber,
  isActive,
  isCopied,
  onCopy,
  onRemove,
  onUpdate,
  onClick,
  cardRef,
}: CommentCardProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingText, setEditingText] = useState(annotation.text);

  const showActions = hovered || editing;

  const cancelEditing = () => {
    setEditing(false);
    setEditingText(annotation.text);
  };

  const saveEditing = () => {
    const nextText = editingText.trim();
    if (!nextText) return;
    onUpdate(annotation.id, nextText);
    setEditing(false);
  };

  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      saveEditing();
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, textarea, input')) return;
        onClick?.(annotation);
      }}
    >
      <Card
        className={`cursor-pointer rounded-sm border transition-all duration-200 ${
          isActive
            ? 'border-foreground/16 bg-surface'
            : 'border-border/65 bg-background shadow-none hover:border-foreground/16'
        }`}
      >
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-sm border text-sm font-semibold ${isActive ? 'border-foreground/16 bg-background text-foreground' : 'border-border/70 bg-surface text-muted-foreground'}`}>
                {annotation.isGlobal ? '—' : String(inlineNumber ?? fallbackNumber).padStart(2, '0')}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {annotation.isGlobal ? 'Document note' : 'Inline note'}
                  </p>
                  <span className="text-[0.67rem] tracking-[0.12em] text-muted-foreground uppercase">{annotation.isGlobal ? 'Document' : 'Linked'}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {formatCreatedAt(annotation.createdAt)}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
              <ButtonTooltip label="Edit comment">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-sm border border-border/70"
                  aria-label="Edit comment"
                  onClick={() => setEditing(true)}
                  tabIndex={showActions ? 0 : -1}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </ButtonTooltip>
              <ButtonTooltip label="Copy comment">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-sm border border-border/70"
                  aria-label="Copy comment"
                  onClick={() => onCopy(annotation)}
                  tabIndex={showActions ? 0 : -1}
                >
                  {isCopied ? (
                    <CheckIcon className="h-4 w-4 text-success" />
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </Button>
              </ButtonTooltip>
              <ButtonTooltip label="Remove comment">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-sm border border-border/70"
                  aria-label="Remove comment"
                  onClick={() => onRemove(annotation.id)}
                  tabIndex={showActions ? 0 : -1}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </ButtonTooltip>
            </div>
          </div>

          {annotation.isGlobal ? (
            <div className="rounded-sm border border-border/65 bg-surface px-3 py-2.5 text-sm text-muted-foreground">
              Document note
            </div>
          ) : (
            <div className="rounded-sm border border-border/65 bg-surface px-3 py-3">
              <p className="text-[0.67rem] tracking-[0.12em] text-muted-foreground uppercase">
                Selected text
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/90">
                "{getSelectedTextPreview(annotation.anchor?.exact ?? '')}"
              </p>
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editingText}
                onChange={(event) => setEditingText(event.target.value)}
                onKeyDown={handleEditKeyDown}
                className="min-h-[7rem] w-full rounded-sm border border-border/70 bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus:border-foreground/20 focus:ring-2 focus:ring-foreground/8"
                rows={4}
                autoFocus
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ButtonTooltip label="Cancel editing">
                    <Button size="sm" variant="ghost" className="rounded-sm border border-border/70 px-3" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </ButtonTooltip>
                  <ButtonTooltip label="Save comment">
                    <Button size="sm" className="rounded-sm px-3" disabled={!editingText.trim()} onClick={saveEditing}>
                      Save
                    </Button>
                  </ButtonTooltip>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-foreground">{annotation.text}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
