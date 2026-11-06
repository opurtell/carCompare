import { describe, expect, it } from 'vitest';
import {
  buildResearchPrompt,
  extractJsonObject,
  safeHttpUrl,
  sanitizeCitations,
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
      { name: 'X', fuelType: 'diesel', purchasePrice: '$45,990', insurancePerYear: -5, co2GPerKm: 9999, tareKg: '1,610', sources: {} },
      params,
    );
    expect(r.fuelType).toBe('petrol');
    expect(r.purchasePrice).toBe(45_990);
    expect(r.insurancePerYear).toBe(0);
    expect(r.co2GPerKm).toBe(600);
    expect(r.tareKg).toBe(1610);
    expect(r.citations).toEqual([]);
  });

  it('never returns duty, rego or CTP: the app calculates those', () => {
    const r = sanitizeResearchResult({ fuelType: 'ev', purchasePrice: 50_000, stampDuty: 1, regoPerYear: 1, ctpPerYear: 1 }, params);
    expect(r).not.toHaveProperty('stampDuty');
    expect(r).not.toHaveProperty('regoPerYear');
    expect(r).not.toHaveProperty('ctpPerYear');
  });

  it('zeros CO2 for EVs', () => {
    expect(sanitizeResearchResult({ fuelType: 'ev', purchasePrice: 50_000, co2GPerKm: 120 }, params).co2GPerKm).toBe(0);
  });

  it('zeros petrol consumption for EVs', () => {
    const r = sanitizeResearchResult({ fuelType: 'ev', purchasePrice: 50_000, petrolConsumption: 7 }, params);
    expect(r.petrolConsumption).toBe(0);
  });

  it('throws without a purchase price', () => {
    expect(() => sanitizeResearchResult({ fuelType: 'ev' }, params)).toThrow();
  });
});

describe('sanitizeCitations', () => {
  it('keeps http(s) links only, dedupes, caps and fills titles', () => {
    const raw = [
      { url: 'https://www.carexpert.com.au/a', title: 'CarExpert' },
      { url: 'https://www.carexpert.com.au/a', title: 'dupe' },
      { url: 'javascript:alert(1)', title: 'bad' },
      { url: 'https://drive.com.au/b' },
      'nonsense',
      ...Array.from({ length: 20 }, (_, i) => ({ url: `https://x.com/${i}`, title: 't' })),
    ];
    const c = sanitizeCitations(raw);
    expect(c[0]).toEqual({ url: 'https://www.carexpert.com.au/a', title: 'CarExpert' });
    expect(c[1]).toEqual({ url: 'https://drive.com.au/b', title: 'drive.com.au' });
    expect(c).toHaveLength(8);
    expect(sanitizeCitations('nope')).toEqual([]);
  });
});

describe('buildResearchPrompt', () => {
  it('asks for car facts, not duty or rego', () => {
    const prompt = buildResearchPrompt({ ...params, trim: 'GXL' });
    expect(prompt).toContain('2026 Toyota RAV4, GXL');
    expect(prompt).toContain('co2GPerKm');
    expect(prompt).not.toContain('stampDuty');
    expect(prompt).not.toContain('{{');
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

describe('research cache key', () => {
  it('normalises case and spacing so repeat lookups share an entry', async () => {
    const { researchCacheKey } = await import('../shared/research');
    const a = researchCacheKey({ make: 'Toyota', model: 'RAV4 ', year: 2026, state: 'ACT' });
    const b = researchCacheKey({ make: 'toyota', model: 'rav4', year: 2026, state: 'ACT', trim: '' });
    expect(a).toBe(b);
    expect(a).not.toBe(researchCacheKey({ make: 'Toyota', model: 'RAV4', year: 2025, state: 'ACT' }));
  });
});

describe('Gemini helpers', () => {
  it('asks for Google Search grounding', async () => {
    const { buildGeminiRequest } = await import('../shared/research');
    const body = buildGeminiRequest('sys', 'find the car');
    expect(body.tools).toEqual([{ google_search: {} }]);
    expect(body.contents[0].parts[0].text).toBe('find the car');
    expect(body.systemInstruction.parts[0].text).toBe('sys');
  });

  it('reads text without thoughts, and grounding pages, end to end through the sanitiser', async () => {
    const { parseGeminiResponse } = await import('../shared/research');
    const { content, citations } = parseGeminiResponse({
      candidates: [{
        content: { parts: [{ text: 'thinking...', thought: true }, { text: '{"fuelType":"hybrid","purchasePrice":48990,' }, { text: '"co2GPerKm":102}' }] },
        groundingMetadata: { groundingChunks: [{ web: { uri: 'https://www.carexpert.com.au/x', title: 'carexpert.com.au' } }, { web: {} }] },
      }],
    });
    const r = sanitizeResearchResult(extractJsonObject(content), params, citations);
    expect(r.purchasePrice).toBe(48_990);
    expect(r.co2GPerKm).toBe(102);
    expect(r.citations).toEqual([{ url: 'https://www.carexpert.com.au/x', title: 'carexpert.com.au' }]);
    expect(parseGeminiResponse(null)).toEqual({ content: '', citations: [] });
  });
});
