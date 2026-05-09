import { _resetShortenerCache, shorten } from './shortener';

// All tests stub globalThis.fetch — no live network calls hit is.gd.
describe('shortener', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetShortenerCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): void {
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      return impl(url, init);
    }) as typeof fetch;
  }

  it('returns the shortened URL on success and marks shortened=true', async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ shorturl: 'https://is.gd/abc123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await shorten('https://example.com/?s=looooong');

    expect(result.url).toBe('https://is.gd/abc123');
    expect(result.shortened).toBe(true);
  });

  it('passes the long URL to the shortener as a URL-encoded query param', async () => {
    let captured: string | null = null;
    stubFetch(async (url) => {
      captured = url;
      return new Response(JSON.stringify({ shorturl: 'https://is.gd/x' }));
    });

    await shorten('https://example.com/?s={"a":1}');

    expect(captured).toContain('format=json');
    expect(captured).toContain(encodeURIComponent('https://example.com/?s={"a":1}'));
  });

  it('returns the long URL with shortened=false when fetch rejects', async () => {
    stubFetch(async () => {
      throw new TypeError('Network down');
    });

    const result = await shorten('https://example.com/long');

    expect(result.url).toBe('https://example.com/long');
    expect(result.shortened).toBe(false);
  });

  it('returns long URL on non-OK HTTP status', async () => {
    stubFetch(async () => new Response('rate limited', { status: 502 }));

    const result = await shorten('https://example.com/long');

    expect(result.url).toBe('https://example.com/long');
    expect(result.shortened).toBe(false);
  });

  it('returns long URL when response JSON has no shorturl', async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ errorcode: 1, errormessage: 'invalid' }), {
        status: 200,
      }),
    );

    const result = await shorten('https://example.com/long');

    expect(result.url).toBe('https://example.com/long');
    expect(result.shortened).toBe(false);
  });

  it('caches successful results — repeat calls do not refetch', async () => {
    let callCount = 0;
    stubFetch(async () => {
      callCount++;
      return new Response(JSON.stringify({ shorturl: 'https://is.gd/cached' }));
    });

    const longUrl = 'https://example.com/cached';
    const first = await shorten(longUrl);
    const second = await shorten(longUrl);

    expect(callCount).toBe(1);
    expect(first.url).toBe('https://is.gd/cached');
    expect(second.url).toBe('https://is.gd/cached');
    expect(second.shortened).toBe(true);
  });

  it('does not cache failures — a later success replaces the long-URL fallback', async () => {
    let firstCall = true;
    stubFetch(async () => {
      if (firstCall) {
        firstCall = false;
        throw new Error('flake');
      }
      return new Response(JSON.stringify({ shorturl: 'https://is.gd/now-up' }));
    });

    const longUrl = 'https://example.com/flaky';
    const failed = await shorten(longUrl);
    const recovered = await shorten(longUrl);

    expect(failed.shortened).toBe(false);
    expect(recovered.shortened).toBe(true);
    expect(recovered.url).toBe('https://is.gd/now-up');
  });

  it('aborts and falls back to long URL when the request stalls past the 2.5s timeout', async () => {
    // Stall the fetch indefinitely; resolve only when AbortController fires.
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );

    jasmine.clock().install();
    try {
      const promise = shorten('https://example.com/slow');
      jasmine.clock().tick(2600);
      const result = await promise;

      expect(result.url).toBe('https://example.com/slow');
      expect(result.shortened).toBe(false);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
