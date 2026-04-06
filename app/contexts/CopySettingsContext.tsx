import { createContext, useContext, useEffect, useState, type ReactElement, type ReactNode } from 'react';

interface CopySettingsContextValue {
  contextPrefix: string;
  commentPrefix: string;
  commentsDelimiter: string;
  pathMode: CopyPathMode;
  setContextPrefix: (value: string) => void;
  setCommentPrefix: (value: string) => void;
  setCommentsDelimiter: (value: string) => void;
  setPathMode: (value: CopyPathMode) => void;
}

export type CopyPathMode = 'relative' | 'full';

const DEFAULT_CONTEXT_PREFIX = 'Context';
const DEFAULT_COMMENT_PREFIX = 'Comment';
const DEFAULT_COMMENTS_DELIMITER = '---';
const DEFAULT_PATH_MODE: CopyPathMode = 'relative';
const CONTEXT_PREFIX_KEY = 'copy-context-prefix';
const COMMENT_PREFIX_KEY = 'copy-comment-prefix';
const COMMENTS_DELIMITER_KEY = 'copy-comments-delimiter';
const PATH_MODE_KEY = 'copy-path-mode';

const CopySettingsContext = createContext<CopySettingsContextValue | undefined>(undefined);

function normalizePrefix(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getInitialPrefix(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return normalizePrefix(stored, fallback);
  } catch {
    return fallback;
  }
}

function getInitialPathMode(): CopyPathMode {
  if (typeof window === 'undefined') return DEFAULT_PATH_MODE;

  try {
    const stored = localStorage.getItem(PATH_MODE_KEY);
    return stored === 'full' ? 'full' : 'relative';
  } catch {
    return DEFAULT_PATH_MODE;
  }
}

export function CopySettingsProvider({ children }: { children: ReactNode }): ReactElement {
  const [contextPrefix, setContextPrefix] = useState<string>(() => getInitialPrefix(CONTEXT_PREFIX_KEY, DEFAULT_CONTEXT_PREFIX));
  const [commentPrefix, setCommentPrefix] = useState<string>(() => getInitialPrefix(COMMENT_PREFIX_KEY, DEFAULT_COMMENT_PREFIX));
  const [commentsDelimiter, setCommentsDelimiter] = useState<string>(() => getInitialPrefix(COMMENTS_DELIMITER_KEY, DEFAULT_COMMENTS_DELIMITER));
  const [pathMode, setPathMode] = useState<CopyPathMode>(getInitialPathMode);

  useEffect(() => {
    try {
      localStorage.setItem(CONTEXT_PREFIX_KEY, normalizePrefix(contextPrefix, DEFAULT_CONTEXT_PREFIX));
      localStorage.setItem(COMMENT_PREFIX_KEY, normalizePrefix(commentPrefix, DEFAULT_COMMENT_PREFIX));
      localStorage.setItem(COMMENTS_DELIMITER_KEY, normalizePrefix(commentsDelimiter, DEFAULT_COMMENTS_DELIMITER));
      localStorage.setItem(PATH_MODE_KEY, pathMode);
    } catch {}
  }, [commentPrefix, commentsDelimiter, contextPrefix, pathMode]);

  const value: CopySettingsContextValue = {
    contextPrefix,
    commentPrefix,
    commentsDelimiter,
    pathMode,
    setContextPrefix,
    setCommentPrefix,
    setCommentsDelimiter,
    setPathMode,
  };

  return <CopySettingsContext.Provider value={value}>{children}</CopySettingsContext.Provider>;
}

export function useCopySettings(): CopySettingsContextValue {
  const context = useContext(CopySettingsContext);

  if (!context) {
    throw new Error('useCopySettings must be used within a CopySettingsProvider');
  }

  return context;
}

export function getCopyFormatFallbacks(): { context: string; comment: string; delimiter: string; pathMode: CopyPathMode } {
  return {
    context: DEFAULT_CONTEXT_PREFIX,
    comment: DEFAULT_COMMENT_PREFIX,
    delimiter: DEFAULT_COMMENTS_DELIMITER,
    pathMode: DEFAULT_PATH_MODE,
  };
}
