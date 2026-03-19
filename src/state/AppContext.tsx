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
}

const AppContext = createContext<AppContextValue | null>(null);

const defaultState: AppState = {
  cars: [],
  comparisonYears: 5,
  globalDefaults: DEFAULT_GLOBAL_DEFAULTS,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, defaultState, () => {
    return loadState() ?? defaultState;
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

  return (
    <AppContext.Provider value={{ state, dispatch, addCar, removeCar, updateCar, setYears, setGlobalDefaults }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
