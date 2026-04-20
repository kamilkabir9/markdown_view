import { forwardRef, useMemo } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { MermaidBlock } from '~/components/MermaidBlock';
import { useTheme } from '~/contexts/ThemeContext';
import { resolveContentAssetUrl } from '~/lib/content-assets';
import { cn } from '~/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  documentSourcePath?: string;
  className?: string;
}

export const MarkdownPreview = forwardRef<HTMLElement, MarkdownPreviewProps>(function MarkdownPreview(
  { content, documentSourcePath, className },
  ref,
) {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  const components = useMemo<Components>(() => ({
    a(props) {
      const href = props.href ?? '';
      const isExternal = /^https?:\/\//i.test(href);

      return (
        <a
          {...props}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        />
      );
    },
    code(props) {
      const { children, className: codeClassName, ...rest } = props;
      const match = /language-([\w-]+)/.exec(codeClassName ?? '');
      const language = match?.[1]?.toLowerCase();
      const code = String(children).replace(/\n$/, '');

      if (language === 'mermaid') {
        return <MermaidBlock code={code} isDarkTheme={isDarkTheme} />;
      }

      return (
        <code {...rest} className={codeClassName}>
          {children}
        </code>
      );
    },
    img(props) {
      const src = resolveContentAssetUrl(documentSourcePath ?? '', typeof props.src === 'string' ? props.src : undefined);

      return (
        <img
          {...props}
          src={src ?? props.src}
          loading="lazy"
          className="max-h-[32rem] w-auto max-w-full rounded-sm border border-border/60"
        />
      );
    },
  }), [documentSourcePath, isDarkTheme]);

  return (
    <article ref={ref} className={cn('app-shell-panel scrollbar-on-active markdown-article min-h-0 overflow-y-auto rounded-md px-5 py-4 sm:px-6', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
});
