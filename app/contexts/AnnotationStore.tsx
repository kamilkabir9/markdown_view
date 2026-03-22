import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
}

export interface Annotation {
  id: string;
  anchor: Anchor | null;
  text: string;
  createdAt: string;
  isGlobal?: boolean;
}

interface AnnotationStoreContextType {
  annotations: Annotation[];
  addAnnotation: (anchor: Anchor | null, text: string, isGlobal?: boolean) => void;
  updateAnnotationText: (id: string, text: string) => void;
  removeAnnotation: (id: string) => void;
}

const AnnotationStoreContext = createContext<AnnotationStoreContextType | null>(null);

function getStorageKey(filePath: string): string {
  return `annotations:${filePath}`;
}

function loadAnnotations(filePath: string): Annotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(filePath));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveAnnotations(filePath: string, annotations: Annotation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(filePath), JSON.stringify(annotations));
  } catch {}
}

export function AnnotationStoreProvider({ children, filePath }: { children: ReactNode; filePath: string }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setAnnotations(loadAnnotations(filePath));
    setIsHydrated(true);
  }, [filePath]);

  useEffect(() => {
    if (!isHydrated) return;
    saveAnnotations(filePath, annotations);
  }, [filePath, annotations, isHydrated]);

  const addAnnotation = useCallback((anchor: Anchor | null, text: string, isGlobal = false) => {
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      anchor,
      text,
      createdAt: new Date().toISOString(),
      isGlobal,
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAnnotationText = useCallback((id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((annotation) =>
        annotation.id === id ? { ...annotation, text } : annotation,
      ),
    );
  }, []);

  return (
    <AnnotationStoreContext.Provider
      value={{
        annotations,
        addAnnotation,
        updateAnnotationText,
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
