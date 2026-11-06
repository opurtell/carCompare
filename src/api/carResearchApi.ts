import type { ResearchErrorBody, ResearchParams, ResearchResult } from '../../shared/research';

export type { ResearchParams, ResearchResult } from '../../shared/research';

export class ResearchApiError extends Error {
  readonly code: ResearchErrorBody['code'] | 'network';
  constructor(message: string, code: ResearchApiError['code']) {
    super(message);
    this.name = 'ResearchApiError';
    this.code = code;
  }
}

/**
 * Calls the app's own Worker endpoint. The AI provider key never reaches the browser —
 * it lives in the Worker as the AI_API_KEY secret (or .dev.vars when running locally).
 */
export async function researchVehicle(params: ResearchParams, signal?: AbortSignal): Promise<ResearchResult> {
  let response: Response;
  try {
    response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ResearchApiError('Could not reach the server. Check your connection and try again.', 'network');
  }

  if (!response.ok) {
    let body: Partial<ResearchErrorBody> = {};
    try {
      body = await response.json();
    } catch {
      // non-JSON error page
    }
    throw new ResearchApiError(
      body.error ?? `Research failed (HTTP ${response.status}).`,
      body.code ?? 'upstream_error',
    );
  }

  return (await response.json()) as ResearchResult;
}
