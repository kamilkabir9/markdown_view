import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link, useParams } from 'react-router';
import { getMarkdownContent } from '~/utils/files.server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '~/contexts/ThemeContext';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
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
    <>
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
        <div className={`card-body ${proseClass} ${themeClass}`}>
          <article>
            <Markdown remarkPlugins={[remarkGfm]}>
              {content}
            </Markdown>
          </article>
        </div>
      </main>
    </>
  );
}

export function ErrorBoundary() {
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
