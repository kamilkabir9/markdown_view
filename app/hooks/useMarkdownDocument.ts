import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchFile, getErrorMessage, saveFile, type MarkdownFile } from '~/lib/api';

const RESUME_EDIT_AFTER_SAVE_PATH_KEY = 'resume-edit-after-save-path';

function markResumeEditAfterSave(routePath: string): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY, routePath);
  } catch {}
}

function clearResumeEditAfterSave(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY);
  } catch {}
}

function consumeResumeEditAfterSave(routePath: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const savedRoutePath = sessionStorage.getItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY);
    sessionStorage.removeItem(RESUME_EDIT_AFTER_SAVE_PATH_KEY);
    return savedRoutePath === routePath;
  } catch {
    return false;
  }
}

interface UseMarkdownDocumentOptions {
  routePath: string;
  returnToPreviewAfterSave: boolean;
  onEnterEditingLayout: () => void;
}

export function useMarkdownDocument({
  routePath,
  returnToPreviewAfterSave,
  onEnterEditingLayout,
}: UseMarkdownDocumentOptions) {
  const wasEditingRef = useRef(false);
  const returnToPreviewAfterSaveRef = useRef(returnToPreviewAfterSave);
  const onEnterEditingLayoutRef = useRef(onEnterEditingLayout);
  const [file, setFile] = useState<MarkdownFile | null>(null);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    returnToPreviewAfterSaveRef.current = returnToPreviewAfterSave;
  }, [returnToPreviewAfterSave]);

  useEffect(() => {
    onEnterEditingLayoutRef.current = onEnterEditingLayout;
  }, [onEnterEditingLayout]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMarkdownFile() {
      try {
        setIsLoading(true);
        setError(null);
        setSaveError(null);
        setSaveStatus('idle');

        const response = await fetchFile(routePath, controller.signal);
        if (controller.signal.aborted) return;

        const shouldResumeEditAfterSave = consumeResumeEditAfterSave(routePath);
        setFile(response);
        setDraft(response.content);
        if (shouldResumeEditAfterSave && !returnToPreviewAfterSaveRef.current) {
          onEnterEditingLayoutRef.current();
        }
        setIsEditing(shouldResumeEditAfterSave && !returnToPreviewAfterSaveRef.current);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setFile(null);
        setError(getErrorMessage(requestError, 'The markdown file could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadMarkdownFile();

    return () => controller.abort();
  }, [routePath]);

  const refreshPreviewFile = useCallback(async () => {
    try {
      const response = await fetchFile(routePath);
      setFile(response);
      setDraft(response.content);
      setError(null);
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError, 'The markdown preview could not be refreshed.'));
    }
  }, [routePath]);

  useEffect(() => {
    if (isLoading) {
      wasEditingRef.current = isEditing;
      return;
    }

    if (wasEditingRef.current && !isEditing) {
      void refreshPreviewFile();
    }

    wasEditingRef.current = isEditing;
  }, [isEditing, isLoading, refreshPreviewFile]);

  const isDirty = useMemo(() => (file ? draft !== file.content : false), [draft, file]);

  const handleStartEditing = useCallback(() => {
    if (!file) return;
    setDraft(file.content);
    setSaveError(null);
    setSaveStatus('idle');
    onEnterEditingLayoutRef.current();
    setIsEditing(true);
  }, [file]);

  const handleCancelEditing = useCallback((): boolean => {
    if (!file) return false;
    setDraft(file.content);
    setSaveError(null);
    setSaveStatus('idle');
    setIsEditing(false);
    return true;
  }, [file]);

  const handleSave = useCallback(async () => {
    if (!file || !isDirty || isSaving) return false;

    try {
      setIsSaving(true);
      setSaveError(null);
      const savedFile = await saveFile(file.path, draft);
      setFile(savedFile);
      setDraft(savedFile.content);
      setSaveStatus('saved');

      const shouldReturnToPreview = returnToPreviewAfterSaveRef.current;
      if (shouldReturnToPreview) {
        clearResumeEditAfterSave();
        setIsEditing(false);
      } else {
        markResumeEditAfterSave(routePath);
        setIsEditing(true);
      }
      return true;
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError, 'The markdown file could not be saved.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draft, file, isDirty, isSaving, routePath]);

  useEffect(() => {
    if (!isEditing || !isDirty || saveStatus !== 'saved') {
      return;
    }

    setSaveStatus('idle');
  }, [isDirty, isEditing, saveStatus]);

  return {
    file,
    setFile,
    draft,
    setDraft,
    isLoading,
    isEditing,
    isSaving,
    error,
    saveError,
    setSaveError,
    saveStatus,
    isDirty,
    handleStartEditing,
    handleCancelEditing,
    handleSave,
  };
}
