import { describe, expect, it } from 'vitest';
import { autoStampDutyFor, calculateActStampDuty } from '../src/calculations/actSpecific';
import { createDefaultCarConfig, DEPRECIATION_DEFAULTS, depreciationDefaultsFor } from '../src/data/defaults';
import { mergeResearchResultToConfig } from '../src/utils/carConfigMerger';
import {
  buildResearchPrompt,
  researchCacheKey,
  sanitizeResearchResult,
  validateResearchParams,
  type ResearchParams,
} from '../shared/research';

const SEP_2025 = new Date('2025-10-01');
const FEB_2027 = new Date('2027-03-01');
const GLOBALS = { petrolPrice: 2.45, electricityPrice: 0.3, annualKm: 15_000 };
const used: ResearchParams = { make: 'Mazda', model: 'CX-5', year: 2019, state: 'ACT', condition: 'used', odometerKm: 82_000 };

describe('ACT duty on a used car', () => {
  it('charges a used petrol car the flat used rate, whatever its emissions', () => {
    // $3.17 per $100 up to $45k (same as new category C).
    expect(calculateActStampDuty('petrol', 30_000, 0, SEP_2025, 100, true)).toBeCloseTo(951);
    expect(calculateActStampDuty('hybrid', 30_000, 4, SEP_2025, undefined, true)).toBeCloseTo(951);
    expect(calculateActStampDuty('petrol', 30_000, 0, FEB_2027, 100, true)).toBeCloseTo(300 * 3.72);
  });

  it('keeps zero-emission rates for a used EV', () => {
    expect(calculateActStampDuty('ev', 30_000, 0, SEP_2025, undefined, true))
      .toBeCloseTo(calculateActStampDuty('ev', 30_000, 0, SEP_2025));
  });

  it('autoStampDutyFor follows the car isUsed flag', () => {
    const car = { ...createDefaultCarConfig('hybrid'), purchasePrice: 30_000, co2GPerKm: 100 };
    expect(autoStampDutyFor({ ...car, isUsed: true })).toBeGreaterThan(autoStampDutyFor(car));
  });
});

describe('used-car depreciation', () => {
  it('skips the first-year drop for a used car', () => {
    expect(depreciationDefaultsFor('ev', true)).toEqual({ firstYearDepreciationPercent: 12, annualDepreciationPercent: 12 });
    expect(depreciationDefaultsFor('ev')).toEqual({ firstYearDepreciationPercent: 25, annualDepreciationPercent: 12 });
  });

  it('merges a used lookup as a used car', () => {
    const facts = {
      name: 'Mazda CX-5 Maxx', fuelType: 'petrol' as const, purchasePrice: 24_000, petrolConsumption: 7.4,
      electricConsumption: 0, co2GPerKm: 172, tareKg: 1_550, servicingCostPerYear: 500, insurancePerYear: 1_100,
    };
    const car = mergeResearchResultToConfig({ ...facts, isUsed: true }, GLOBALS);
    expect(car.isUsed).toBe(true);
    expect(car.firstYearDepreciationPercent).toBe(DEPRECIATION_DEFAULTS.petrol.annual);
    expect(mergeResearchResultToConfig(facts, GLOBALS).isUsed).toBeUndefined();
  });
});

