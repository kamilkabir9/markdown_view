import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
}

export interface Annotation {
  id: string;
  anchor: Anchor;
  text: string;
  createdAt: Date;
}

interface AnnotationStoreContextType {
  annotations: Annotation[];
  addAnnotation: (anchor: Anchor, text: string) => void;
  removeAnnotation: (id: string) => void;
}

const AnnotationStoreContext = createContext<AnnotationStoreContextType | null>(null);

export function AnnotationStoreProvider({ children }: { children: ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const addAnnotation = useCallback((anchor: Anchor, text: string) => {
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      anchor,
      text,
      createdAt: new Date(),
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <AnnotationStoreContext.Provider
      value={{
        annotations,
        addAnnotation,
        removeAnnotation,
      }}
    >
      {children}
    </AnnotationStoreContext.Provider>
  );
}

export function useAnnotationStore() {
  const context = useContext(AnnotationStoreContext);
  if (!context) {
    throw new Error('useAnnotationStore must be used within an AnnotationStoreProvider');
  }
  return context;
}
