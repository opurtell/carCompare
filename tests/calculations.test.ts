import { describe, expect, it } from 'vitest';
import { calculateActStampDuty, estimateActEmissionsCategory, getActRegistration } from '../src/calculations/actSpecific';
import { calculateCarResult, cumulativeCostSeries, findBreakEvenYear, totalCost } from '../src/calculations/costEngine';
import { calculateLoanSchedule } from '../src/calculations/loanCalculator';
import { createDefaultCarConfig, nextCarName } from '../src/data/defaults';

const SEP_2025 = new Date('2026-01-15T00:00:00+11:00');
const FEB_2027 = new Date('2027-03-01T00:00:00+11:00');

describe('ACT motor vehicle duty', () => {
  it('charges EVs (category AAA) — no longer exempt', () => {
    expect(calculateActStampDuty('ev', 40_000, 0, SEP_2025)).toBeCloseTo(1_000);
    expect(calculateActStampDuty('ev', 80_000, 0, SEP_2025)).toBeCloseTo(2_525);
    expect(calculateActStampDuty('ev', 100_000, 0, SEP_2025)).toBeCloseTo(2_525 + 1_600);
  });

  it('matches published band thresholds for category B and D', () => {
    // 6.5 L/100km ≈ 151 g/km → B
    expect(calculateActStampDuty('petrol', 80_000, 6.5, SEP_2025)).toBeCloseTo(3_177);
    // 10 L/100km ≈ 232 g/km → D
    expect(calculateActStampDuty('petrol', 80_000, 10, SEP_2025)).toBeCloseTo(4_772);
  });

  it('uses the higher rates from 1 Feb 2027', () => {
    expect(calculateActStampDuty('petrol', 80_000, 6.5, FEB_2027)).toBeCloseTo(3_419);
  });

  it('rounds up per $100 or part thereof', () => {
    expect(calculateActStampDuty('ev', 10_001, 0, SEP_2025)).toBeCloseTo(101 * 2.5);
  });

  it('estimates categories from consumption', () => {
    expect(estimateActEmissionsCategory('ev', 0)).toBe('AAA');
    expect(estimateActEmissionsCategory('phev', 5)).toBe('AA');
    expect(estimateActEmissionsCategory('hybrid', 4.5)).toBe('A');
    expect(estimateActEmissionsCategory('petrol', 8)).toBe('C');
  });

  it('applies optional free rego years to EVs only, then full rate', () => {
    expect(getActRegistration('ev', 1, 400, 2)).toBe(0);
    expect(getActRegistration('ev', 3, 400, 2)).toBe(400);
    expect(getActRegistration('petrol', 1, 400, 2)).toBe(400);
  });
});

describe('cost engine', () => {
  it('rounds fractional loan terms so the loan is fully repaid', () => {
    const car = { ...createDefaultCarConfig('petrol'), hasLoan: true, loanAmount: 30_000, loanTermYears: 4.6 };
    const result = calculateCarResult(car, 10);
    const totalInterest = result.yearlyBreakdowns.reduce((s, y) => s + y.loanInterest, 0);
    const schedule = calculateLoanSchedule(30_000, car.interestRate, 5);
    expect(totalInterest).toBeCloseTo(schedule.reduce((s, y) => s + y.interestPaid, 0));
    expect(schedule[4].remainingBalance).toBeCloseTo(0);
  });

  it('net series with depreciation ends at total cost of ownership', () => {
    const r = calculateCarResult(createDefaultCarConfig('ev'), 5);
    expect(totalCost(r, true)).toBeCloseTo(r.totalCostOfOwnership);
    expect(cumulativeCostSeries(r, true)).toHaveLength(6);
  });

  it('cash-outlay series includes purchase price up front', () => {
    const car = createDefaultCarConfig('petrol');
    const r = calculateCarResult(car, 3);
    expect(cumulativeCostSeries(r, false)[0]).toBeCloseTo(car.purchasePrice + r.stampDuty);
  });

  it('detects a break-even in the first year', () => {
    // EV: dearer up front, much cheaper to run. Petrol: cheap up front, expensive fuel.
    const ev = { ...createDefaultCarConfig('ev'), purchasePrice: 36_000, annualDepreciationPercent: 0 };
    const petrol = { ...createDefaultCarConfig('petrol'), purchasePrice: 35_000, annualDepreciationPercent: 0, petrolConsumption: 12 };
    const a = calculateCarResult(ev, 5);
    const b = calculateCarResult(petrol, 5);
    expect(findBreakEvenYear(a, b, false)).toBe(1);
  });

  it('gives unique default names', () => {
    expect(nextCarName(['Car 1', 'Car 3'])).toBe('Car 2');
    expect(createDefaultCarConfig('ev', ['Car 1']).name).toBe('Car 2');
  });
});
