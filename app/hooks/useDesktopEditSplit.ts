import { useEffect, useState } from 'react';

export function useDesktopEditSplit(minWidth = 1280): boolean {
  const [isDesktopEditSplit, setIsDesktopEditSplit] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const sync = () => setIsDesktopEditSplit(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);

    return () => mediaQuery.removeEventListener('change', sync);
  }, [minWidth]);

  return isDesktopEditSplit;
}
