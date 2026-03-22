import { createContext, useContext, useState, useEffect, type ReactNode, type ReactElement } from 'react';

export type Theme = 'github' | 'dark' | 'minimal' | 'default';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES = new Set<Theme>(['github', 'dark', 'minimal', 'default']);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'default';
  try {
    const saved = localStorage.getItem('markdown-theme');
    if (saved && VALID_THEMES.has(saved as Theme)) return saved as Theme;
  } catch {}
  return 'default';
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('markdown-theme', theme);
    } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
