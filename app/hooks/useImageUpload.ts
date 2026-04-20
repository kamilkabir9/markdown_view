import { useCallback, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { toast } from 'sonner';
import { deleteImageAsset, getErrorMessage, uploadImageAsset } from '~/lib/api';

interface UseImageUploadOptions {
  documentPath: string | null;
  isEditing: boolean;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  sourceEditorRef: RefObject<{ insertText: (text: string) => boolean } | null>;
  onSaveError: (message: string | null) => void;
}

export function useImageUpload({
  documentPath,
  isEditing,
  setDraft,
  sourceEditorRef,
  onSaveError,
}: UseImageUploadOptions) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedImageMarkdownPathsRef = useRef<string[]>([]);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isImageUploadDragging, setIsImageUploadDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleImageDialogOpenChange = useCallback((open: boolean) => {
    setIsImageDialogOpen(open);
    if (!open) {
      setImageUploadError(null);
      setIsImageUploadDragging(false);
    }
  }, []);

  const handleUndoInsertedImage = useCallback(async ({
    markdownPath,
    insertion,
  }: {
    markdownPath: string;
    insertion: string;
  }) => {
    if (!documentPath) return;

    setDraft((current) => {
      const insertionIndex = current.indexOf(insertion);
      if (insertionIndex < 0) {
        return current;
      }

      return `${current.slice(0, insertionIndex)}${current.slice(insertionIndex + insertion.length)}`;
    });

    try {
      await deleteImageAsset(documentPath, markdownPath);
      uploadedImageMarkdownPathsRef.current = uploadedImageMarkdownPathsRef.current.filter((path) => path !== markdownPath);
      toast.info('Image insertion was undone.');
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'The uploaded image file could not be deleted.');
      toast.warning(`Image text was removed, but file cleanup failed: ${message}`);
    }
  }, [documentPath, setDraft]);

  const handleImageUpload = useCallback(async (imageFile: File) => {
    if (!documentPath || !isEditing) {
      return;
    }

    if (!imageFile.type.startsWith('image/')) {
      const message = 'Select a valid image file (GIF, JPEG, PNG, SVG, or WebP).';
      setImageUploadError(message);
      toast.error(message);
      return;
    }

    try {
      setImageUploadError(null);
      setIsUploadingImage(true);

      const uploadedAsset = await uploadImageAsset(documentPath, imageFile);
      uploadedImageMarkdownPathsRef.current.push(uploadedAsset.markdownPath);
      const baseAltText = imageFile.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      const markdown = `![${baseAltText || 'image'}](${uploadedAsset.markdownPath})`;
      const insertion = `\n${markdown}\n`;
      const inserted = sourceEditorRef.current?.insertText(insertion) ?? false;

      if (!inserted) {
        setDraft((current) => `${current}${current.endsWith('\n') ? '' : '\n'}${markdown}\n`);
      }

      toast.success('Image added to the markdown draft. Click Save to persist changes.', {
        action: {
          label: 'Undo insert',
          onClick: () => {
            void handleUndoInsertedImage({
              markdownPath: uploadedAsset.markdownPath,
              insertion,
            });
          },
        },
      });
      setIsImageDialogOpen(false);
      setIsImageUploadDragging(false);
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'The image could not be uploaded.');
      setImageUploadError(message);
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }, [documentPath, handleUndoInsertedImage, isEditing, setDraft, sourceEditorRef]);

  const handleImageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    void handleImageUpload(selectedFile);
  }, [handleImageUpload]);

  const cleanupUploadedDraftImages = useCallback(async () => {
    if (!documentPath) {
      return { removedCount: 0, failedCount: 0 };
    }

    const uploadedPaths = [...new Set(uploadedImageMarkdownPathsRef.current)];
    if (uploadedPaths.length === 0) {
      return { removedCount: 0, failedCount: 0 };
    }

    const failedPaths: string[] = [];

    for (const markdownPath of uploadedPaths) {
      try {
        await deleteImageAsset(documentPath, markdownPath);
      } catch {
        failedPaths.push(markdownPath);
      }
    }

    uploadedImageMarkdownPathsRef.current = failedPaths;

    return {
      removedCount: uploadedPaths.length - failedPaths.length,
      failedCount: failedPaths.length,
    };
  }, [documentPath]);

  const clearUploadedDraftImages = useCallback(() => {
    uploadedImageMarkdownPathsRef.current = [];
  }, []);

  return {
    imageInputRef,
    isImageDialogOpen,
    isImageUploadDragging,
    isUploadingImage,
    imageUploadError,
    handleImageDialogOpenChange,
    handleImageInputChange,
    handleImageUpload,
    setIsImageUploadDragging,
    cleanupUploadedDraftImages,
    clearUploadedDraftImages,
  };
}
