import { useCallback, useSyncExternalStore } from 'react';

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** Matches Tailwind's `md` breakpoint: below it the app uses the tabbed mobile layout. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
