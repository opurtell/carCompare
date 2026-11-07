import type { CarConfig, GlobalDefaults } from '../types/car';
import type { ResearchResult } from '../api/carResearchApi';
import { createDefaultCarConfig } from '../data/defaults';
import { autoRegoFor } from '../calculations/actSpecific';

/**
 * Car facts from research (AI lookup or the built-in catalogue) on top of the fuel-type defaults.
 * Stamp duty, rego and CTP stay on auto: the app calculates them from the ACT rules using the
 * car's CO2 and tare. A used car gets the used duty rates and no first-year drop.
 * A missing (0) servicing or insurance figure keeps the default.
 */
export function mergeResearchResultToConfig(
  research: Pick<ResearchResult,
    'name' | 'fuelType' | 'purchasePrice' | 'petrolConsumption' | 'electricConsumption' |
    'co2GPerKm' | 'tareKg' | 'servicingCostPerYear' | 'insurancePerYear'> & Partial<Pick<ResearchResult, 'isUsed'>>,
  globalDefaults: GlobalDefaults,
): CarConfig {
  const base = createDefaultCarConfig(research.fuelType);
  const car: CarConfig = {
    ...base,
    name: research.name || 'New Car',
    purchasePrice: research.purchasePrice,
    petrolConsumption: research.fuelType === 'ev' ? 0 : research.petrolConsumption || base.petrolConsumption,
    electricConsumption:
      research.fuelType === 'ev' || research.fuelType === 'phev'
        ? research.electricConsumption || base.electricConsumption
        : 0,
    co2GPerKm: research.co2GPerKm > 0 ? research.co2GPerKm : undefined,
    tareKg: research.tareKg > 0 ? research.tareKg : undefined,
    servicingCostPerYear: research.servicingCostPerYear > 0 ? research.servicingCostPerYear : base.servicingCostPerYear,
    insurancePerYear: research.insurancePerYear > 0 ? research.insurancePerYear : base.insurancePerYear,
    petrolPrice: globalDefaults.petrolPrice,
    electricityPrice: globalDefaults.electricityPrice,
    annualKm: globalDefaults.annualKm,
  };
  if (research.isUsed) {
    car.isUsed = true;
    // The big first-year drop has already happened for a second-hand car.
    car.firstYearDepreciationPercent = car.annualDepreciationPercent;
  }
  car.regoPerYear = autoRegoFor(car);
  return car;
}
