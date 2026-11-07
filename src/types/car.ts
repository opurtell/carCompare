import type { FuelType } from '../../shared/research';

export type { FuelType };

export type DepreciationModel = 'percentage' | 'resale';

export interface CarConfig {
  id: string;
  name: string;
  fuelType: FuelType;
  purchasePrice: number;
  petrolPrice: number;
  electricityPrice: number;
  useSolarCharging: boolean;
  solarRate: number;
  solarChargingPercent: number;
  annualKm: number;
  petrolConsumption: number;
  electricConsumption: number;
  phevElectricPercent: number;
  servicingCostPerYear: number;
  insurancePerYear: number;
  ctpPerYear: number;
  /** false = ACT MAI premium constant; true = user's own figure in ctpPerYear. */
  useCustomCtp: boolean;
  regoPerYear: number;
  /** false = calculated from the ACT fee table; true = user's own figure in regoPerYear. */
  useCustomRego: boolean;
  evFreeRegoYears: number;
  /** Official combined CO2 (Green Vehicle Guide). Unknown → estimated from fuel use. */
  co2GPerKm?: number;
  /** Tare mass. Unknown → treated as under the 2,505 kg rego step. */
  tareKg?: number;
  /** Second-hand purchase: ACT used-vehicle duty rates, and no new-car first-year drop. */
  isUsed?: boolean;
  depreciationModel: DepreciationModel;
  /** Value lost in year 1 (new cars drop fastest in the first year). */
  firstYearDepreciationPercent: number;
  /** Value lost each year after the first. */
  annualDepreciationPercent: number;
  hasLoan: boolean;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  stampDuty: number;
  useCustomStampDuty: boolean;
  useCustomPetrolPrice: boolean;
  useCustomElectricityPrice: boolean;
  useCustomAnnualKm: boolean;
  libraryId?: string;
}

export interface LibraryCar {
  id: string;
  name: string;
  savedAt: number;
  config: CarConfig;
}

export interface YearlyCostBreakdown {
  year: number;
  fuel: number;
  servicing: number;
  insurance: number;
  ctp: number;
  registration: number;
  depreciation: number;
  loanInterest: number;
  totalAnnual: number;
  cumulativeTotal: number;
  vehicleValue: number;
}

export interface CarCalculationResult {
  carId: string;
  carName: string;
  yearlyBreakdowns: YearlyCostBreakdown[];
  stampDuty: number;
  purchasePrice: number;
  totalCostOfOwnership: number;
}

export interface GlobalDefaults {
  petrolPrice: number;
  electricityPrice: number;
  annualKm: number;
}

export interface AppState {
  cars: CarConfig[];
  comparisonYears: number;
  globalDefaults: GlobalDefaults;
  library: LibraryCar[];
  showDepreciation: boolean;
}

export type AppAction =
  | { type: 'ADD_CAR'; car: CarConfig }
  | { type: 'REMOVE_CAR'; carId: string }
  | { type: 'UPDATE_CAR'; car: CarConfig }
  | { type: 'SET_YEARS'; years: number }
  | { type: 'LOAD_STATE'; state: AppState }
  | { type: 'SET_GLOBAL_DEFAULTS'; defaults: Partial<GlobalDefaults> }
  | { type: 'SAVE_TO_LIBRARY'; car: CarConfig }
  | { type: 'UPDATE_LIBRARY_ENTRY'; libraryId: string; config: CarConfig }
  | { type: 'REMOVE_FROM_LIBRARY'; libraryId: string }
  | { type: 'ADD_FROM_LIBRARY'; libraryId: string }
  | { type: 'TOGGLE_DEPRECIATION' };
