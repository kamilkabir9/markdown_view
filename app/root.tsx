import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import type { LinksFunction } from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { ThemeProvider } from '~/contexts/ThemeContext';

import './styles/tailwind.css';

export const links: LinksFunction = () => [];

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
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="max-w-4xl mx-auto p-4 py-8">
        <Outlet />
        <footer className="mt-8 pt-6 border-t border-border text-center text-muted text-sm">
          <p>Served by Markdown Viewer • Built with React Router v7 & Bun</p>
        </footer>
      </div>
      <ScrollToTopButton />
    </ThemeProvider>
  );
}
