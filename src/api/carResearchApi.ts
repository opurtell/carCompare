import type { FuelType, DepreciationModel } from '../types/car';

export type AIProvider = 'openai' | 'anthropic' | 'zai' | 'custom';

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
  depreciationModel: DepreciationModel;
  hasLoan: boolean;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  useSolarCharging: false;
  solarRate: 0;
  solarChargingPercent: 0;
  sources: {
    purchasePrice: string;
    consumption: string;
    servicing: string;
    insurance: string;
    registration: string;
    stampDuty: string;
  };
}

export interface ResearchParams {
  make: string;
  model: string;
  year: number;
  trim?: string;
  state: string;
}

export class ApiKeyError extends Error {
  constructor() {
    super('API key not configured. Please set VITE_AI_API_KEY in your .env file.');
    this.name = 'ApiKeyError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Failed to connect to AI service. Check your network connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded. Please wait a moment and try again.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ParseError extends Error {
  constructor(message: string = 'Unable to parse AI response. Please try again.') {
    super(message);
    this.name = 'ParseError';
  }
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
- **Stamp Duty (AUD)**: Vehicle stamp duty for {{state}} (calculate based on purchase price and state rates)
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

### 6. Loan (Optional - Skip if financing not specified)

- **Loan Amount (AUD)**: Typically equals purchase price minus deposit
- **Interest Rate (%)**: Current Australian car loan rates
- **Loan Term (years)**: Typical term (1-7 years)

### 7. EV-Specific (Only for EVs/PHEVs)

- **Free Registration Years**: How many years the vehicle is eligible for free registration in {{state}}
- **Use Solar Charging**: \`false\` by default (user configurable)

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
  "useSolarCharging": false,
  "solarRate": 0,
  "solarChargingPercent": 0,
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
2. **Use current Australian data**: 2025-2026 figures where available
3. **State-specific registration/CTP**: Use {{state}} for accurate registration and CTP costs
4. **Provide sources**: Include URLs or references for each data point
5. **Be transparent about estimates**: Clearly label any values that are estimates rather than official figures
6. **On-road prices**: Always include on-road pricing, not list price

## Example Research Sources to Check

- Manufacturer official AU website
- CarsGuide, Drive, CarAdvice Australian reviews
- {{state}} revenue office (stamp duty calculators)
- {{state}} transport department (registration fees)
- NRMA/RACV insurance estimators
`;

function getProxyUrl(provider: AIProvider, directUrl: string): string {
  // If custom endpoint is provided, use it directly
  if (import.meta.env.VITE_AI_ENDPOINT) {
    return import.meta.env.VITE_AI_ENDPOINT;
  }

  // In development, use Vite proxy to avoid CORS
  if (import.meta.env.DEV) {
    switch (provider) {
      case 'openai':
        return '/api/openai/chat/completions';
      case 'anthropic':
        return '/api/anthropic/messages';
      case 'zai':
        return '/api/zai/chat/completions';
      default:
        return directUrl;
    }
  }

  // Production - use direct URL (requires proxy server)
  return directUrl;
}

function buildPrompt(params: ResearchParams): string {
  const trim = params.trim ? `, ${params.trim}` : '';
  return PROMPT_TEMPLATE
    .replace(/\{\{make\}\}/g, params.make)
    .replace(/\{\{model\}\}/g, params.model)
    .replace(/\{\{year\}\}/g, String(params.year))
    .replace(/\{\{trim\}\}/g, trim)
    .replace(/\{\{state\}\}/g, params.state);
}

async function callOpenAI(prompt: string, apiKey: string, endpoint?: string): Promise<ResearchResult> {
  const url = endpoint || getProxyUrl('openai', 'https://api.openai.com/v1/chat/completions');
  console.log('[carResearchApi] OpenAI URL:', url);
  console.log('[carResearchApi] is dev mode:', import.meta.env.DEV);
  console.log('[carResearchApi] custom endpoint:', import.meta.env.VITE_AI_ENDPOINT);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful research assistant that returns only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });
  } catch (err) {
    // Network error, CORS error, etc.
    if (err instanceof TypeError) {
      throw new NetworkError(
        'CORS or network error. AI APIs typically require a server-side proxy. ' +
        'Set VITE_AI_ENDPOINT to a proxy URL, or use VITE_AI_PROXY_URL.'
      );
    }
    throw new NetworkError(err instanceof Error ? err.message : 'Failed to connect to AI service.');
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new ApiKeyError();
    }
    if (status === 429) {
      throw new RateLimitError();
    }
    if (status >= 500) {
      throw new NetworkError('AI service is temporarily unavailable.');
    }
    throw new NetworkError(`HTTP ${status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new ParseError('No content in AI response');
  }

  // Try to extract JSON from response (in case it's wrapped in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;

  try {
    return JSON.parse(jsonStr) as ResearchResult;
  } catch {
    throw new ParseError();
  }
}

async function callAnthropic(prompt: string, apiKey: string, endpoint?: string): Promise<ResearchResult> {
  const url = endpoint || getProxyUrl('anthropic', 'https://api.anthropic.com/v1/messages');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown code blocks, no additional text.',
          },
        ],
      }),
    });
  } catch (err) {
    // Network error, CORS error, etc.
    if (err instanceof TypeError) {
      throw new NetworkError(
        'CORS or network error. AI APIs typically require a server-side proxy. ' +
        'Set VITE_AI_ENDPOINT to a proxy URL, or use VITE_AI_PROXY_URL.'
      );
    }
    throw new NetworkError(err instanceof Error ? err.message : 'Failed to connect to AI service.');
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new ApiKeyError();
    }
    if (status === 429) {
      throw new RateLimitError();
    }
    if (status >= 500) {
      throw new NetworkError('AI service is temporarily unavailable.');
    }
    throw new NetworkError(`HTTP ${status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new ParseError('No content in AI response');
  }

  // Try to extract JSON from response (in case it's wrapped in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;

  try {
    return JSON.parse(jsonStr) as ResearchResult;
  } catch {
    throw new ParseError();
  }
}

