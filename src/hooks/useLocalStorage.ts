import { useEffect, useRef, useCallback } from 'react';
import type { AppState } from '../types/car';

const STORAGE_KEY = 'carCompare_v1';
const DEBOUNCE_MS = 500;

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export function useLocalStorageSync(state: AppState) {
  const timerRef = useRef<number | null>(null);

  const save = useCallback((s: AppState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // localStorage full or unavailable
    }
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      save(state);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state, save]);
}
