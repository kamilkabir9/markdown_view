import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { useTheme } from '~/contexts/ThemeContext';
import { cn } from '~/lib/utils';

interface MarkdownSourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MarkdownSourceEditor({ value, onChange, className }: MarkdownSourceEditorProps) {
  const { theme } = useTheme();

  return (
    <div className={cn('markdown-source-editor app-shell-panel h-full overflow-auto rounded-md', className)}>
      <CodeMirror
        value={value}
        height="100%"
        basicSetup={{
          foldGutter: false,
          lineNumbers: true,
          highlightActiveLineGutter: false,
        }}
        extensions={[markdown()]}
        onChange={onChange}
        className="text-[15px]"
        theme={theme === 'dark' ? 'dark' : 'light'}
        style={{ fontSize: '15px' }}
      />
    </div>
  );
}
