import {
  Link,
  Outlet,
  useNavigation,
} from 'react-router';
import { useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import { SettingsIcon } from 'lucide-react';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Toggle } from '~/components/ui/toggle';
import { TooltipProvider } from '~/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { AppChromeProvider, useAppChrome } from '~/contexts/AppChromeContext';
import { CopySettingsProvider, useCopySettings } from '~/contexts/CopySettingsContext';
import { ThemeProvider } from '~/contexts/ThemeContext';
import './styles/tailwind.css';

function DevAgentation() {
  const [Agentation, setAgentation] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    void import('agentation').then((mod) => {
      setAgentation(() => mod.Agentation);
    });
  }, []);

  if (!import.meta.env.DEV || !Agentation) return null;

  return <Agentation />;
}

function LoadingBar() {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 h-px bg-accent/65 transition-all duration-200 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transform: isLoading ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left',
      }}
    />
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      size="icon-sm"
      className="fixed right-6 bottom-6 z-50 rounded-md border border-border/70 bg-surface shadow-none"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </Button>
  );
}

function AppShell() {
  return (
    <AppChromeProvider>
      <TooltipProvider delay={180}>
        <AppShellInner />
      </TooltipProvider>
    </AppChromeProvider>
  );
}

function AppShellInner() {
  const { breadcrumbs, actions } = useAppChrome();
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <LoadingBar />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
        Skip to content
      </a>
      <div className="relative isolate mx-auto flex h-screen w-full max-w-[1420px] flex-col overflow-hidden px-4 pb-6 pt-5 sm:px-6 lg:px-8">
        <header className="mb-5 space-y-3 rounded-md border border-border/65 bg-background px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link to="/" className="inline-flex items-center text-xs tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground">
                Markdown Viewer
              </Link>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-sm"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>

          {(breadcrumbs || actions) && (
            <div className="flex flex-col gap-3 border-t border-border/65 pt-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">{breadcrumbs}</div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
            </div>
          )}
        </header>

        <main id="main-content" className="flex flex-1 min-h-0 flex-col">
          <Outlet />
        </main>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
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

      <ScrollToTopButton />
      <DevAgentation />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CopySettingsProvider>
        <AppShell />
      </CopySettingsProvider>
    </ThemeProvider>
  );
}
