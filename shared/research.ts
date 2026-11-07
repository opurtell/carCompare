// Shared between the browser app and the Cloudflare Worker.
// Pure TypeScript only — no DOM or Workers APIs.

export type FuelType = 'ev' | 'phev' | 'hybrid' | 'petrol';
export type AIProvider = 'openai' | 'anthropic' | 'zai' | 'gemini' | 'custom';

export const AU_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
] as const;

export type AUStateCode = (typeof AU_STATES)[number]['code'];

export interface ResearchParams {
  make: string;
  model: string;
  year: number;
  trim?: string;
  state: AUStateCode;
  /** Used cars get a current second-hand price estimate instead of the new list price. */
  condition?: 'new' | 'used';
  /** Used only: odometer reading, which moves the price estimate. */
  odometerKm?: number;
}

export interface ResearchSources {
  purchasePrice: string;
  consumption: string;
  emissions: string;
  servicing: string;
  insurance: string;
}

/** A page the search-grounded model actually used (from the provider's grounding metadata). */
export interface ResearchCitation {
  title: string;
  url: string;
}

/**
 * Facts about the car only. Stamp duty, rego and CTP are set by ACT law, so the app calculates
 * them itself rather than trusting a model; depreciation and loans are user settings.
 */
export interface ResearchResult {
  name: string;
  fuelType: FuelType;
  /** List price incl. GST, before on-road costs (duty, rego, CTP are added by the app). */
  purchasePrice: number;
  petrolConsumption: number;
  electricConsumption: number;
  /** 0 = unknown (EVs are always 0). */
  co2GPerKm: number;
  /** 0 = unknown. */
  tareKg: number;
  servicingCostPerYear: number;
  insurancePerYear: number;
  sources: ResearchSources;
  citations: ResearchCitation[];
  /** True when purchasePrice is a second-hand price estimate. */
  isUsed: boolean;
}

/** Error codes returned by /api/research so the UI can show a helpful message. */
export type ResearchErrorCode =
  | 'not_configured'
  | 'bad_request'
  | 'rate_limited'
  | 'upstream_auth'
  | 'upstream_rate_limited'
  | 'upstream_error'
  | 'timeout'
  | 'parse_error';

export interface ResearchErrorBody {
  error: string;
  code: ResearchErrorCode;
}

const MAX_TEXT = 60;
const FUEL_TYPES: FuelType[] = ['ev', 'phev', 'hybrid', 'petrol'];

/**
 * Validates an untrusted request body. Returns the cleaned params or an error message.
 */
export function validateResearchParams(
  body: unknown,
  now: Date = new Date(),
): { ok: true; params: ResearchParams } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Request body must be a JSON object.' };
  const b = body as Record<string, unknown>;

  const text = (v: unknown) => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim() : '');
  const make = text(b.make);
  const model = text(b.model);
  const trim = text(b.trim);
  const year = typeof b.year === 'number' ? Math.trunc(b.year) : Number.NaN;
  const state = text(b.state).toUpperCase();

  if (!make || !model) return { ok: false, error: 'Make and model are required.' };
  if (make.length > MAX_TEXT || model.length > MAX_TEXT || trim.length > MAX_TEXT) {
    return { ok: false, error: `Make, model and trim must be ${MAX_TEXT} characters or fewer.` };
  }
  const maxYear = now.getFullYear() + 1;
  if (!Number.isFinite(year) || year < 1990 || year > maxYear) {
    return { ok: false, error: `Year must be between 1990 and ${maxYear}.` };
  }
  if (!AU_STATES.some(s => s.code === state)) return { ok: false, error: 'Unknown state.' };

  const condition = b.condition === 'used' ? 'used' : 'new';
  let odometerKm: number | undefined;
  if (condition === 'used' && b.odometerKm !== undefined && b.odometerKm !== null && b.odometerKm !== '') {
    const km = typeof b.odometerKm === 'number' ? Math.round(b.odometerKm) : Number.NaN;
    if (!Number.isFinite(km) || km < 0 || km > 1_000_000) return { ok: false, error: 'Odometer must be 0 to 1,000,000 km.' };
    odometerKm = km;
  }

  return {
    ok: true,
    params: {
      make, model, year, trim: trim || undefined, state: state as AUStateCode,
      ...(condition === 'used' ? { condition, odometerKm } : {}),
    },
  };
}

