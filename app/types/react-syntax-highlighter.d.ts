declare module 'react-syntax-highlighter' {
  import { ReactNode } from 'react';
  
  interface SyntaxHighlighterProps {
    children: string | ReactNode;
    language?: string;
    style?: Record<string, any>;
    PreTag?: string | React.ComponentType<any>;
    className?: string;
    showLineNumbers?: boolean;
    wrapLines?: boolean;
    lineNumberContainerStyle?: Record<string, any>;
    lineNumberStyle?: Record<string, any>;
    [key: string]: any;
  }

  export const Prism: React.FC<SyntaxHighlighterProps>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: Record<string, any>;
  export const dracula: Record<string, any>;
  export const atomDark: Record<string, any>;
  export const materialDark: Record<string, any>;
  export const oneDark: Record<string, any>;
}
