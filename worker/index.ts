import {
  buildResearchPrompt,
  buildGeminiRequest,
  extractJsonObject,
  parseGeminiResponse,
  researchCacheKey,
  sanitizeResearchResult,
  validateResearchParams,
  type AIProvider,
  type ResearchCitation,
  type ResearchErrorBody,
  type ResearchErrorCode,
} from '../shared/research';

export interface Env {
  ASSETS: Fetcher;
  /** gemini | openai | anthropic | zai | custom (OpenAI-compatible). */
  AI_PROVIDER?: string;
  /** Secret — set with `wrangler secret put AI_API_KEY` (or .dev.vars locally). */
  AI_API_KEY?: string;
  /** Optional model override. */
  AI_MODEL?: string;
  /** Required for `custom`; optional override for the others. */
  AI_ENDPOINT?: string;
  /** Workers Rate Limiting binding (optional — absent in some local setups). */
  RESEARCH_RATE_LIMITER?: RateLimit;
}

const PROVIDERS: Record<Exclude<AIProvider, 'custom'>, { url: string; model: string }> = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  anthropic: { url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5-5' },
  zai: { url: 'https://api.z.ai/api/paas/v4/chat/completions', model: 'glm-5' },
  // `{model}` is filled in per request. Grounded with Google Search, so it reads real pages.
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', model: 'gemini-2.5-flash' },
};

/** Lookups are cached per car so repeat lookups are free and fast (Cache API, per data centre). */
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

const UPSTREAM_TIMEOUT_MS = 120_000;
const SYSTEM_PROMPT = 'You are a helpful research assistant that returns only valid JSON.';

class ResearchError extends Error {
  readonly status: number;
  readonly code: ResearchErrorCode;
  constructor(status: number, code: ResearchErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function errorResponse(err: ResearchError): Response {
  const body: ResearchErrorBody = { error: err.message, code: err.code };
  return json(body, err.status);
}

function resolveProvider(env: Env): { provider: AIProvider; url: string; model: string } {
  const provider = (env.AI_PROVIDER || 'gemini').toLowerCase() as AIProvider;
  if (provider === 'custom') {
    if (!env.AI_ENDPOINT) throw new ResearchError(503, 'not_configured', 'AI_ENDPOINT is required for the custom provider.');
    return { provider, url: env.AI_ENDPOINT, model: env.AI_MODEL || 'gpt-4o' };
  }
  const preset = PROVIDERS[provider];
  if (!preset) throw new ResearchError(503, 'not_configured', `Unsupported AI_PROVIDER "${provider}".`);
  const model = env.AI_MODEL || preset.model;
  const url = (env.AI_ENDPOINT || preset.url).replace('{model}', encodeURIComponent(model));
  return { provider, url, model };
}

interface ProviderReply {
  content: string;
  /** Pages the provider's own search grounding used (Gemini only). Untrusted until sanitised. */
  citations: ResearchCitation[];
}

async function callProvider(env: Env, prompt: string): Promise<ProviderReply> {
  const apiKey = env.AI_API_KEY;
  if (!apiKey) throw new ResearchError(503, 'not_configured', 'AI research is not configured on the server (AI_API_KEY missing).');
  const { provider, url, model } = resolveProvider(env);

  const isAnthropic = provider === 'anthropic';
  const isGemini = provider === 'gemini';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  let body: unknown;
  if (isGemini) {
    headers['x-goog-api-key'] = apiKey;
    body = buildGeminiRequest(SYSTEM_PROMPT, prompt);
  } else if (isAnthropic) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown code blocks, no additional text.` }],
    };
  } else {
    headers.authorization = `Bearer ${apiKey}`;
    body = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      stream: false,
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new ResearchError(504, 'timeout', 'The AI service took too long to respond. Please try again.');
    }
    throw new ResearchError(502, 'upstream_error', 'Failed to reach the AI service.');
  }

  if (!res.ok) {
    // Log upstream detail server-side only; never echo it (it can contain account info).
    console.error(`[research] ${provider} HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    if (res.status === 401 || res.status === 403) {
      throw new ResearchError(502, 'upstream_auth', 'The AI service rejected the server API key.');
    }
    if (res.status === 429) {
      throw new ResearchError(503, 'upstream_rate_limited', 'The AI service is rate limiting requests. Please wait a moment and try again.');
    }
    throw new ResearchError(502, 'upstream_error', `The AI service returned an error (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    content?: { type?: string; text?: string }[];
  };
  let content: string | undefined;
  let citations: ResearchCitation[] = [];
  if (isGemini) {
    ({ content, citations } = parseGeminiResponse(data));
  } else if (isAnthropic) {
    content = data.content?.filter(c => c.type === 'text').map(c => c.text ?? '').join('');
  } else {
    content = data.choices?.[0]?.message?.content;
  }
  if (!content) throw new ResearchError(502, 'parse_error', 'The AI service returned an empty response.');
  return { content, citations };
}

/** The Cache API is unavailable in some local setups; treat that as a miss. */
function researchCache(): Cache | null {
  try {
    return typeof caches !== 'undefined' ? caches.default : null;
  } catch {
    return null;
  }
}

/** Blocks cross-site use of the endpoint from other origins' browsers. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser or same-origin GET-style request
  return origin === new URL(request.url).origin;
}

async function handleResearch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed', code: 'bad_request' }, 405);
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.', code: 'bad_request' }, 403);

  if (env.RESEARCH_RATE_LIMITER) {
    const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await env.RESEARCH_RATE_LIMITER.limit({ key });
    if (!success) {
      return errorResponse(new ResearchError(429, 'rate_limited', 'Too many research requests. Please wait a minute and try again.'));
    }
  }

  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 2_000) throw new Error('too large');
    payload = JSON.parse(text);
  } catch {
    return errorResponse(new ResearchError(400, 'bad_request', 'Invalid JSON body.'));
  }

  const validated = validateResearchParams(payload);
  if (!validated.ok) return errorResponse(new ResearchError(400, 'bad_request', validated.error));

  const cache = researchCache();
  const cacheKey = new Request(researchCacheKey(validated.params));
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) {
    return new Response(cached.body, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-research-cache': 'hit' },
    });
  }

  try {
    const { content, citations } = await callProvider(env, buildResearchPrompt(validated.params));
    let result;
    try {
      result = sanitizeResearchResult(extractJsonObject(content), validated.params, citations);
    } catch {
      throw new ResearchError(502, 'parse_error', 'Unable to parse the AI response. Please try again.');
    }
    const body = JSON.stringify(result);
    if (cache) {
      ctx.waitUntil(
        cache
          .put(cacheKey, new Response(body, {
            headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` },
          }))
          .catch(() => undefined),
      );
    }
    return new Response(body, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-research-cache': 'miss' },
    });
  } catch (e) {
    if (e instanceof ResearchError) return errorResponse(e);
    console.error('[research] unexpected error', e);
    return errorResponse(new ResearchError(500, 'upstream_error', 'Unexpected server error.'));
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/research') return handleResearch(request, env, ctx);
    if (url.pathname === '/api/health') {
      let provider: string | null = null;
      try {
        provider = resolveProvider(env).provider;
      } catch {
        provider = null;
      }
      return json({ ok: true, aiConfigured: Boolean(env.AI_API_KEY && provider), provider });
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found', code: 'bad_request' }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
