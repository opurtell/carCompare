import type { CarConfig, FuelType } from '../types/car';

/**
 * ACT registration cost for a given year of ownership.
 * `evFreeRegoYears` lets a user model a free-rego period (the ACT's 2-year ZEV scheme closed
 * on 30 June 2024; registration is now emissions-based, so enter the actual fee in regoPerYear).
 */
export function getActRegistration(
  fuelType: FuelType,
  year: number,
  baseRegoPerYear: number,
  evFreeRegoYears: number,
): number {
  if (fuelType === 'ev' && year <= evFreeRegoYears) return 0;
  return baseRegoPerYear;
}

export type ActEmissionsCategory = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'D';

interface DutyBand {
  /** $ per $100 (or part) of value up to $45,000 */
  base: number;
  /** $ per $100 (or part) of value from $45,000 to $80,000 */
  mid: number;
}

/** Above $80,000 every category pays $8 per $100 on the excess. */
const TOP_RATE = 8;
const LOW_CAP = 45_000;
const MID_CAP = 80_000;

/** ACT Revenue Office — new passenger & light commercial vehicles, 1 Sep 2025 – 31 Jan 2027. */
const RATES_2025: Record<ActEmissionsCategory, DutyBand> = {
  AAA: { base: 2.5, mid: 4.0 },
  AA: { base: 2.67, mid: 4.41 },
  A: { base: 2.84, mid: 4.81 },
  B: { base: 3.0, mid: 5.22 },
  C: { base: 3.17, mid: 5.62 },
  D: { base: 4.53, mid: 7.81 },
};

/** ACT Revenue Office — new passenger & light commercial vehicles, from 1 Feb 2027. */
const RATES_2027: Record<ActEmissionsCategory, DutyBand> = {
  AAA: { base: 2.5, mid: 4.0 },
  AA: { base: 2.67, mid: 4.41 },
  A: { base: 2.84, mid: 4.81 },
  B: { base: 3.25, mid: 5.59 },
  C: { base: 3.72, mid: 6.44 },
  D: { base: 4.83, mid: 8.0 },
};

const RATES_2027_START = new Date('2027-02-01T00:00:00+11:00');

/** Petrol emits ~2.32 kg CO2 per litre → 23.2 g/km for every 1 L/100km. */
const PETROL_G_CO2_PER_L100KM = 23.2;

/**
 * Estimates the ACT emissions category. EVs are AAA; PHEVs are almost always AA (1–65 g/km
 * on the Green Vehicle Guide); everything else is estimated from combined fuel consumption.
 */
export function estimateActEmissionsCategory(
  fuelType: FuelType,
  petrolConsumption: number,
): ActEmissionsCategory {
  if (fuelType === 'ev') return 'AAA';
  if (fuelType === 'phev') return 'AA';
  const gPerKm = Math.max(0, petrolConsumption) * PETROL_G_CO2_PER_L100KM;
  if (gPerKm <= 65) return 'AA';
  if (gPerKm <= 130) return 'A';
  if (gPerKm <= 175) return 'B';
  if (gPerKm <= 220) return 'C';
  return 'D';
}

/** "$X per $100 or part thereof" */
function perHundred(amount: number, rate: number): number {
  return amount > 0 ? Math.ceil(amount / 100) * rate : 0;
}

/**
 * ACT motor vehicle duty for a new vehicle (emissions-based, from 1 September 2025).
 * Source: https://www.revenue.act.gov.au/duties/motor-vehicle-duty
 */
export function calculateActStampDuty(
  fuelType: FuelType,
  purchasePrice: number,
  petrolConsumption = 0,
  asAt: Date = new Date(),
): number {
  const price = Math.max(0, purchasePrice);
  const category = estimateActEmissionsCategory(fuelType, petrolConsumption);
  const band = (asAt >= RATES_2027_START ? RATES_2027 : RATES_2025)[category];

  if (price <= LOW_CAP) return perHundred(price, band.base);
  const lowPart = (LOW_CAP / 100) * band.base;
  if (price <= MID_CAP) return lowPart + perHundred(price - LOW_CAP, band.mid);
  const midPart = ((MID_CAP - LOW_CAP) / 100) * band.mid;
  return lowPart + midPart + perHundred(price - MID_CAP, TOP_RATE);
}

export function autoStampDutyFor(car: Pick<CarConfig, 'fuelType' | 'purchasePrice' | 'petrolConsumption'>): number {
  return calculateActStampDuty(car.fuelType, car.purchasePrice, car.petrolConsumption);
}
