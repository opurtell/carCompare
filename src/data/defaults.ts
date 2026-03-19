import type { CarConfig, FuelType, GlobalDefaults } from '../types/car';

export const ACT_DEFAULTS = {
  regoPerYear: 360,
  ctpPerYear: 600,
  evFreeRegoYears: 2,
  petrolPrice: 2.0,
  electricityPrice: 0.30,
  solarRate: 0.06,
  annualKm: 15000,
};

const FUEL_TYPE_DEFAULTS: Record<FuelType, Partial<CarConfig>> = {
  ev: {
    petrolConsumption: 0,
    electricConsumption: 15,
    phevElectricPercent: 100,
    servicingCostPerYear: 400,
    stampDuty: 0,
    evFreeRegoYears: 2,
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

let counter = 0;

export function createDefaultCarConfig(fuelType: FuelType = 'ev'): CarConfig {
  const fuelDefaults = FUEL_TYPE_DEFAULTS[fuelType];
  counter++;
  return {
    id: crypto.randomUUID(),
    name: `Car ${counter}`,
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
    regoPerYear: ACT_DEFAULTS.regoPerYear,
    evFreeRegoYears: 0,
    depreciationModel: 'percentage',
    annualDepreciationPercent: 13,
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
}
