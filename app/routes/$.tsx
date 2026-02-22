import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link, useParams, useRouteError, isRouteErrorResponse } from 'react-router';
import { getMarkdownContent } from '~/utils/files.server';
import { useTheme } from '~/contexts/ThemeContext';
import { AnnotationStoreProvider } from '~/contexts/AnnotationStore';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { LineAnnotatedMarkdown } from '~/components/LineAnnotatedMarkdown';
import { AnnotationErrorBoundary } from '~/components/AnnotationErrorBoundary';
import '~/styles/themes.css';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.path ? `${data.path} - Markdown Viewer` : 'File Not Found' },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const path = params['*'] || '';
  const result = await getMarkdownContent(path);
  
  if (!result) {
    throw new Response('Not Found', { status: 404 });
  }
  
  return result;
}

export default function MarkdownPage() {
  const { content } = useLoaderData<typeof loader>();
  const params = useParams();
  const title = params['*']?.split('/').pop() || 'Untitled';
  const { theme } = useTheme();

  const themeClass = theme === 'default' ? '' : `markdown-theme-${theme}`;
  const proseClass = theme === 'default' ? 'prose prose-slate max-w-none' : '';

  return (
    <AnnotationStoreProvider>
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{title}</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Link to="/" className="btn btn-ghost btn-sm">
              ← Back to files
            </Link>
          </div>
        </div>
      </header>

      <main className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <article>
            <AnnotationErrorBoundary>
              <LineAnnotatedMarkdown
                content={content}
                proseClass={proseClass}
                themeClass={themeClass}
              />
            </AnnotationErrorBoundary>
          </article>
        </div>
      </main>
    </AnnotationStoreProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="text-center py-12">
        <div className="alert alert-error">
          <div>
            <h2 className="text-xl font-bold">404 - File Not Found</h2>
            <p>The requested markdown file could not be found.</p>
          </div>
        </div>
        <Link to="/" className="btn btn-primary mt-6">
          ← Back to file list
        </Link>
      </div>
    );
  }

  console.error('Route error:', error);
  
  return (
    <div className="text-center py-12">
      <div className="alert alert-error">
        <div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p>An unexpected error occurred. Please try refreshing the page.</p>
        </div>
      </div>
      <Link to="/" className="btn btn-primary mt-6">
        ← Back to file list
      </Link>
    </div>
  );
}
