import type { FuelType } from '../types/car';

/**
 * ACT registration cost for a given year.
 * EVs get free rego for evFreeRegoYears, then 50% rate for 1 more year,
 * then full rate.
 */
export function getActRegistration(
  fuelType: FuelType,
  year: number,
  baseRegoPerYear: number,
  evFreeRegoYears: number
): number {
  if (fuelType !== 'ev') return baseRegoPerYear;

  if (year <= evFreeRegoYears) return 0;
  if (year === evFreeRegoYears + 1) return baseRegoPerYear * 0.5;
  return baseRegoPerYear;
}

/**
 * ACT stamp duty calculation.
 * EVs are exempt in the ACT.
 * Others: simplified progressive scale based on purchase price.
 * Actual ACT rates (2024):
 *   - Up to $45,000: ~$3 per $100 (3%)
 *   - $45,001–$100,000: ~$5 per $100 (5%)
 *   - Over $100,000: ~$5 per $100 (5%) + premium
 */
export function calculateActStampDuty(
  fuelType: FuelType,
  purchasePrice: number
): number {
  if (fuelType === 'ev') return 0;

  if (purchasePrice <= 45000) {
    return purchasePrice * 0.03;
  } else if (purchasePrice <= 100000) {
    return 45000 * 0.03 + (purchasePrice - 45000) * 0.05;
  } else {
    return 45000 * 0.03 + 55000 * 0.05 + (purchasePrice - 100000) * 0.05;
  }
}
