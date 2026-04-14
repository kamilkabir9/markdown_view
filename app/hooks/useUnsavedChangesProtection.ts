import { useEffect } from 'react';
import { useBlocker } from 'react-router';

interface UseUnsavedChangesProtectionOptions {
  isEditing: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export function useUnsavedChangesProtection({
  isEditing,
  isDirty,
  isSaving,
  onSave,
}: UseUnsavedChangesProtectionOptions): void {
  const shouldBlockNavigation = isEditing && isDirty && !isSaving;
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!shouldBlockNavigation) return false;

    return currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search;
  });

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked') {
      return;
    }

    const shouldLeave = window.confirm('You have unsaved changes. Leave this page and discard them?');

    if (shouldLeave) {
      navigationBlocker.proceed();
      return;
    }

    navigationBlocker.reset();
  }, [navigationBlocker]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!isEditing || !isDirty || isSaving) {
        return;
      }

      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();
      void onSave();
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [isDirty, isEditing, isSaving, onSave]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isEditing || !isDirty) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isEditing]);
}
