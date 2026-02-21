import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import type { LinksFunction } from 'react-router';
import { ThemeProvider } from '~/contexts/ThemeContext';

import './styles/tailwind.css';

export const links: LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-base-200">
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
        <footer className="mt-8 pt-6 border-t border-base-300 text-center text-base-content/60 text-sm">
          <p>Served by Markdown Viewer • Built with React Router v7 & Bun</p>
        </footer>
      </div>
    </ThemeProvider>
  );
}
