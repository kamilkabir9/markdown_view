import { useState } from 'react';

interface ImageWithFallbackProps {
  src?: string;
  alt?: string;
  title?: string;
  className?: string;
  [key: string]: any;
}

export function ImageWithFallback({
  src,
  alt,
  title,
  className = '',
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError || !src) {
    return (
      <span
        className={`inline-flex flex-col items-center justify-center p-4 bg-surface rounded-lg border border-dashed border-default-300 ${className}`}
        title={title}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-muted mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm text-muted text-center">
          {alt || 'Image not available'}
        </span>
        {src && (
          <span className="text-xs text-muted/70 mt-1 max-w-full truncate block">
            {src}
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      {isLoading && (
        <span
          className={`inline-flex items-center justify-center p-4 bg-surface rounded-lg ${className}`}
        >
          <span className="animate-pulse flex space-x-2">
            <span className="h-4 w-4 bg-muted rounded-full"></span>
            <span className="h-4 w-4 bg-muted rounded-full"></span>
            <span className="h-4 w-4 bg-muted rounded-full"></span>
          </span>
        </span>
      )}
      <img
        src={src}
        alt={alt}
        title={title}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </>
  );
}