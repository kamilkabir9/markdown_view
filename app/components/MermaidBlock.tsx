import { useEffect, useId, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';

interface MermaidBlockProps {
  code: string;
  isDarkTheme: boolean;
}

export function MermaidBlock({ code, isDarkTheme }: MermaidBlockProps) {
  const renderId = useId();
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'render' | 'raw'>('render');

  useEffect(() => {
    let cancelled = false;
    setSvgMarkup(null);
    setErrorMessage(null);

    import('mermaid')
      .then(async (module) => {
        const mermaid = module.default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDarkTheme ? 'dark' : 'default',
        });

        const { svg } = await mermaid.render(`mermaid-${renderId.replace(/:/g, '-')}`, code);
        if (cancelled) return;

        setSvgMarkup(svg);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : 'Unable to render Mermaid diagram.';
        setSvgMarkup(null);
        setErrorMessage(message);
      });

    return () => {
      cancelled = true;
    };
  }, [code, isDarkTheme, renderId]);

  return (
    <div className="relative my-4">
      <div className="pointer-events-none absolute top-0 right-0 z-10 p-2">
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="pointer-events-auto rounded-sm border border-border/70 bg-surface/90"
          onClick={() => setViewMode((current) => (current === 'raw' ? 'render' : 'raw'))}
        >
          {viewMode === 'raw' ? 'Render' : 'Raw'}
        </Button>
      </div>

      {viewMode === 'raw' ? (
        <pre className="overflow-x-auto rounded-sm border border-border/65 bg-background px-4 py-3 text-sm leading-6">
          <code>{code}</code>
        </pre>
      ) : (
        <>
          {errorMessage ? (
            <Alert variant="destructive" className="rounded-sm shadow-none">
              <AlertTitle>Diagram render failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-border/65 bg-background px-4 py-3 select-none" aria-label="Rendered Mermaid diagram">
              {svgMarkup ? (
                <div className="min-w-max" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
              ) : (
                <div className="text-sm text-muted-foreground">Rendering diagram...</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
