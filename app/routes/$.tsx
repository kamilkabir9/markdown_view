import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link, useNavigate, useParams, useRouteError, isRouteErrorResponse } from 'react-router';
import { getMarkdownContent } from '~/utils/files.server';
import { useTheme } from '~/contexts/ThemeContext';
import { AnnotationStoreProvider } from '~/contexts/AnnotationStore';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { LineAnnotatedMarkdown } from '~/components/LineAnnotatedMarkdown';
import { AnnotationErrorBoundary } from '~/components/AnnotationErrorBoundary';
import { Button, Alert, Breadcrumbs } from '@heroui/react';
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
  const navigate = useNavigate();
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
            <Button variant="ghost" size="sm" onPress={() => navigate('/')}>
              Back to files
            </Button>
          </div>
        </div>
      </header>

      <AnnotationErrorBoundary>
        <LineAnnotatedMarkdown
          content={content}
          proseClass={proseClass}
          themeClass={themeClass}
        />
      </AnnotationErrorBoundary>
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
