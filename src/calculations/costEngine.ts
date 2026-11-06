import type { CarConfig, YearlyCostBreakdown, CarCalculationResult } from '../types/car';
import { calculateLoanSchedule } from './loanCalculator';
import { getActRegistration, autoStampDutyFor } from './actSpecific';

function calculateFuelCost(car: CarConfig): number {
  const kmHundreds = car.annualKm / 100;

  // Blended electricity rate
  let effectiveElectricRate = car.electricityPrice;
  if (car.useSolarCharging) {
    const solarFraction = car.solarChargingPercent / 100;
    effectiveElectricRate =
      solarFraction * car.solarRate + (1 - solarFraction) * car.electricityPrice;
  }

  switch (car.fuelType) {
    case 'ev':
      return kmHundreds * car.electricConsumption * effectiveElectricRate;

    case 'phev': {
      const electricFraction = car.phevElectricPercent / 100;
      const electricCost =
        kmHundreds * electricFraction * car.electricConsumption * effectiveElectricRate;
      const petrolCost =
        kmHundreds * (1 - electricFraction) * car.petrolConsumption * car.petrolPrice;
      return electricCost + petrolCost;
    }

    case 'hybrid':
      return kmHundreds * car.petrolConsumption * car.petrolPrice;

    case 'petrol':
      return kmHundreds * car.petrolConsumption * car.petrolPrice;
  }
}

/** Value after `year` years: a first-year drop, then a steady annual rate. */
export function vehicleValueAfter(purchasePrice: number, firstYearRate: number, rate: number, year: number): number {
  if (year <= 0) return purchasePrice;
  return purchasePrice * (1 - firstYearRate / 100) * Math.pow(1 - rate / 100, year - 1);
}

function calculateDepreciation(purchasePrice: number, firstYearRate: number, rate: number, year: number): {
  depreciation: number;
  vehicleValue: number;
} {
  const previousValue = vehicleValueAfter(purchasePrice, firstYearRate, rate, year - 1);
  const currentValue = vehicleValueAfter(purchasePrice, firstYearRate, rate, year);
  return {
    depreciation: previousValue - currentValue,
    vehicleValue: currentValue,
  };
}

export function calculateYearlyCosts(
  car: CarConfig,
  years: number
): YearlyCostBreakdown[] {
  const loanSchedule = car.hasLoan
    ? calculateLoanSchedule(car.loanAmount, car.interestRate, Math.round(car.loanTermYears))
    : [];

  const fuelCostPerYear = calculateFuelCost(car);
  const breakdowns: YearlyCostBreakdown[] = [];
  let cumulative = 0;

  for (let year = 1; year <= years; year++) {
    const registration = getActRegistration(
      car.fuelType,
      year,
      car.regoPerYear,
      car.evFreeRegoYears
    );

    const { depreciation, vehicleValue } = calculateDepreciation(
      car.purchasePrice,
      car.firstYearDepreciationPercent ?? car.annualDepreciationPercent,
      car.annualDepreciationPercent,
      year
    );

    const loanYear = loanSchedule[year - 1];
    const loanInterest = loanYear?.interestPaid ?? 0;

    const totalAnnual =
      fuelCostPerYear +
      car.servicingCostPerYear +
      car.insurancePerYear +
      car.ctpPerYear +
      registration +
      depreciation +
      loanInterest;

    cumulative += totalAnnual;

    breakdowns.push({
      year,
      fuel: fuelCostPerYear,
      servicing: car.servicingCostPerYear,
      insurance: car.insurancePerYear,
      ctp: car.ctpPerYear,
      registration,
      depreciation,
      loanInterest,
      totalAnnual,
      cumulativeTotal: cumulative,
      vehicleValue,
    });
  }

  return breakdowns;
}

export function calculateCarResult(
  car: CarConfig,
  years: number
): CarCalculationResult {
  const yearlyBreakdowns = calculateYearlyCosts(car, years);
  const stampDuty = car.useCustomStampDuty
    ? car.stampDuty
    : autoStampDutyFor(car);
  const totalRunning = yearlyBreakdowns[yearlyBreakdowns.length - 1]?.cumulativeTotal ?? 0;
  const totalCostOfOwnership = stampDuty + totalRunning;

  return {
    carId: car.id,
    carName: car.name,
    yearlyBreakdowns,
    stampDuty,
    purchasePrice: car.purchasePrice,
    totalCostOfOwnership,
  };
}

const RUNNING_FIELDS = ['fuel', 'servicing', 'insurance', 'ctp', 'registration', 'loanInterest'] as const;

/**
 * Cumulative cost at year 0..N, matching what the dashboard displays.
 * - includeDepreciation: net economic cost = stamp duty + running costs + value lost so far
 *   (purchase price is recovered as resale value, so only depreciation counts).
 * - otherwise: cash outlay = purchase price + stamp duty + running costs.
 */
export function cumulativeCostSeries(result: CarCalculationResult, includeDepreciation: boolean): number[] {
  const series: number[] = [];
  let running = 0;
  let depreciation = 0;
  const upfront = includeDepreciation ? result.stampDuty : result.purchasePrice + result.stampDuty;
  series.push(upfront);
  for (const yr of result.yearlyBreakdowns) {
    running += RUNNING_FIELDS.reduce((s, f) => s + yr[f], 0);
    depreciation += yr.depreciation;
    series.push(upfront + running + (includeDepreciation ? depreciation : 0));
  }
  return series;
}

/** Total cost over the comparison period, consistent with the depreciation toggle. */
export function totalCost(result: CarCalculationResult, includeDepreciation: boolean): number {
  const series = cumulativeCostSeries(result, includeDepreciation);
  return series[series.length - 1];
}

/** Cars cheapest-first on the same basis as the table and chart; `index` is the car's colour slot. */
export function rankCarsByCost(results: CarCalculationResult[], includeDepreciation: boolean) {
  return results
    .map((result, index) => ({ result, index, total: totalCost(result, includeDepreciation) }))
    .sort((a, b) => a.total - b.total);
}

/**
 * First year in which the two cars' cumulative costs cross over (year 1..N).
 * Returns null if one car is cheaper (or equal) the whole way through.
 */
export function findBreakEvenYear(
  resultA: CarCalculationResult,
  resultB: CarCalculationResult,
  includeDepreciation = true,
): number | null {
  const a = cumulativeCostSeries(resultA, includeDepreciation);
  const b = cumulativeCostSeries(resultB, includeDepreciation);
  const len = Math.min(a.length, b.length);

  for (let i = 1; i < len; i++) {
    const prevDiff = a[i - 1] - b[i - 1];
    const currDiff = a[i] - b[i];
    if ((prevDiff > 0 && currDiff <= 0) || (prevDiff < 0 && currDiff >= 0)) {
      return i;
    }
  }
  return null;
}
