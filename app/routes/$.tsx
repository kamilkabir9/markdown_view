import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '~/components/ui/breadcrumb';
import { Button } from '~/components/ui/button';
import { LineAnnotatedMarkdown } from '~/components/LineAnnotatedMarkdown';
import { AnnotationErrorBoundary } from '~/components/AnnotationErrorBoundary';
import { AnnotationStoreProvider } from '~/contexts/AnnotationStore';
import { useTheme } from '~/contexts/ThemeContext';
import { fetchFile, getErrorMessage, type MarkdownFile } from '~/lib/api';
import '~/styles/themes.css';

export default function MarkdownPage() {
  const params = useParams();
  const { theme } = useTheme();
  const [file, setFile] = useState<MarkdownFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const themeClass = `markdown-theme-${theme}`;

  useEffect(() => {
    const routePath = params['*'] || '';
    const controller = new AbortController();

    async function loadFile() {
      try {
        setIsLoading(true);
        setError(null);
        const nextFile = await fetchFile(routePath, controller.signal);
        setFile(nextFile);
        document.title = `${nextFile.sourcePath} - Markdown Viewer`;
      } catch (requestError) {
        if (controller.signal.aborted) return;

        const status = requestError && typeof requestError === 'object' && 'status' in requestError
          ? requestError.status
          : undefined;

        if (status === 404) {
          document.title = 'File Not Found - Markdown Viewer';
          setError({
            title: '404 - File not found',
            description: 'The markdown file you requested is no longer available at this path.',
          });
        } else {
          document.title = 'Reader Error - Markdown Viewer';
          setError({
            title: 'Something went wrong',
            description: getErrorMessage(requestError, 'An unexpected error interrupted the reader before this document could finish loading.'),
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFile();

    return () => controller.abort();
  }, [params['*']]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="app-shell-panel rounded-md p-8 sm:p-10">
          <div className="max-w-xl space-y-4 text-left">
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
              Loading document...
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Fetching markdown content from the API.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <ErrorState
        title={error?.title || 'Something went wrong'}
        description={error?.description || 'An unexpected error interrupted the reader before this document could finish loading.'}
      />
    );
  }

  return (
    <AnnotationStoreProvider filePath={file.path}>
      <div className="space-y-5">
        <AnnotationErrorBoundary>
          <LineAnnotatedMarkdown
            content={file.content}
            proseClass=""
            themeClass={themeClass}
            relativeFilePath={file.sourcePath}
            fullFilePath={file.absolutePath}
          />
        </AnnotationErrorBoundary>
      </div>
    </AnnotationStoreProvider>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/" />}>Markdown Files</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Error</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="app-shell-panel rounded-md p-8 sm:p-10">
        <div className="max-w-xl space-y-5 text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-destructive/30 bg-surface text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>

          <div>
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
          </div>

          <Alert variant="destructive" className="rounded-sm text-left shadow-none">
            <AlertTitle>Reader unavailable</AlertTitle>
            <AlertDescription>
              Head back to the file list and choose another document, or verify the markdown file still exists.
            </AlertDescription>
          </Alert>

          <div className="flex">
            <Button className="rounded-sm px-5" onClick={() => navigate('/')}>
              Back to file list
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
