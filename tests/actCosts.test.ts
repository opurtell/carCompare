import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACT_CTP_PREMIUM,
  autoRegoFor,
  autoStampDutyFor,
  calculateActRegistration,
  calculateActStampDuty,
  categoryFromCo2,
  estimateActEmissionsCategory,
} from '../src/calculations/actSpecific';
import { calculateCarResult, vehicleValueAfter } from '../src/calculations/costEngine';
import { createDefaultCarConfig, DEPRECIATION_DEFAULTS } from '../src/data/defaults';
import { resolveCarConfig } from '../src/utils/resolveCarConfig';
import { mergeResearchResultToConfig } from '../src/utils/carConfigMerger';
import { VEHICLE_CATALOGUE } from '../src/data/vehicleCatalogue';
import { searchCatalogue } from '../src/utils/searchCatalogue';
import { safeHttpUrl } from '../shared/research';

const GLOBALS = { petrolPrice: 2.45, electricityPrice: 0.3, annualKm: 15_000 };

describe('ACT emissions category', () => {
  it('follows the Access Canberra CO2 bands at each boundary', () => {
    expect(categoryFromCo2(0)).toBe('AAA');
    expect(categoryFromCo2(1)).toBe('AA');
    expect(categoryFromCo2(65)).toBe('AA');
    expect(categoryFromCo2(66)).toBe('A');
    expect(categoryFromCo2(130)).toBe('A');
    expect(categoryFromCo2(131)).toBe('B');
    expect(categoryFromCo2(175)).toBe('B');
    expect(categoryFromCo2(176)).toBe('C');
    expect(categoryFromCo2(220)).toBe('C');
    expect(categoryFromCo2(221)).toBe('D');
  });

  it('prefers official CO2 over the fuel-use estimate', () => {
    // 8 L/100km estimates C, but an official 167 g/km is B.
    expect(estimateActEmissionsCategory('petrol', 8)).toBe('C');
    expect(estimateActEmissionsCategory('petrol', 8, 167)).toBe('B');
    // A PHEV with a high official figure isn't forced to AA.
    expect(estimateActEmissionsCategory('phev', 2, 46)).toBe('AA');
    expect(estimateActEmissionsCategory('phev', 2, 80)).toBe('A');
    // EVs are always AAA; a non-EV never estimates as AAA.
    expect(estimateActEmissionsCategory('ev', 0, 50)).toBe('AAA');
    expect(estimateActEmissionsCategory('hybrid', 0)).toBe('AA');
  });

  it('feeds official CO2 into stamp duty', () => {
    const at = new Date('2026-11-06T00:00:00+11:00');
    const car = { fuelType: 'petrol' as const, purchasePrice: 40_000, petrolConsumption: 8 };
    expect(autoStampDutyFor({ ...car, co2GPerKm: 167 })).toBeCloseTo(calculateActStampDuty('petrol', 40_000, 0, at, 167));
    // B at $40k: 400 × $3.00; C would be 400 × $3.17.
    expect(calculateActStampDuty('petrol', 40_000, 8, at, 167)).toBeCloseTo(1_200);
    expect(calculateActStampDuty('petrol', 40_000, 8, at)).toBeCloseTo(1_268);
  });
});

describe('ACT registration (DI2026-146 Part 1A + road rescue fee)', () => {
  it('charges the fee for each category under 2,505 kg tare', () => {
    expect(calculateActRegistration('AAA')).toBeCloseTo(394.9 + 33.7);
    expect(calculateActRegistration('AA')).toBeCloseTo(416.1 + 33.7);
    expect(calculateActRegistration('A')).toBeCloseTo(437.7 + 33.7);
    expect(calculateActRegistration('B')).toBeCloseTo(495.0 + 33.7);
    expect(calculateActRegistration('C')).toBeCloseTo(607.3 + 33.7);
    expect(calculateActRegistration('D')).toBeCloseTo(719.6 + 33.7);
  });

  it('steps up at 2,505 kg tare', () => {
    expect(calculateActRegistration('AAA', 2504)).toBeCloseTo(394.9 + 33.7);
    expect(calculateActRegistration('AAA', 2505)).toBeCloseTo(877.4 + 33.7);
    expect(calculateActRegistration('D', 2700)).toBeCloseTo(1114.5 + 33.7);
  });

  it('is calculated for a car unless the user overrides it', () => {
    const car = { ...createDefaultCarConfig('petrol'), co2GPerKm: 140 };
    expect(autoRegoFor(car)).toBeCloseTo(495 + 33.7);
    expect(resolveCarConfig(car, GLOBALS).regoPerYear).toBeCloseTo(495 + 33.7);
    expect(resolveCarConfig({ ...car, regoPerYear: 300, useCustomRego: true }, GLOBALS).regoPerYear).toBe(300);
  });
});

describe('ACT CTP', () => {
  it('defaults to the current class 1 premium, overridable', () => {
    const car = createDefaultCarConfig('ev');
    expect(car.ctpPerYear).toBe(ACT_CTP_PREMIUM);
    expect(resolveCarConfig({ ...car, ctpPerYear: 999 }, GLOBALS).ctpPerYear).toBe(ACT_CTP_PREMIUM);
    expect(resolveCarConfig({ ...car, ctpPerYear: 999, useCustomCtp: true }, GLOBALS).ctpPerYear).toBe(999);
  });
});

