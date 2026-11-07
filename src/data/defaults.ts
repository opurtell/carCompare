import type { CarConfig, FuelType, GlobalDefaults } from '../types/car';
import { ACT_CTP_PREMIUM, autoRegoFor } from '../calculations/actSpecific';

export const ACT_DEFAULTS = {
  ctpPerYear: ACT_CTP_PREMIUM,
  // ACT's 2-year free rego for new ZEVs closed 30 June 2024.
  evFreeRegoYears: 0,
  petrolPrice: 2.45,
  electricityPrice: 0.30,
  solarRate: 0.06,
  annualKm: 15000,
};

/**
 * Indicative depreciation: a first-year drop, then a steady rate. Calibrated so 3-year retained
 * value lands near published averages: EVs ~60% (AutoGrab 2024 via Gridly, Jul 2026) and petrol
 * cars 55–65% (RedBook/Carsales/Canstar benchmark via Flare, Jul 2026). Hybrids hold value better.
 * Individual models vary a lot, so these are starting points for the user to adjust.
 */
export const DEPRECIATION_DEFAULTS: Record<FuelType, { firstYear: number; annual: number }> = {
  ev: { firstYear: 25, annual: 12 },
  phev: { firstYear: 22, annual: 11 },
  hybrid: { firstYear: 15, annual: 9 },
  petrol: { firstYear: 20, annual: 10 },
};

/** Depreciation rates for a fuel type. A used car has already taken the first-year drop. */
export function depreciationDefaultsFor(fuelType: FuelType, isUsed = false) {
  const d = DEPRECIATION_DEFAULTS[fuelType];
  return {
    firstYearDepreciationPercent: isUsed ? d.annual : d.firstYear,
    annualDepreciationPercent: d.annual,
  };
}

const FUEL_TYPE_DEFAULTS: Record<FuelType, Partial<CarConfig>> = {
  ev: {
    petrolConsumption: 0,
    electricConsumption: 15,
    phevElectricPercent: 100,
    servicingCostPerYear: 400,
    stampDuty: 0,
    evFreeRegoYears: ACT_DEFAULTS.evFreeRegoYears,
  },
  phev: {
    petrolConsumption: 5,
    electricConsumption: 18,
    phevElectricPercent: 60,
    servicingCostPerYear: 600,
    stampDuty: 0,
    evFreeRegoYears: 0,
  },
  hybrid: {
    petrolConsumption: 4.5,
    electricConsumption: 0,
    phevElectricPercent: 0,
    servicingCostPerYear: 700,
    stampDuty: 0,
    evFreeRegoYears: 0,
  },
  petrol: {
    petrolConsumption: 8,
    electricConsumption: 0,
    phevElectricPercent: 0,
    servicingCostPerYear: 800,
    stampDuty: 0,
    evFreeRegoYears: 0,
  },
};

export const DEFAULT_GLOBAL_DEFAULTS: GlobalDefaults = {
  petrolPrice: ACT_DEFAULTS.petrolPrice,
  electricityPrice: ACT_DEFAULTS.electricityPrice,
  annualKm: ACT_DEFAULTS.annualKm,
};

/** Picks "Car N" with the lowest N not already used, so names stay unique across reloads. */
export function nextCarName(existingNames: string[] = []): string {
  const taken = new Set(existingNames);
  let n = 1;
  while (taken.has(`Car ${n}`)) n++;
  return `Car ${n}`;
}

export function createDefaultCarConfig(fuelType: FuelType = 'ev', existingNames: string[] = []): CarConfig {
  const fuelDefaults = FUEL_TYPE_DEFAULTS[fuelType];
  const depreciation = DEPRECIATION_DEFAULTS[fuelType];
  const car: CarConfig = {
    id: crypto.randomUUID(),
    name: nextCarName(existingNames),
    fuelType,
    purchasePrice: fuelType === 'ev' ? 50000 : 35000,
    petrolPrice: ACT_DEFAULTS.petrolPrice,
    electricityPrice: ACT_DEFAULTS.electricityPrice,
    useSolarCharging: false,
    solarRate: ACT_DEFAULTS.solarRate,
    solarChargingPercent: 50,
    annualKm: ACT_DEFAULTS.annualKm,
    petrolConsumption: 8,
    electricConsumption: 15,
    phevElectricPercent: 0,
    servicingCostPerYear: 800,
    insurancePerYear: 1500,
    ctpPerYear: ACT_DEFAULTS.ctpPerYear,
    useCustomCtp: false,
    regoPerYear: 0,
    useCustomRego: false,
    evFreeRegoYears: 0,
    depreciationModel: 'percentage',
    firstYearDepreciationPercent: depreciation.firstYear,
    annualDepreciationPercent: depreciation.annual,
    hasLoan: false,
    loanAmount: 0,
    interestRate: 7,
    loanTermYears: 5,
    stampDuty: 0,
    useCustomStampDuty: false,
    useCustomPetrolPrice: false,
    useCustomElectricityPrice: false,
    useCustomAnnualKm: false,
    ...fuelDefaults,
  };
  // Stored for display/fallback; the engine recalculates it while useCustomRego is false.
  car.regoPerYear = autoRegoFor(car);
  return car;
}