describe('used-car lookup', () => {
  it('validates condition and odometer', () => {
    const base = { make: 'Mazda', model: 'CX-5', year: 2019, state: 'ACT' };
    expect(validateResearchParams({ ...base, condition: 'used', odometerKm: 82_000 }))
      .toEqual({ ok: true, params: { ...base, trim: undefined, condition: 'used', odometerKm: 82_000 } });
    expect(validateResearchParams({ ...base, condition: 'used' }).ok).toBe(true);
    expect(validateResearchParams({ ...base, condition: 'used', odometerKm: -5 }).ok).toBe(false);
    expect(validateResearchParams({ ...base, condition: 'used', odometerKm: '50000' }).ok).toBe(false);
    // Anything but "used" is a new car, and the odometer is ignored.
    expect(validateResearchParams({ ...base, condition: 'junk', odometerKm: 5 }))
      .toEqual({ ok: true, params: { ...base, trim: undefined } });
  });

  it('asks for a second-hand price, not the new list price', () => {
    const p = buildResearchPrompt(used);
    expect(p).toContain('second-hand');
    expect(p).toContain('82,000 km');
    expect(p).not.toContain('{{');
    const n = buildResearchPrompt({ ...used, condition: undefined, odometerKm: undefined });
    expect(n).toContain('list price');
    expect(n).not.toContain('second-hand');
  });

  it('caches used prices per 10,000 km band, apart from new', () => {
    const asNew = { ...used, condition: undefined, odometerKm: undefined };
    expect(researchCacheKey(used)).not.toBe(researchCacheKey(asNew));
    expect(researchCacheKey(used)).toBe(researchCacheKey({ ...used, odometerKm: 79_000 }));
    expect(researchCacheKey(used)).not.toBe(researchCacheKey({ ...used, odometerKm: 120_000 }));
  });

  it('marks the sanitised result as used', () => {
    const raw = { name: 'Mazda CX-5', fuelType: 'petrol', purchasePrice: 24_000 };
    expect(sanitizeResearchResult(raw, used).isUsed).toBe(true);
    expect(sanitizeResearchResult(raw, { ...used, condition: undefined }).isUsed).toBe(false);
  });
});

describe('used-car catalogue', async () => {
  const { USED_CATALOGUE } = await import('../src/data/usedCatalogue');
  const { VEHICLE_CATALOGUE } = await import('../src/data/vehicleCatalogue');
  const { searchCatalogue } = await import('../src/utils/searchCatalogue');

  it('has sane used entries with unique ids and a price inside the guide range', () => {
    expect(USED_CATALOGUE.length).toBeGreaterThanOrEqual(80);
    const ids = [...USED_CATALOGUE, ...VEHICLE_CATALOGUE].map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of USED_CATALOGUE) {
      expect(v.isUsed).toBe(true);
      expect(v.year).toBeGreaterThanOrEqual(2014);
      expect(v.purchasePrice).toBeGreaterThan(3_000);
      expect(v.purchasePrice).toBeLessThan(100_000);
      // Either a guide range with its source, or flagged as an estimate.
      expect(Boolean(v.priceRange) !== Boolean(v.priceIsEstimate)).toBe(true);
      if (v.priceRange) {
        const [lo, hi] = v.priceRange;
        expect(v.purchasePrice).toBeGreaterThanOrEqual(lo);
        expect(v.purchasePrice).toBeLessThanOrEqual(hi);
        expect(v.sources.price).toMatch(/^https:\/\/www\.carsguide\.com\.au\//);
      }
      if (v.fuelType === 'ev') expect(v.electricConsumption).toBeGreaterThan(0);
      else expect(v.petrolConsumption).toBeGreaterThan(0);
    }
  });

  it('finds used cars by year', () => {
    const hits = searchCatalogue('2019 mazda', USED_CATALOGUE);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(v => v.year === 2019 && v.make === 'Mazda')).toBe(true);
  });
});

describe('Pick a car grouping', async () => {
  const { USED_CATALOGUE } = await import('../src/data/usedCatalogue');
  const { VEHICLE_CATALOGUE } = await import('../src/data/vehicleCatalogue');
  const { groupByModel, searchCatalogue } = await import('../src/utils/searchCatalogue');

  it('lists each used model once, newest year first', () => {
    const groups = groupByModel(USED_CATALOGUE);
    expect(groups.length).toBeLessThan(USED_CATALOGUE.length);
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(USED_CATALOGUE.length);
    expect(new Set(groups.map(g => g.key)).size).toBe(groups.length);
    const corolla = groups.find(g => g.make === 'Toyota' && g.model === 'Corolla')!;
    expect(corolla.entries.length).toBeGreaterThan(1);
    const years = corolla.entries.map(v => v.year ?? 0);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('sorts models A–Z by make, then model', () => {
    const groups = groupByModel(VEHICLE_CATALOGUE);
    const names = groups.map(g => `${g.make} ${g.model}`);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })));
  });

  it('has no duplicate new cars (same model and price under two names)', () => {
    const keys = VEHICLE_CATALOGUE.map(v => `${v.make}|${v.model}|${v.purchasePrice}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('narrows a model to the searched year', () => {
    const [corolla] = groupByModel(searchCatalogue('corolla 2019', USED_CATALOGUE)).filter(g => g.model === 'Corolla');
    expect(corolla.entries.every(v => v.year === 2019)).toBe(true);
  });
});
