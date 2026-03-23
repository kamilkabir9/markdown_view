import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from 'react-router';
import type { LinksFunction } from 'react-router';
import { useState, useEffect } from 'react';
import { Button, Separator } from '@heroui/react';
import { ThemeProvider } from '~/contexts/ThemeContext';

import './styles/tailwind.css';

export const links: LinksFunction = () => [];

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
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📝</text></svg>" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <LoadingBar />
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:rounded-lg">
            Skip to content
          </a>
          <div className="max-w-4xl mx-auto p-4 py-8">
            <main id="main-content">
              <Outlet />
            </main>
            <Separator className="mt-8 mb-4" />
            <footer className="text-center text-muted text-sm">
              <p>Served by Markdown Viewer · Built with React Router v7 & Node.js</p>
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
