import { createContext, useContext, useState, type ReactNode, type ReactElement } from 'react';

interface AppChromeContextType {
  breadcrumbs: ReactNode;
  actions: ReactNode;
  setBreadcrumbs: (breadcrumbs: ReactNode) => void;
  setActions: (actions: ReactNode) => void;
}

const AppChromeContext = createContext<AppChromeContextType | undefined>(undefined);

export function AppChromeProvider({ children }: { children: ReactNode }): ReactElement {
  const [breadcrumbs, setBreadcrumbs] = useState<ReactNode>(null);
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <AppChromeContext.Provider value={{ breadcrumbs, actions, setBreadcrumbs, setActions }}>
      {children}
    </AppChromeContext.Provider>
  );
}

export function useAppChrome(): AppChromeContextType {
  const context = useContext(AppChromeContext);

  if (context === undefined) {
    throw new Error('useAppChrome must be used within an AppChromeProvider');
  }

  return context;
}
