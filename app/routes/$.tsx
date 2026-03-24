import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { Alert, Breadcrumbs, Button, Surface } from '@heroui/react';
import { LineAnnotatedMarkdown } from '~/components/LineAnnotatedMarkdown';
import { AnnotationErrorBoundary } from '~/components/AnnotationErrorBoundary';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';
import { AnnotationStoreProvider } from '~/contexts/AnnotationStore';
import { useTheme } from '~/contexts/ThemeContext';
import { getMarkdownContent } from '~/utils/files.server';
import '~/styles/themes.css';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data?.sourcePath ? `${data.sourcePath} - Markdown Viewer` : 'File Not Found',
  },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const path = params['*'] || '';
  const result = await getMarkdownContent(path);

  if (!result) {
    throw new Response('Not Found', { status: 404 });
  }

  return result;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

export default function MarkdownPage() {
  const { content, path, sourcePath, size } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const title = sourcePath.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled';
  const themeClass = `markdown-theme-${theme}`;

  return (
    <AnnotationStoreProvider filePath={path}>
      <div className="space-y-6">
        <nav aria-label="Breadcrumb">
          <Breadcrumbs className="gap-2 text-sm">
            <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
            <Breadcrumbs.Item href="/">Markdown Files</Breadcrumbs.Item>
            <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
          </Breadcrumbs>
        </nav>

        <Surface variant="transparent" className="app-shell-panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>

              <p className="mt-4 text-base leading-7 text-muted">
                Rendered from `{sourcePath}`.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted">
                <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                  {formatFileSize(size)}
                </span>
                <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                  {estimateReadTime(content)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <ThemeSwitcher />
              <Button variant="secondary" className="rounded-full px-4" onPress={() => navigate('/')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to files
              </Button>
            </div>
          </div>
        </Surface>

        <AnnotationErrorBoundary>
          <LineAnnotatedMarkdown content={content} proseClass="" themeClass={themeClass} />
        </AnnotationErrorBoundary>
      </div>
    </AnnotationStoreProvider>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <Breadcrumbs className="gap-2 text-sm">
          <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/">Markdown Files</Breadcrumbs.Item>
          <Breadcrumbs.Item>Error</Breadcrumbs.Item>
        </Breadcrumbs>
      </nav>

      <Surface variant="transparent" className="app-shell-panel rounded-[2rem] p-8 text-center sm:p-10">
        <div className="mx-auto max-w-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--danger)_78%,white),color-mix(in_oklab,var(--warning)_38%,var(--danger)))] text-danger-foreground shadow-[0_24px_48px_-28px_color-mix(in_oklab,var(--danger)_70%,transparent)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>

          <div>
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted">{description}</p>
          </div>

          <Alert status="danger" className="text-left">
            <Alert.Content>
              <Alert.Title>Reader unavailable</Alert.Title>
              <Alert.Description>
                Head back to the file list and choose another document, or verify the markdown file still exists.
              </Alert.Description>
            </Alert.Content>
          </Alert>

          <div className="flex justify-center">
            <Button className="rounded-full px-5" onPress={() => navigate('/')}>
              Back to file list
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorState
        title="404 - File not found"
        description="The markdown file you requested is no longer available at this path."
      />
    );
  }

  console.error('Route error:', error);

  return (
    <ErrorState
      title="Something went wrong"
      description="An unexpected error interrupted the reader before this document could finish loading."
    />
  );
}
