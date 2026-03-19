export type FuelType = 'ev' | 'phev' | 'hybrid' | 'petrol';

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
  regoPerYear: number;
  evFreeRegoYears: number;
  depreciationModel: DepreciationModel;
  annualDepreciationPercent: number;
  hasLoan: boolean;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  stampDuty: number;
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
  totalCostOfOwnership: number;
}

export interface AppState {
  cars: CarConfig[];
  comparisonYears: number;
}

export type AppAction =
  | { type: 'ADD_CAR'; car: CarConfig }
  | { type: 'REMOVE_CAR'; carId: string }
  | { type: 'UPDATE_CAR'; car: CarConfig }
  | { type: 'SET_YEARS'; years: number }
  | { type: 'LOAD_STATE'; state: AppState };
