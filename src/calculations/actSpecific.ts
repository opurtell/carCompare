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

/** Combined CO2 (g/km) → ACT emissions category, per Access Canberra's bands. */
export function categoryFromCo2(gPerKm: number): ActEmissionsCategory {
  if (gPerKm <= 0) return 'AAA';
  if (gPerKm <= 65) return 'AA';
  if (gPerKm <= 130) return 'A';
  if (gPerKm <= 175) return 'B';
  if (gPerKm <= 220) return 'C';
  return 'D';
}

/**
 * ACT emissions category. Uses the official combined CO2 (Green Vehicle Guide) when known;
 * otherwise EVs are AAA, PHEVs AA (1–65 g/km on the Green Vehicle Guide), and the rest are
 * estimated from combined fuel consumption.
 */
export function estimateActEmissionsCategory(
  fuelType: FuelType,
  petrolConsumption: number,
  co2GPerKm?: number,
): ActEmissionsCategory {
  if (fuelType === 'ev') return 'AAA';
  if (typeof co2GPerKm === 'number' && Number.isFinite(co2GPerKm) && co2GPerKm > 0) {
    return categoryFromCo2(co2GPerKm);
  }
  if (fuelType === 'phev') return 'AA';
  // A non-EV always emits something, so the estimate never drops below AA.
  const category = categoryFromCo2(Math.max(0, petrolConsumption) * PETROL_G_CO2_PER_L100KM);
  return category === 'AAA' ? 'AA' : category;
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
  co2GPerKm?: number,
): number {
  const price = Math.max(0, purchasePrice);
  const category = estimateActEmissionsCategory(fuelType, petrolConsumption, co2GPerKm);
  const band = (asAt >= RATES_2027_START ? RATES_2027 : RATES_2025)[category];

  if (price <= LOW_CAP) return perHundred(price, band.base);
  const lowPart = (LOW_CAP / 100) * band.base;
  if (price <= MID_CAP) return lowPart + perHundred(price - LOW_CAP, band.mid);
  const midPart = ((MID_CAP - LOW_CAP) / 100) * band.mid;
  return lowPart + midPart + perHundred(price - MID_CAP, TOP_RATE);
}

type EmissionsInputs = Pick<CarConfig, 'fuelType' | 'petrolConsumption' | 'co2GPerKm'>;

export function emissionsCategoryFor(car: EmissionsInputs): ActEmissionsCategory {
  return estimateActEmissionsCategory(car.fuelType, car.petrolConsumption, car.co2GPerKm);
}

export function autoStampDutyFor(car: EmissionsInputs & Pick<CarConfig, 'purchasePrice'>): number {
  return calculateActStampDuty(car.fuelType, car.purchasePrice, car.petrolConsumption, new Date(), car.co2GPerKm);
}

/**
 * ACT private registration fee for a vehicle first registered on or after 1 Dec 2025
 * (Road Transport (General) (Vehicle Registration and Related Fees) Determination 2026 (No 2),
 * DI2026-146, Part 1A, from 2 July 2026). Indexed every July — update these with the new determination.
 * https://www.legislation.act.gov.au/DownloadFile/di/2026-146/current/PDF/2026-146.PDF
 */
const REGO_FEES_2026: Record<ActEmissionsCategory, { light: number; heavy: number }> = {
  AAA: { light: 394.9, heavy: 877.4 },
  AA: { light: 416.1, heavy: 950.5 },
  A: { light: 437.7, heavy: 1023.6 },
  B: { light: 495.0, heavy: 1096.8 },
  C: { light: 607.3, heavy: 1105.7 },
  D: { light: 719.6, heavy: 1114.5 },
};
/** Private light-vehicle fees step up at 2,505 kg tare. */
export const REGO_HEAVY_TARE_KG = 2505;
/** Road rescue fee, payable with every 12-month registration (DI2026-146 item 21.1). */
export const ROAD_RESCUE_FEE = 33.7;

/**
 * Annual ACT registration for a private car: emissions/weight fee + road rescue fee.
 * Unknown tare is treated as under 2,505 kg (true for most passenger cars). The 2,505–2,794 kg
 * fee is also used above 2,795 kg, which is rare for a passenger vehicle.
 */
export function calculateActRegistration(category: ActEmissionsCategory, tareKg?: number): number {
  const band = REGO_FEES_2026[category];
  const fee = typeof tareKg === 'number' && tareKg >= REGO_HEAVY_TARE_KG ? band.heavy : band.light;
  return Math.round((fee + ROAD_RESCUE_FEE) * 100) / 100;
}

export function autoRegoFor(car: EmissionsInputs & Pick<CarConfig, 'tareKg'>): number {
  return calculateActRegistration(emissionsCategoryFor(car), car.tareKg);
}

/**
 * ACT MAI (CTP) premium, class 1 private passenger vehicle, 12 months, from 5 May 2026.
 * Premiums are community rated, so every private car pays the same with a given insurer.
 * AAMI $405.10 (cheapest), GIO $409.50. Update each time insurers file new premiums.
 * https://www.aami.com.au/assets/documents/aami/motor/ctp/aami-mai-premiums-effective-05-may-2026.pdf
 */
export const ACT_CTP_PREMIUM = 405.1;
