import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link, useParams, useRouteError, isRouteErrorResponse } from 'react-router';
import { getMarkdownContent } from '~/utils/files.server';
import { useTheme } from '~/contexts/ThemeContext';
import { AnnotationStoreProvider } from '~/contexts/AnnotationStore';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { LineAnnotatedMarkdown } from '~/components/LineAnnotatedMarkdown';
import { AnnotationErrorBoundary } from '~/components/AnnotationErrorBoundary';
import { Card, Button, Alert, Breadcrumbs, Tooltip } from '@heroui/react';
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
  const { content, path } = useLoaderData<typeof loader>();
  const params = useParams();
  const title = params['*']?.split('/').pop() || 'Untitled';
  const { theme } = useTheme();

  const themeClass = theme === 'default' ? '' : `markdown-theme-${theme}`;
  const proseClass = theme === 'default' ? 'prose prose-slate max-w-none' : '';

  return (
    <AnnotationStoreProvider filePath={path}>
      <nav aria-label="Breadcrumb" className="mb-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
          <Breadcrumbs.Item>Markdown Files</Breadcrumbs.Item>
          <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
        </Breadcrumbs>
      </nav>

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{title}</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Tooltip delay={0}>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  Back to files
                </Button>
              </Link>
              <Tooltip.Content showArrow placement="bottom">
                <Tooltip.Arrow />
                <p>Return to file list</p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </header>

      <Card>
        <Card.Content>
          <article>
            <AnnotationErrorBoundary>
              <LineAnnotatedMarkdown
                content={content}
                proseClass={proseClass}
                themeClass={themeClass}
              />
            </AnnotationErrorBoundary>
          </article>
        </Card.Content>
      </Card>
    </AnnotationStoreProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="text-center py-12">
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>404 - File Not Found</Alert.Title>
            <Alert.Description>The requested markdown file could not be found.</Alert.Description>
          </Alert.Content>
        </Alert>
        <Link to="/">
          <Button variant="primary" className="mt-6">
            ← Back to file list
          </Button>
        </Link>
      </div>
    );
  }

  console.error('Route error:', error);
  
  return (
    <div className="text-center py-12">
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>Something went wrong</Alert.Title>
          <Alert.Description>An unexpected error occurred. Please try refreshing the page.</Alert.Description>
        </Alert.Content>
      </Alert>
      <Link to="/">
        <Button variant="primary" className="mt-6">
          ← Back to file list
        </Button>
      </Link>
    </div>
  );
}
