import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from 'react-router';
import type { LinksFunction } from 'react-router';
import { useState, useEffect } from 'react';
import { Button, Separator } from '@heroui/react';
import { ThemeProvider } from '~/contexts/ThemeContext';
import packageJson from '../package.json';

import './styles/tailwind.css';

export const links: LinksFunction = () => [];

const APP_VERSION = packageJson.version;

function LoadingBar() {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 h-1 bg-accent transition-all duration-300 ${
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
      variant="primary"
      size="sm"
      isIconOnly
      className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full"
      onPress={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </Button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📝</text></svg>" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <LoadingBar />
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
            Skip to content
          </a>
          <div className="relative isolate mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-3 pb-8 pt-4 sm:px-5 lg:px-6">
            <header className="mb-5">
              <div className="app-shell-panel overflow-hidden rounded-[1.6rem] px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <Link to="/" className="group flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[0.9rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_82%,white),color-mix(in_oklab,var(--warning)_42%,var(--accent)))] text-accent-foreground shadow-[0_18px_34px_-20px_color-mix(in_oklab,var(--accent)_75%,transparent)] transition-transform duration-300 group-hover:-translate-y-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4.75h6.586a2 2 0 011.414.586l2.664 2.664A2 2 0 0118.25 9.414V18A2.25 2.25 0 0116 20.25H8A2.25 2.25 0 015.75 18V7A2.25 2.25 0 018 4.75zm1.75 4.5h6.5m-6.5 4h6.5m-6.5 4h4.25" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                        Markdown Viewer
                      </p>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-medium text-muted">
                    <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
                      {isHomePage ? 'Library' : 'Reader'}
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
                      v{APP_VERSION}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <main id="main-content" className="flex-1">
              <Outlet />
            </main>
            <Separator className="mb-4 mt-10 opacity-60" />
            <footer className="px-1 py-2 text-sm text-muted">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p>Markdown Viewer</p>
                <p>v{APP_VERSION}</p>
              </div>
            </footer>
          </div>
          <ScrollToTopButton />
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
