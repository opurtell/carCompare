import { useEffect, useRef, useCallback } from 'react';
import type { AppState } from '../types/car';
import { DEFAULT_GLOBAL_DEFAULTS } from '../data/defaults';

const STORAGE_KEY = 'carCompare_v1';
const DEBOUNCE_MS = 500;

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.globalDefaults) {
      parsed.globalDefaults = DEFAULT_GLOBAL_DEFAULTS;
    }
    if (!parsed.library) {
      parsed.library = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed.cars = parsed.cars.map((car: any) => ({
      ...car,
      useCustomStampDuty: car.useCustomStampDuty ?? false,
      useCustomPetrolPrice: car.useCustomPetrolPrice ?? false,
      useCustomElectricityPrice: car.useCustomElectricityPrice ?? false,
      useCustomAnnualKm: car.useCustomAnnualKm ?? false,
    }));
    return parsed;
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
