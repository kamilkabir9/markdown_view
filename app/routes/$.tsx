import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link, useParams } from 'react-router';
import { getMarkdownContent } from '~/utils/files.server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import { type ReactNode, type ComponentPropsWithoutRef } from 'react';

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  children?: ReactNode;
  className?: string;
}

const components = {
  code({ children, className }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div">
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className}>{children}</code>
    );
  },
};

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

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{title}</h1>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Back to files
          </Link>
        </div>
      </header>

      <main className="card bg-base-100 shadow-xl">
        <div className="card-body prose prose-slate max-w-none prose-pre:p-0 prose-pre:bg-transparent">
          <article>
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
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
