import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { ScenarioSnapshot, Tab } from './scenario.types';

// Persistence + sharing.
//
// The `?s=` URL param holds raw versioned JSON (`{ v, ...snapshot }`),
// written by the autosave effect. Readable, debuggable, no codec required.
//
// The `?c=` URL param holds the same payload aggressively compressed for
// share links: deflate-raw at level 9 (no zlib/gzip header bytes — saves
// ~6 bytes vs. plain deflate) + URL-safe base64 (no padding, `-` and `_`
// instead of `+` and `/`). Decoder accepts either param.
//
// On the recipient side: opening a `?c=...` link lets the app boot, and
// the first state change triggers the autosave to rewrite the URL as
// `?s=<JSON>` — so the recipient's address bar settles to the readable
// form after one interaction.
//
// Bumping `v` is how we evolve the format — older payloads fall back to
// defaults and the user re-enters their inputs once.
export const URL_PARAM = 's';
export const SHARE_PARAM = 'c';
export const SNAPSHOT_VERSION = 2;

export function encodeSnapshot(snap: ScenarioSnapshot): string {
  return JSON.stringify({ v: SNAPSHOT_VERSION, ...snap });
}

export function decodeSnapshot(raw: string | null | undefined): Partial<ScenarioSnapshot> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { v?: number } & Partial<ScenarioSnapshot>;
    if (!parsed || typeof parsed !== 'object') return {};
    if (parsed.v !== SNAPSHOT_VERSION) return {};
    const { v: _v, ...rest } = parsed;
    return rest;
  } catch {
    return {};
  }
}

/** Compresses the full versioned snapshot JSON for share-friendly URLs.
 * Output is URL-safe (`[A-Za-z0-9\-_]`) so it can be pasted into a query
 * param without further percent-encoding. fflate's `level: 9` is the most
 * aggressive deflate setting available. */
export function encodeShareSnapshot(snap: ScenarioSnapshot): string {
  const bytes = strToU8(encodeSnapshot(snap));
  const deflated = deflateSync(bytes, { level: 9 });
  return base64UrlEncode(deflated);
}

export function decodeShareSnapshot(
  raw: string | null | undefined,
): Partial<ScenarioSnapshot> {
  if (!raw) return {};
  try {
    const bytes = base64UrlDecode(raw);
    const inflated = inflateSync(bytes);
    return decodeSnapshot(strFromU8(inflated));
  } catch {
    return {};
  }
}

/** Standard base64 with URL-safe alphabet and stripped padding. */
function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function tabFromPath(pathname: string): Tab | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg === 'lease' || seg === 'finance' || seg === 'cash') return seg;
  return null;
}

/** Did the URL carry user-set state via either persistence param? Used by
 * SplashPage's skip rule. */
export function hasAnyState(query: URLSearchParams): boolean {
  return query.has(URL_PARAM) || query.has(SHARE_PARAM);
}