const PROMPT_TEMPLATE = `Search the web and find facts about this {{condition}} car as sold in Australia, for a cost-of-ownership calculator.

Car: {{year}} {{make}} {{model}}{{trim}}{{odometer}}
Buyer's state: {{state}}

Return these facts. Use the official Australian figures where they exist (manufacturer AU site, Green Vehicle Guide, CarExpert, Drive, CarsGuide):

- name: full name, e.g. "Toyota RAV4 GXL Hybrid"
- fuelType: one of "ev", "phev", "hybrid", "petrol"
- purchasePrice: {{priceRule}}
- petrolConsumption: official combined L/100km (0 for an EV)
- electricConsumption: kWh/100km (0 unless EV or PHEV)
- co2GPerKm: official combined CO2 g/km (0 for an EV; 0 if not found)
- tareKg: tare mass in kg (kerb mass if tare isn't published; 0 if not found)
- servicingCostPerYear: {{servicingRule}}
- insurancePerYear: typical comprehensive insurance for a private owner in {{state}} (an estimate)
- sources: for each group, the URL of the page the figure came from, or "estimate"

Reply with ONLY this JSON object, no markdown fences or other text:
{
  "name": "string",
  "fuelType": "ev" | "phev" | "hybrid" | "petrol",
  "purchasePrice": number,
  "petrolConsumption": number,
  "electricConsumption": number,
  "co2GPerKm": number,
  "tareKg": number,
  "servicingCostPerYear": number,
  "insurancePerYear": number,
  "sources": {
    "purchasePrice": "URL or estimate",
    "consumption": "URL or estimate",
    "emissions": "URL or estimate",
    "servicing": "URL or estimate",
    "insurance": "URL or estimate"
  }
}

Never invent a URL. If you can't find a figure, give your best estimate and write "estimate" as its source.`;

const NEW_PRICE_RULE =
  'AUD list price including GST but BEFORE on-road costs (no stamp duty, registration or CTP). If you only find a drive-away price, use it and say so in sources.purchasePrice.';
const USED_PRICE_RULE =
  "today's typical Australian second-hand price in AUD for this year and variant{{kmNote}}: the middle of current dealer and private-sale listings (carsales, Drive, Gumtree) or a RedBook guide price. Not the original new price. Name where it came from in sources.purchasePrice.";
const NEW_SERVICING_RULE = "average yearly cost of the brand's capped-price servicing over the first 5 years";
const USED_SERVICING_RULE =
  'typical yearly servicing cost for a car of this age (capped-price servicing if it still applies, otherwise a typical independent-service estimate)';

export function buildResearchPrompt(params: ResearchParams): string {
  const trim = params.trim ? `, ${params.trim}` : '';
  const used = params.condition === 'used';
  const km = used && params.odometerKm !== undefined ? params.odometerKm.toLocaleString('en-AU') : '';
  return PROMPT_TEMPLATE
    .replace(/\{\{condition\}\}/g, used ? 'used (second-hand)' : 'new')
    .replace(/\{\{odometer\}\}/g, km ? `, about ${km} km on the odometer` : '')
    .replace(/\{\{priceRule\}\}/g, used ? USED_PRICE_RULE : NEW_PRICE_RULE)
    .replace(/\{\{kmNote\}\}/g, km ? ` with about ${km} km` : '')
    .replace(/\{\{servicingRule\}\}/g, used ? USED_SERVICING_RULE : NEW_SERVICING_RULE)
    .replace(/\{\{make\}\}/g, params.make)
    .replace(/\{\{model\}\}/g, params.model)
    .replace(/\{\{year\}\}/g, String(params.year))
    .replace(/\{\{trim\}\}/g, trim)
    .replace(/\{\{state\}\}/g, params.state);
}

/** Same car, same answer: normalised so "toyota rav4" and "Toyota RAV4 " share an entry. */
/** Bump when the result shape or prompt changes, so old cached answers are ignored. */
const CACHE_VERSION = 'v3';

