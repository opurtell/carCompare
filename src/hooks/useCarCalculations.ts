import { useMemo } from 'react';
import type { CarConfig, CarCalculationResult } from '../types/car';
import { calculateCarResult } from '../calculations/costEngine';

export function useCarCalculations(
  cars: CarConfig[],
  years: number
): CarCalculationResult[] {
  return useMemo(
    () => cars.map(car => calculateCarResult(car, years)),
    [cars, years]
  );
}
