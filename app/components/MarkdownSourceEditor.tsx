import { StateEffect, StateField } from '@codemirror/state';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useTheme } from '~/contexts/ThemeContext';
import { cn } from '~/lib/utils';

interface MarkdownSourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export interface MarkdownSourceEditorHandle {
  insertText: (text: string) => boolean;
  scrollToOffset: (offset: number) => boolean;
  getScrollDOM: () => HTMLElement | null;
}

const flashLineEffect = StateEffect.define<number>();
const clearFlashLineEffect = StateEffect.define<void>();

const flashLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let nextDecorations = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (effect.is(flashLineEffect)) {
        const line = transaction.state.doc.lineAt(effect.value);
        nextDecorations = Decoration.set([
          Decoration.line({ class: 'cm-jump-flash-line' }).range(line.from),
        ]);
      }

      if (effect.is(clearFlashLineEffect)) {
        nextDecorations = Decoration.none;
      }
    }

    return nextDecorations;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

export const MarkdownSourceEditor = forwardRef<MarkdownSourceEditorHandle, MarkdownSourceEditorProps>(function MarkdownSourceEditor(
  { value, onChange, className },
  ref,
) {
  const { theme } = useTheme();
  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const scrollBehaviorTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      if (scrollBehaviorTimeoutRef.current !== null) {
        window.clearTimeout(scrollBehaviorTimeoutRef.current);
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    insertText(text) {
      const view = editorRef.current?.view;
      if (!view) return false;

      const selection = view.state.selection.main;
      const insertionEnd = selection.from + text.length;

      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: text,
        },
        selection: {
          anchor: insertionEnd,
          head: insertionEnd,
        },
        scrollIntoView: true,
      });
      view.focus();
      return true;
    },
    scrollToOffset(offset) {
      const view = editorRef.current?.view;
      if (!view) return false;

      const safeOffset = Math.max(0, Math.min(offset, view.state.doc.length));
      const previousScrollBehavior = view.scrollDOM.style.scrollBehavior;
      view.scrollDOM.style.scrollBehavior = 'smooth';

      view.dispatch({
        selection: { anchor: safeOffset, head: safeOffset },
        scrollIntoView: true,
        effects: flashLineEffect.of(safeOffset),
      });

      if (scrollBehaviorTimeoutRef.current !== null) {
        window.clearTimeout(scrollBehaviorTimeoutRef.current);
      }
      scrollBehaviorTimeoutRef.current = window.setTimeout(() => {
        const currentView = editorRef.current?.view;
        if (!currentView) return;
        currentView.scrollDOM.style.scrollBehavior = previousScrollBehavior;
      }, 260);

      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = window.setTimeout(() => {
        const currentView = editorRef.current?.view;
        if (!currentView) return;
        currentView.dispatch({ effects: clearFlashLineEffect.of(undefined) });
      }, 1200);

      view.focus();
      return true;
    },
    getScrollDOM() {
      return editorRef.current?.view?.scrollDOM ?? null;
    },
  }), []);

  return (
    <div className={cn('markdown-source-editor app-shell-panel h-full min-h-0 min-w-0 overflow-auto rounded-md', className)}>
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        basicSetup={{
          foldGutter: false,
          lineNumbers: true,
          highlightActiveLineGutter: false,
        }}
        extensions={[
          markdown(),
          flashLineField,
          EditorView.theme({
            '.cm-line.cm-jump-flash-line': {
              backgroundColor: 'color-mix(in oklab, var(--color-warning) 14%, transparent)',
              transition: 'background-color 1.1s ease-out',
            },
          }),
        ]}
        onChange={onChange}
        className="text-[15px]"
        theme={theme === 'dark' ? 'dark' : 'light'}
        style={{ fontSize: '15px' }}
      />
    </div>
  );
});
