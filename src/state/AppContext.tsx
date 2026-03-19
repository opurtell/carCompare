import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction, CarConfig, GlobalDefaults } from '../types/car';
import { appReducer } from './appReducer';
import { loadState, useLocalStorageSync } from '../hooks/useLocalStorage';
import { DEFAULT_GLOBAL_DEFAULTS } from '../data/defaults';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addCar: (car: CarConfig) => void;
  removeCar: (carId: string) => void;
  updateCar: (car: CarConfig) => void;
  setYears: (years: number) => void;
  setGlobalDefaults: (defaults: Partial<GlobalDefaults>) => void;
  saveToLibrary: (car: CarConfig) => void;
  addFromLibrary: (libraryId: string) => void;
  updateLibraryEntry: (libraryId: string, config: CarConfig) => void;
  removeFromLibrary: (libraryId: string) => void;
  toggleDepreciation: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const defaultState: AppState = {
  cars: [],
  comparisonYears: 5,
  globalDefaults: DEFAULT_GLOBAL_DEFAULTS,
  library: [],
  showDepreciation: true,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, defaultState, () => {
    const loaded = loadState();
    return loaded ? { ...defaultState, ...loaded } : defaultState;
  });

  useLocalStorageSync(state);

  // Reset car counter on load
  useEffect(() => {
    // no-op, just ensures context mounts
  }, []);

  const addCar = (car: CarConfig) => dispatch({ type: 'ADD_CAR', car });
  const removeCar = (carId: string) => dispatch({ type: 'REMOVE_CAR', carId });
  const updateCar = (car: CarConfig) => dispatch({ type: 'UPDATE_CAR', car });
  const setYears = (years: number) => dispatch({ type: 'SET_YEARS', years });
  const setGlobalDefaults = (defaults: Partial<GlobalDefaults>) =>
    dispatch({ type: 'SET_GLOBAL_DEFAULTS', defaults });

  const saveToLibrary = (car: CarConfig) =>
    dispatch({ type: 'SAVE_TO_LIBRARY', car });
  const addFromLibrary = (libraryId: string) =>
    dispatch({ type: 'ADD_FROM_LIBRARY', libraryId });
  const updateLibraryEntry = (libraryId: string, config: CarConfig) =>
    dispatch({ type: 'UPDATE_LIBRARY_ENTRY', libraryId, config });
  const removeFromLibrary = (libraryId: string) =>
    dispatch({ type: 'REMOVE_FROM_LIBRARY', libraryId });
  const toggleDepreciation = () => dispatch({ type: 'TOGGLE_DEPRECIATION' });

  return (
    <AppContext.Provider value={{
      state, dispatch,
      addCar, removeCar, updateCar, setYears, setGlobalDefaults,
      saveToLibrary, addFromLibrary, updateLibraryEntry, removeFromLibrary,
      toggleDepreciation,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