async function callZai(prompt: string, apiKey: string, endpoint?: string): Promise<ResearchResult> {
  const url = endpoint || getProxyUrl('zai', 'https://api.z.ai/api/paas/v4/chat/completions');
  const model = import.meta.env.VITE_ZAI_MODEL || 'glm-5';
  console.log('[carResearchApi] z.ai URL:', url);
  console.log('[carResearchApi] z.ai model:', model);
  console.log('[carResearchApi] is dev mode:', import.meta.env.DEV);
  console.log('[carResearchApi] custom endpoint:', import.meta.env.VITE_AI_ENDPOINT);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful research assistant that returns only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        stream: false,
      }),
    });
  } catch (err) {
    // Network error, CORS error, etc.
    if (err instanceof TypeError) {
      throw new NetworkError(
        'CORS or network error. AI APIs typically require a server-side proxy. ' +
        'Set VITE_AI_ENDPOINT to a proxy URL, or use VITE_AI_PROXY_URL.'
      );
    }
    throw new NetworkError(err instanceof Error ? err.message : 'Failed to connect to AI service.');
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new ApiKeyError();
    }
    if (status === 429) {
      throw new RateLimitError();
    }
    if (status >= 500) {
      throw new NetworkError('AI service is temporarily unavailable.');
    }
    throw new NetworkError(`HTTP ${status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new ParseError('No content in AI response');
  }

  // Try to extract JSON from response (in case it's wrapped in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;

  try {
    return JSON.parse(jsonStr) as ResearchResult;
  } catch {
    throw new ParseError();
  }
}

export async function researchVehicle(params: ResearchParams): Promise<ResearchResult> {
  const provider = (import.meta.env.VITE_AI_PROVIDER as AIProvider) || 'openai';
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  const endpoint = import.meta.env.VITE_AI_ENDPOINT;

  if (!apiKey) {
    throw new ApiKeyError();
  }

  const prompt = buildPrompt(params);

  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, apiKey, endpoint);
    case 'anthropic':
      return callAnthropic(prompt, apiKey, endpoint);
    case 'zai':
      return callZai(prompt, apiKey, endpoint);
    case 'custom':
      // For custom providers, assume OpenAI-compatible API
      if (!endpoint) {
        throw new NetworkError('VITE_AI_ENDPOINT is required for custom provider');
      }
      return callOpenAI(prompt, apiKey, endpoint);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
