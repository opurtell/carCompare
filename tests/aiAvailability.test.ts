import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAiAvailable } from '../src/api/carResearchApi';

function stubHealth(response: Response | Error) {
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('isAiAvailable', () => {
  it('is true when the Worker has a key', async () => {
    stubHealth(Response.json({ ok: true, aiConfigured: true, provider: 'zai' }));
    await expect(isAiAvailable()).resolves.toBe(true);
  });

  it('is false when the key is missing', async () => {
    stubHealth(Response.json({ ok: true, aiConfigured: false, provider: 'zai' }));
    await expect(isAiAvailable()).resolves.toBe(false);
  });

  it('is false on an error status', async () => {
    stubHealth(new Response('nope', { status: 500 }));
    await expect(isAiAvailable()).resolves.toBe(false);
  });

  it('is false on a non-JSON response', async () => {
    stubHealth(new Response('<html></html>'));
    await expect(isAiAvailable()).resolves.toBe(false);
  });

  it('is false when the request fails', async () => {
    stubHealth(new TypeError('network'));
    await expect(isAiAvailable()).resolves.toBe(false);
  });
});
