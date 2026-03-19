import type { AppState, AppAction, LibraryCar, CarConfig } from '../types/car';

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_CAR':
      if (state.cars.length >= 5) return state;
      return { ...state, cars: [...state.cars, action.car] };

    case 'REMOVE_CAR':
      return { ...state, cars: state.cars.filter(c => c.id !== action.carId) };

    case 'UPDATE_CAR':
      return {
        ...state,
        cars: state.cars.map(c => (c.id === action.car.id ? action.car : c)),
      };

    case 'SET_YEARS':
      return { ...state, comparisonYears: Math.max(1, Math.min(10, action.years)) };

    case 'LOAD_STATE':
      return action.state;

    case 'SET_GLOBAL_DEFAULTS':
      return { ...state, globalDefaults: { ...state.globalDefaults, ...action.defaults } };

    case 'SAVE_TO_LIBRARY': {
      const newLibraryId = crypto.randomUUID();
      const libraryEntry: LibraryCar = {
        id: newLibraryId,
        name: action.car.name,
        savedAt: Date.now(),
        config: action.car,
      };
      return {
        ...state,
        library: [...state.library, libraryEntry],
        cars: state.cars.map(c =>
          c.id === action.car.id ? { ...c, libraryId: newLibraryId } : c,
        ),
      };
    }

    case 'UPDATE_LIBRARY_ENTRY':
      return {
        ...state,
        library: state.library.map(e =>
          e.id === action.libraryId
            ? { ...e, name: action.config.name, config: action.config }
            : e,
        ),
      };

    case 'REMOVE_FROM_LIBRARY':
      return {
        ...state,
        library: state.library.filter(e => e.id !== action.libraryId),
      };

    case 'ADD_FROM_LIBRARY': {
      if (state.cars.length >= 5) return state;
      const source = state.library.find(e => e.id === action.libraryId);
      if (!source) return state;
      const cloned: CarConfig = {
        ...source.config,
        id: crypto.randomUUID(),
        libraryId: source.id,
      };
      return { ...state, cars: [...state.cars, cloned] };
    }

    default:
      return state;
  }
}
