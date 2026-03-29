import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from 'react-router';
import type { LinksFunction } from 'react-router';
import { useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { AppChromeProvider, useAppChrome } from '~/contexts/AppChromeContext';
import { ThemeProvider } from '~/contexts/ThemeContext';
import packageJson from '../package.json';

import './styles/tailwind.css';

export const links: LinksFunction = () => [];

const APP_VERSION = packageJson.version;

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
      <AppShellInner />
    </AppChromeProvider>
  );
}

function AppShellInner() {
  const { breadcrumbs, actions } = useAppChrome();

  return (
    <>
      <LoadingBar />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
        Skip to content
      </a>
      <div className="relative isolate mx-auto flex min-h-screen w-full max-w-[1420px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-40 mb-5 space-y-3 rounded-md border border-border/65 bg-background/88 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/72 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link to="/" className="inline-flex items-center text-xs tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground">
                Markdown Viewer
              </Link>
            </div>

            <div className="w-auto shrink-0">
              <ThemeSwitcher compact />
            </div>
          </div>

          {(breadcrumbs || actions) && (
            <div className="flex flex-col gap-3 border-t border-border/65 pt-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">{breadcrumbs}</div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
            </div>
          )}
        </header>

        <main id="main-content" className="flex-1">
          <Outlet />
        </main>
        <Separator className="mb-4 mt-12 opacity-55" />
        <footer className="px-1 py-2 text-xs tracking-[0.14em] text-muted uppercase">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>Markdown Viewer</p>
            <p>v{APP_VERSION}</p>
          </div>
        </footer>
      </div>
      <ScrollToTopButton />
      <DevAgentation />
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect x=%2212%22 y=%228%22 width=%2240%22 height=%2248%22 rx=%224%22 fill=%22%23171311%22/><line x1=%2220%22 y1=%2224%22 x2=%2244%22 y2=%2224%22 stroke=%22%23F4EFE7%22 stroke-width=%223%22/><line x1=%2220%22 y1=%2234%22 x2=%2244%22 y2=%2234%22 stroke=%22%23F4EFE7%22 stroke-width=%223%22/></svg>" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
