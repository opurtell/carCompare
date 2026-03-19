import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction, CarConfig } from '../types/car';
import { appReducer } from './appReducer';
import { loadState, useLocalStorageSync } from '../hooks/useLocalStorage';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addCar: (car: CarConfig) => void;
  removeCar: (carId: string) => void;
  updateCar: (car: CarConfig) => void;
  setYears: (years: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const defaultState: AppState = {
  cars: [],
  comparisonYears: 5,
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

  return (
    <AppContext.Provider value={{ state, dispatch, addCar, removeCar, updateCar, setYears }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
