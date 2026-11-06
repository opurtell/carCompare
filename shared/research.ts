// Shared between the browser app and the Cloudflare Worker.
// Pure TypeScript only — no DOM or Workers APIs.

export type FuelType = 'ev' | 'phev' | 'hybrid' | 'petrol';
export type AIProvider = 'openai' | 'anthropic' | 'zai' | 'custom';

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
}

export interface ResearchSources {
  purchasePrice: string;
  consumption: string;
  servicing: string;
  insurance: string;
  registration: string;
  stampDuty: string;
}

export interface ResearchResult {
  name: string;
  fuelType: FuelType;
  purchasePrice: number;
  stampDuty: number;
  regoPerYear: number;
  petrolConsumption: number;
  electricConsumption: number;
  phevElectricPercent: number;
  servicingCostPerYear: number;
  insurancePerYear: number;
  ctpPerYear: number;
  annualDepreciationPercent: number;
  evFreeRegoYears: number;
  depreciationModel: 'percentage';
  hasLoan: boolean;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  sources: ResearchSources;
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

  return {
    ok: true,
    params: { make, model, year, trim: trim || undefined, state: state as AUStateCode },
  };
}

const PROMPT_TEMPLATE = `You are a research agent for an Australian car cost-of-ownership comparison tool. Your task is to research a specific vehicle and gather ALL the following data required to configure it in the comparison app.

## Target Vehicle

Make: {{make}}
Model: {{model}}
Year/Variant: {{year}}{{trim}}
State: {{state}}

## Required Data Points

### 1. Basic Information

- **Name**: Full vehicle name (e.g., "Toyota RAV4 Hybrid GXL")
- **Fuel Type**: One of: \`ev\`, \`phev\`, \`hybrid\`, \`petrol\`

### 2. Purchase & Registration (AUSTRALIA SPECIFIC)

- **Purchase Price (AUD)**: On-road price including GST and dealer delivery
- **Stamp Duty (AUD)**: Vehicle stamp duty / motor vehicle duty for {{state}} (calculate from purchase price and current state rates; note the ACT uses CO2-emissions-based categories)
- **Registration Cost (AUD/year)**: Annual vehicle registration fee for {{state}}

### 3. Consumption

- **Petrol Consumption (L/100km)**: Combined cycle ADR rating (set to 0 if EV)
- **Electric Consumption (kWh/100km)**: Energy consumption for EV/PHEV mode (set to 0 if petrol-only)
- **PHEV Electric Percent (%)**: Percentage of driving in EV mode for PHEVs (set to 0 if not PHEV)

### 4. Running Costs (AVERAGES, AUSTRALIA)

- **Servicing Cost (AUD/year)**: Average annual servicing cost from manufacturer schedule
- **Insurance (AUD/year)**: Typical comprehensive insurance cost (provide a reasonable estimate with source)
- **CTP/Greenslip (AUD/year)**: Compulsory third party insurance cost for {{state}}

### 5. Depreciation

- **Depreciation Model**: Use \`percentage\`
- **Annual Depreciation (%)**: Typical annual depreciation rate for this vehicle class/type (e.g., 15-20% for new cars, provide source if available)

### 6. Loan

- Set \`hasLoan\` to false and loan fields to 0 unless financing was specified.

### 7. EV-Specific (Only for EVs/PHEVs)

- **Free Registration Years**: How many years of free registration a vehicle bought now is eligible for in {{state}} (0 if no current scheme)

## Output Format

Provide ONLY a JSON response in this exact structure (no markdown code blocks, no additional text):

{
  "name": "string",
  "fuelType": "ev" | "phev" | "hybrid" | "petrol",
  "purchasePrice": number,
  "stampDuty": number,
  "regoPerYear": number,
  "petrolConsumption": number,
  "electricConsumption": number,
  "phevElectricPercent": number,
  "servicingCostPerYear": number,
  "insurancePerYear": number,
  "ctpPerYear": number,
  "annualDepreciationPercent": number,
  "evFreeRegoYears": number,
  "depreciationModel": "percentage",
  "hasLoan": boolean,
  "loanAmount": number,
  "interestRate": number,
  "loanTermYears": number,
  "sources": {
    "purchasePrice": "URL/source",
    "consumption": "URL/source",
    "servicing": "URL/source",
    "insurance": "URL/source",
    "registration": "URL/source",
    "stampDuty": "URL/source"
  }
}

## Research Guidelines

1. **Prioritise official sources**: Manufacturer websites, Australian government vehicle databases, reputable automotive sites
2. **Use current Australian data**: {{currentYear}} figures where available
3. **State-specific registration/CTP**: Use {{state}} for accurate registration and CTP costs
4. **Provide sources**: Include URLs or references for each data point
5. **Be transparent about estimates**: Clearly label any values that are estimates rather than official figures
6. **On-road prices**: Always include on-road pricing, not list price

## Example Research Sources to Check

- Manufacturer official AU website
- CarsGuide, Drive, CarExpert Australian reviews
- {{state}} revenue office (stamp duty calculators)
- {{state}} transport department (registration fees)
- NRMA/RACV insurance estimators
`;