describe('depreciation curve', () => {
  it('applies a first-year drop then a steady rate', () => {
    expect(vehicleValueAfter(100_000, 25, 12, 0)).toBe(100_000);
    expect(vehicleValueAfter(100_000, 25, 12, 1)).toBeCloseTo(75_000);
    expect(vehicleValueAfter(100_000, 25, 12, 3)).toBeCloseTo(75_000 * 0.88 * 0.88);
  });

  it('matches the old flat model when both rates are equal', () => {
    const car = { ...createDefaultCarConfig('petrol'), purchasePrice: 40_000, firstYearDepreciationPercent: 13, annualDepreciationPercent: 13 };
    const r = calculateCarResult(car, 5);
    expect(r.yearlyBreakdowns[4].vehicleValue).toBeCloseTo(40_000 * 0.87 ** 5);
    const total = r.yearlyBreakdowns.reduce((s, y) => s + y.depreciation, 0);
    expect(total).toBeCloseTo(40_000 - 40_000 * 0.87 ** 5);
  });

  it('defaults land near published 3-year retained values', () => {
    const kept = (f: keyof typeof DEPRECIATION_DEFAULTS) =>
      vehicleValueAfter(1, DEPRECIATION_DEFAULTS[f].firstYear, DEPRECIATION_DEFAULTS[f].annual, 3);
    expect(kept('ev')).toBeGreaterThan(0.55); // AutoGrab 2024: EVs keep ~60%
    expect(kept('ev')).toBeLessThan(0.65);
    expect(kept('petrol')).toBeGreaterThan(0.55); // benchmark: 35–45% lost
    expect(kept('petrol')).toBeLessThan(0.66);
  });
});

describe('research / catalogue merge', () => {
  it('keeps duty, rego and CTP on auto and fills gaps with defaults', () => {
    const car = mergeResearchResultToConfig(
      { name: 'Test', fuelType: 'hybrid', purchasePrice: 40_000, petrolConsumption: 4.5, electricConsumption: 0,
        co2GPerKm: 102, tareKg: 0, servicingCostPerYear: 0, insurancePerYear: 0 },
      GLOBALS,
    );
    expect(car.useCustomStampDuty).toBe(false);
    expect(car.useCustomRego).toBe(false);
    expect(car.useCustomCtp).toBe(false);
    expect(car.co2GPerKm).toBe(102);
    expect(car.tareKg).toBeUndefined();
    expect(car.servicingCostPerYear).toBe(createDefaultCarConfig('hybrid').servicingCostPerYear);
    expect(car.regoPerYear).toBeCloseTo(437.7 + 33.7);
  });
});

describe('vehicle catalogue', () => {
  it('has unique ids and sane, sourced entries', () => {
    expect(VEHICLE_CATALOGUE.length).toBeGreaterThan(10);
    expect(new Set(VEHICLE_CATALOGUE.map(v => v.id)).size).toBe(VEHICLE_CATALOGUE.length);
    for (const v of VEHICLE_CATALOGUE) {
      expect(v.purchasePrice).toBeGreaterThan(15_000);
      expect(v.purchasePrice).toBeLessThan(200_000);
      if (v.fuelType === 'ev') expect(v.petrolConsumption).toBe(0);
      else expect(v.petrolConsumption).toBeGreaterThan(0);
      expect(v.sources.price && safeHttpUrl(v.sources.price)).toBeTruthy();
    }
  });

  it('searches on every word', () => {
    expect(searchCatalogue('').length).toBe(VEHICLE_CATALOGUE.length);
    expect(searchCatalogue('toyota hybrid').every(v => v.make === 'Toyota' && v.fuelType === 'hybrid')).toBe(true);
    expect(searchCatalogue('zzzz')).toEqual([]);
  });
});

describe('saved-data migration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('moves old flat-default rego/CTP to auto, keeps typed values and old depreciation', async () => {
    const { loadState, STORAGE_KEY } = await import('../src/hooks/useLocalStorage');
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    });
    const old = { ...createDefaultCarConfig('petrol') } as Record<string, unknown>;
    delete old.useCustomRego;
    delete old.useCustomCtp;
    delete old.firstYearDepreciationPercent;
    store[STORAGE_KEY] = JSON.stringify({
      cars: [
        { ...old, id: 'a', regoPerYear: 360, ctpPerYear: 600, annualDepreciationPercent: 13 },
        { ...old, id: 'b', regoPerYear: 512, ctpPerYear: 420, annualDepreciationPercent: 15 },
      ],
    });
    const [a, b] = loadState()!.cars!;
    expect(a.useCustomRego).toBe(false);
    expect(a.useCustomCtp).toBe(false);
    expect(a.firstYearDepreciationPercent).toBe(13);
    expect(b.useCustomRego).toBe(true);
    expect(b.useCustomCtp).toBe(true);
    expect(b.firstYearDepreciationPercent).toBe(15);
  });
});