export function researchCacheKey(params: ResearchParams): string {
  const norm = (v: string | undefined) => (v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  // Used prices are cached per 10,000 km band, so nearby odometer readings share a lookup.
  const km = params.condition === 'used' ? `used-${Math.round((params.odometerKm ?? -1) / 10_000)}` : 'new';
  const parts = [params.state, params.year, norm(params.make), norm(params.model), norm(params.trim), km];
  return `https://research-cache.internal/${CACHE_VERSION}/${parts.map(p => encodeURIComponent(String(p))).join('/')}`;
}

/**
 * Gemini generateContent body with Google Search grounding, so the model reads real pages
 * instead of guessing. JSON mode can't be combined with search tools, so the reply is plain
 * text and the JSON is pulled out with extractJsonObject.
 */
export function buildGeminiRequest(systemPrompt: string, prompt: string) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    // Room for thinking tokens on models that think by default.
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  };
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
}

/** Answer text (thought parts dropped) plus the pages the search grounding used. Untrusted. */
export function parseGeminiResponse(data: unknown): { content: string; citations: ResearchCitation[] } {
  const candidate = (data as GeminiResponse | null)?.candidates?.[0];
  const content = (candidate?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('');
  const citations = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map(c => ({ url: c.web?.uri ?? '', title: c.web?.title ?? '' }));
  return { content, citations };
}

/** Pull the first {...} block out of a model response (handles ```json fences and preamble). */
export function extractJsonObject(content: string): unknown {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in response');
  return JSON.parse(content.slice(start, end + 1));
}

function num(v: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[$,\s%]/g, '')) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(v: unknown, maxLen: number): string {
  return typeof v === 'string' ? v.trim().slice(0, maxLen) : '';
}

const MAX_CITATIONS = 8;

/** Keeps only well-formed http(s) citations, deduplicated and capped. */
export function sanitizeCitations(raw: unknown): ResearchCitation[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ResearchCitation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const url = safeHttpUrl(str(c.url, 2000));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: str(c.title, 120) || new URL(url).hostname });
    if (out.length >= MAX_CITATIONS) break;
  }
  return out;
}

/**
 * Coerces an untrusted model response into a safe ResearchResult.
 * Numbers are clamped to sane ranges so a hallucinated value can't produce NaN or absurd totals.
 */
export function sanitizeResearchResult(raw: unknown, params: ResearchParams, citations: unknown = []): ResearchResult {
  if (!raw || typeof raw !== 'object') throw new Error('Response is not an object');
  const r = raw as Record<string, unknown>;
  const rawFuel = str(r.fuelType, 10).toLowerCase();
  const fuelType: FuelType = (FUEL_TYPES as string[]).includes(rawFuel) ? (rawFuel as FuelType) : 'petrol';
  const s = (r.sources && typeof r.sources === 'object' ? r.sources : {}) as Record<string, unknown>;

  const purchasePrice = num(r.purchasePrice, 0, 1_000_000);
  if (purchasePrice <= 0) throw new Error('Missing purchase price');

  return {
    name: str(r.name, 80) || `${params.make} ${params.model}`,
    fuelType,
    purchasePrice,
    petrolConsumption: fuelType === 'ev' ? 0 : num(r.petrolConsumption, 0, 40),
    electricConsumption: fuelType === 'ev' || fuelType === 'phev' ? num(r.electricConsumption, 0, 60) : 0,
    co2GPerKm: fuelType === 'ev' ? 0 : Math.round(num(r.co2GPerKm, 0, 600)),
    tareKg: Math.round(num(r.tareKg, 0, 5_000)),
    servicingCostPerYear: num(r.servicingCostPerYear, 0, 20_000),
    insurancePerYear: num(r.insurancePerYear, 0, 30_000),
    sources: {
      purchasePrice: str(s.purchasePrice, 500),
      consumption: str(s.consumption, 500),
      emissions: str(s.emissions, 500),
      servicing: str(s.servicing, 500),
      insurance: str(s.insurance, 500),
    },
    citations: sanitizeCitations(citations),
    isUsed: params.condition === 'used',
  };
}

/** Only http(s) URLs are rendered as links; anything else is shown as plain text. */
export function safeHttpUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
