import { describe, expect, it } from 'vitest';
import {
  extractJsonObject,
  safeHttpUrl,
  sanitizeResearchResult,
  validateResearchParams,
  type ResearchParams,
} from '../shared/research';

const params: ResearchParams = { make: 'Toyota', model: 'RAV4', year: 2026, state: 'ACT' };

describe('validateResearchParams', () => {
  it('accepts and trims valid input', () => {
    const r = validateResearchParams({ make: ' Toyota ', model: 'RAV4', year: 2026, state: 'act' }, new Date('2026-11-06'));
    expect(r).toEqual({ ok: true, params: { make: 'Toyota', model: 'RAV4', year: 2026, trim: undefined, state: 'ACT' } });
  });

  it('rejects bad state, year and oversized text', () => {
    expect(validateResearchParams({ make: 'a', model: 'b', year: 2026, state: 'XX' }).ok).toBe(false);
    expect(validateResearchParams({ make: 'a', model: 'b', year: 1800, state: 'ACT' }).ok).toBe(false);
    expect(validateResearchParams({ make: 'a'.repeat(61), model: 'b', year: 2026, state: 'ACT' }).ok).toBe(false);
  });
});

describe('sanitizeResearchResult', () => {
  it('coerces strings, clamps ranges and fixes unknown fuel types', () => {
    const r = sanitizeResearchResult(
      { name: 'X', fuelType: 'diesel', purchasePrice: '$45,990', insurancePerYear: -5, annualDepreciationPercent: 400, sources: {} },
      params,
    );
    expect(r.fuelType).toBe('petrol');
    expect(r.purchasePrice).toBe(45_990);
    expect(r.insurancePerYear).toBe(0);
    expect(r.annualDepreciationPercent).toBe(50);
    expect(r.loanTermYears).toBe(5);
  });

  it('zeros petrol consumption for EVs', () => {
    const r = sanitizeResearchResult({ fuelType: 'ev', purchasePrice: 50_000, petrolConsumption: 7 }, params);
    expect(r.petrolConsumption).toBe(0);
  });

  it('throws without a purchase price', () => {
    expect(() => sanitizeResearchResult({ fuelType: 'ev' }, params)).toThrow();
  });
});

describe('helpers', () => {
  it('extracts JSON from fenced output', () => {
    expect(extractJsonObject('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('only allows http(s) links', () => {
    expect(safeHttpUrl('https://drive.com.au/x')).toBe('https://drive.com.au/x');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('Manufacturer website')).toBeNull();
  });
});
