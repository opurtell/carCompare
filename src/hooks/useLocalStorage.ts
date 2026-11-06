import { useEffect, useRef } from 'react';
import type { AppState, CarConfig, LibraryCar } from '../types/car';
import { DEFAULT_GLOBAL_DEFAULTS, createDefaultCarConfig } from '../data/defaults';

export const STORAGE_KEY = 'carCompare_v1';
const DEBOUNCE_MS = 500;

/** Fills in fields added since the config was saved, so old saves keep working. */
function migrateCar(raw: unknown): CarConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const car = raw as Partial<CarConfig>;
  if (typeof car.id !== 'string') return null;
  const base = createDefaultCarConfig(car.fuelType ?? 'petrol');
  return { ...base, ...car } as CarConfig;
}

function migrateLibraryEntry(raw: unknown): LibraryCar | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Partial<LibraryCar>;
  const config = migrateCar(e.config);
  if (typeof e.id !== 'string' || !config) return null;
  return { id: e.id, name: e.name ?? config.name, savedAt: e.savedAt ?? Date.now(), config };
}

export function loadState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || typeof parsed !== 'object') return null;

    const cars = Array.isArray(parsed.cars) ? parsed.cars.map(migrateCar).filter((c): c is CarConfig => c !== null) : [];
    const library = Array.isArray(parsed.library)
      ? parsed.library.map(migrateLibraryEntry).filter((e): e is LibraryCar => e !== null)
      : [];

    return {
      ...parsed,
      cars: cars.slice(0, 5),
      library,
      globalDefaults: { ...DEFAULT_GLOBAL_DEFAULTS, ...(parsed.globalDefaults ?? {}) },
    };
  } catch {
    return null;
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable (e.g. some private-browsing modes)
  }
}

/** Debounced persistence, flushed immediately when the tab is hidden or closed. */
export function useLocalStorageSync(state: AppState) {
  const latest = useRef(state);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    latest.current = state;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      save(state);
    }, DEBOUNCE_MS);
  }, [state]);

  useEffect(() => {
    const flush = () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
        save(latest.current);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
