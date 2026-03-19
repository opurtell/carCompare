import { useMemo } from 'react';
import type { CarConfig, CarCalculationResult, GlobalDefaults } from '../types/car';
import { calculateCarResult } from '../calculations/costEngine';
import { resolveCarConfig } from '../utils/resolveCarConfig';

export function useCarCalculations(
  cars: CarConfig[],
  years: number,
  globalDefaults: GlobalDefaults,
): CarCalculationResult[] {
  return useMemo(
    () => cars.map(car => calculateCarResult(resolveCarConfig(car, globalDefaults), years)),
    [cars, years, globalDefaults]
  );
}