export function buildResearchPrompt(params: ResearchParams, now: Date = new Date()): string {
  const trim = params.trim ? `, ${params.trim}` : '';
  return PROMPT_TEMPLATE
    .replace(/\{\{make\}\}/g, params.make)
    .replace(/\{\{model\}\}/g, params.model)
    .replace(/\{\{year\}\}/g, String(params.year))
    .replace(/\{\{trim\}\}/g, trim)
    .replace(/\{\{state\}\}/g, params.state)
    .replace(/\{\{currentYear\}\}/g, String(now.getFullYear()));
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

/**
 * Coerces an untrusted model response into a safe ResearchResult.
 * Numbers are clamped to sane ranges so a hallucinated value can't produce NaN or absurd totals.
 */
export function sanitizeResearchResult(raw: unknown, params: ResearchParams): ResearchResult {
  if (!raw || typeof raw !== 'object') throw new Error('Response is not an object');
  const r = raw as Record<string, unknown>;
  const rawFuel = str(r.fuelType, 10).toLowerCase();
  const fuelType: FuelType = (FUEL_TYPES as string[]).includes(rawFuel) ? (rawFuel as FuelType) : 'petrol';
  const s = (r.sources && typeof r.sources === 'object' ? r.sources : {}) as Record<string, unknown>;
  const hasLoan = r.hasLoan === true;

  const purchasePrice = num(r.purchasePrice, 0, 1_000_000);
  if (purchasePrice <= 0) throw new Error('Missing purchase price');

  return {
    name: str(r.name, 80) || `${params.make} ${params.model}`,
    fuelType,
    purchasePrice,
    stampDuty: num(r.stampDuty, 0, 200_000),
    regoPerYear: num(r.regoPerYear, 0, 10_000),
    petrolConsumption: fuelType === 'ev' ? 0 : num(r.petrolConsumption, 0, 40),
    electricConsumption: fuelType === 'ev' || fuelType === 'phev' ? num(r.electricConsumption, 0, 60) : 0,
    phevElectricPercent: fuelType === 'phev' ? num(r.phevElectricPercent, 0, 100, 60) : 0,
    servicingCostPerYear: num(r.servicingCostPerYear, 0, 20_000),
    insurancePerYear: num(r.insurancePerYear, 0, 30_000),
    ctpPerYear: num(r.ctpPerYear, 0, 5_000),
    annualDepreciationPercent: num(r.annualDepreciationPercent, 0, 50, 13),
    evFreeRegoYears: fuelType === 'ev' ? Math.round(num(r.evFreeRegoYears, 0, 5)) : 0,
    depreciationModel: 'percentage',
    hasLoan,
    loanAmount: hasLoan ? num(r.loanAmount, 0, 1_000_000) : 0,
    interestRate: num(r.interestRate, 0, 30, 7) || 7,
    loanTermYears: Math.round(num(r.loanTermYears, 1, 10, 5)) || 5,
    sources: {
      purchasePrice: str(s.purchasePrice, 500),
      consumption: str(s.consumption, 500),
      servicing: str(s.servicing, 500),
      insurance: str(s.insurance, 500),
      registration: str(s.registration, 500),
      stampDuty: str(s.stampDuty, 500),
    },
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
