// is.gd shorten endpoint — public, no auth, CORS-permissive. Returns
// `{ shorturl }` on success or `{ errorcode, errormessage }` on error.
const ISGD_ENDPOINT = 'https://is.gd/create.php';
const TIMEOUT_MS = 2500;

const cache = new Map<string, string>();

export interface ShortenResult {
  url: string;
  // True when `url` is the as-shortened URL; false when the shortener
  // failed and `url` is the original long URL (the popup uses this to
  // show "Couldn't shorten" inline).
  shortened: boolean;
}

export async function shorten(longUrl: string): Promise<ShortenResult> {
  const cached = cache.get(longUrl);
  if (cached) return { url: cached, shortened: true };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${ISGD_ENDPOINT}?format=json&url=${encodeURIComponent(longUrl)}`,
      { signal: ctrl.signal },
    );
    if (!res.ok) return { url: longUrl, shortened: false };
    const body = (await res.json()) as { shorturl?: string; errorcode?: number };
    if (!body.shorturl) return { url: longUrl, shortened: false };
    cache.set(longUrl, body.shorturl);
    return { url: body.shorturl, shortened: true };
  } catch {
    return { url: longUrl, shortened: false };
  } finally {
    clearTimeout(timer);
  }
}

// Test-only escape hatch — Karma specs need to reset between cases.
export function _resetShortenerCache(): void {
  cache.clear();
}
