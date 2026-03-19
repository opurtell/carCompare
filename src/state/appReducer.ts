import type { AppState, AppAction } from '../types/car';

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

    default:
      return state;
  }
}
