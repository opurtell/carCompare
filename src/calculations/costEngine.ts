import type { CarConfig, YearlyCostBreakdown, CarCalculationResult } from '../types/car';
import { calculateLoanSchedule } from './loanCalculator';
import { getActRegistration, calculateActStampDuty } from './actSpecific';

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

function calculateDepreciation(purchasePrice: number, rate: number, year: number): {
  depreciation: number;
  vehicleValue: number;
} {
  const previousValue = purchasePrice * Math.pow(1 - rate / 100, year - 1);
  const currentValue = purchasePrice * Math.pow(1 - rate / 100, year);
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
    ? calculateLoanSchedule(car.loanAmount, car.interestRate, car.loanTermYears)
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
    : calculateActStampDuty(car.fuelType, car.purchasePrice);
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

export function findBreakEvenYear(
  resultA: CarCalculationResult,
  resultB: CarCalculationResult
): number | null {
  // Find the year where the cheaper-upfront car becomes cheaper overall
  const aBreakdowns = resultA.yearlyBreakdowns;
  const bBreakdowns = resultB.yearlyBreakdowns;
  const len = Math.min(aBreakdowns.length, bBreakdowns.length);

  for (let i = 1; i < len; i++) {
    const prevDiff =
      (aBreakdowns[i - 1].cumulativeTotal + resultA.stampDuty) -
      (bBreakdowns[i - 1].cumulativeTotal + resultB.stampDuty);
    const currDiff =
      (aBreakdowns[i].cumulativeTotal + resultA.stampDuty) -
      (bBreakdowns[i].cumulativeTotal + resultB.stampDuty);

    // Sign change = break-even
    if ((prevDiff > 0 && currDiff <= 0) || (prevDiff < 0 && currDiff >= 0)) {
      return aBreakdowns[i].year;
    }
  }

  return null;
}
