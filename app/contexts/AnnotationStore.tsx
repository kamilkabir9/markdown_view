import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  createComment,
  deleteComment,
  fetchComments,
  getErrorMessage,
  importComments,
  updateComment,
} from '~/lib/api';

export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
  rangeStart?: number;
  rangeEnd?: number;
  headingPath?: string[];
  fallbackLine?: number;
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
  isLoading: boolean;
  error: string | null;
  addAnnotation: (anchor: Anchor | null, text: string, isGlobal?: boolean) => Promise<void>;
  updateAnnotationText: (id: string, text: string) => Promise<void>;
  removeAnnotation: (id: string) => Promise<void>;
}

const AnnotationStoreContext = createContext<AnnotationStoreContextType | null>(null);

function getLegacyStorageKey(filePath: string): string {
  return `annotations:${filePath}`;
}

function loadLegacyAnnotations(filePath: string): Annotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getLegacyStorageKey(filePath));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function clearLegacyAnnotations(filePath: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getLegacyStorageKey(filePath));
  } catch {}
}

export function AnnotationStoreProvider({ children, filePath }: { children: ReactNode; filePath: string }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const legacyAnnotations = loadLegacyAnnotations(filePath);

    async function loadServerAnnotations() {
      try {
        setIsLoading(true);
        setError(null);
        const serverAnnotations = await fetchComments(filePath, controller.signal);

        if (legacyAnnotations.length > 0 && serverAnnotations.length === 0) {
          const migratedAnnotations = await importComments(filePath, legacyAnnotations);
          if (!controller.signal.aborted) {
            setAnnotations(migratedAnnotations);
            clearLegacyAnnotations(filePath);
          }
          return;
        }

        if (!controller.signal.aborted) {
          setAnnotations(serverAnnotations);
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setAnnotations(legacyAnnotations);
        setError(getErrorMessage(requestError, 'Comments could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadServerAnnotations();

    return () => controller.abort();
  }, [filePath]);

  const addAnnotation = useCallback(async (anchor: Anchor | null, text: string, isGlobal = false) => {
    const optimisticAnnotation: Annotation = {
      id: crypto.randomUUID(),
      anchor,
      text,
      createdAt: new Date().toISOString(),
      isGlobal,
    };

    setError(null);
    setAnnotations((prev) => [...prev, optimisticAnnotation]);

    try {
      const savedAnnotation = await createComment(filePath, optimisticAnnotation);
      setAnnotations((prev) => prev.map((annotation) => (
        annotation.id === optimisticAnnotation.id ? savedAnnotation : annotation
      )));
    } catch (requestError) {
      setAnnotations((prev) => prev.filter((annotation) => annotation.id !== optimisticAnnotation.id));
      setError(getErrorMessage(requestError, 'Comment could not be saved.'));
    }
  }, [filePath]);

  const removeAnnotation = useCallback(async (id: string) => {
    let removedAnnotation: Annotation | null = null;

    setError(null);
    setAnnotations((prev) => {
      removedAnnotation = prev.find((annotation) => annotation.id === id) ?? null;
      return prev.filter((annotation) => annotation.id !== id);
    });

    try {
      await deleteComment(filePath, id);
    } catch (requestError) {
      if (removedAnnotation) {
        setAnnotations((prev) => [...prev, removedAnnotation as Annotation]);
      }
      setError(getErrorMessage(requestError, 'Comment could not be removed.'));
    }
  }, [filePath]);

  const updateAnnotationText = useCallback(async (id: string, text: string) => {
    let previousText = '';

    setError(null);
    setAnnotations((prev) => prev.map((annotation) => {
      if (annotation.id === id) {
        previousText = annotation.text;
        return { ...annotation, text };
      }
      return annotation;
    }));

    try {
      const savedAnnotation = await updateComment(filePath, id, text);
      setAnnotations((prev) => prev.map((annotation) => (
        annotation.id === id ? savedAnnotation : annotation
      )));
    } catch (requestError) {
      setAnnotations((prev) => prev.map((annotation) => (
        annotation.id === id ? { ...annotation, text: previousText } : annotation
      )));
      setError(getErrorMessage(requestError, 'Comment could not be updated.'));
    }
  }, [filePath]);

  return (
    <AnnotationStoreContext.Provider
      value={{
        annotations,
        isLoading,
        error,
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
