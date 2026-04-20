import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
  sectionSlug?: string;
  blockType?: string;
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

type AnnotationMutationSnapshot = {
  previous: Annotation[];
  next: Annotation[];
};

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
  const annotationsRef = useRef<Annotation[]>([]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

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

  const runOptimisticAnnotationMutation = useCallback(async <TResult,>(
    buildNextAnnotations: (previous: Annotation[]) => AnnotationMutationSnapshot,
    commit: (snapshot: AnnotationMutationSnapshot) => Promise<TResult>,
    applyCommittedResult: (result: TResult, snapshot: AnnotationMutationSnapshot) => void,
    fallbackMessage: string,
  ) => {
    const snapshot = buildNextAnnotations(annotationsRef.current);

    setError(null);
    setAnnotations(snapshot.next);
    annotationsRef.current = snapshot.next;

    try {
      const result = await commit(snapshot);
      applyCommittedResult(result, snapshot);
    } catch (requestError) {
      setAnnotations(snapshot.previous);
      annotationsRef.current = snapshot.previous;
      setError(getErrorMessage(requestError, fallbackMessage));
    }
  }, []);

  const addAnnotation = useCallback(async (anchor: Anchor | null, text: string, isGlobal = false) => {
    const optimisticAnnotation: Annotation = {
      id: crypto.randomUUID(),
      anchor,
      text,
      createdAt: new Date().toISOString(),
      isGlobal,
    };

    await runOptimisticAnnotationMutation(
      (previous) => ({
        previous,
        next: [...previous, optimisticAnnotation],
      }),
      () => createComment(filePath, optimisticAnnotation),
      (savedAnnotation) => {
        setAnnotations((current) => current.map((annotation) => (
          annotation.id === optimisticAnnotation.id ? savedAnnotation : annotation
        )));
      },
      'Comment could not be saved.',
    );
  }, [filePath, runOptimisticAnnotationMutation]);

  const removeAnnotation = useCallback(async (id: string) => {
    await runOptimisticAnnotationMutation(
      (previous) => ({
        previous,
        next: previous.filter((annotation) => annotation.id !== id),
      }),
      () => deleteComment(filePath, id),
      () => {},
      'Comment could not be removed.',
    );
  }, [filePath, runOptimisticAnnotationMutation]);

  const updateAnnotationText = useCallback(async (id: string, text: string) => {
    await runOptimisticAnnotationMutation(
      (previous) => ({
        previous,
        next: previous.map((annotation) => (
          annotation.id === id ? { ...annotation, text } : annotation
        )),
      }),
      () => updateComment(filePath, id, text),
      (savedAnnotation) => {
        setAnnotations((current) => current.map((annotation) => (
          annotation.id === id ? savedAnnotation : annotation
        )));
      },
      'Comment could not be updated.',
    );
  }, [filePath, runOptimisticAnnotationMutation]);

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
