import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { ScenarioSnapshot, Tab } from './scenario.types';

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

export function hasAnyState(query: URLSearchParams): boolean {
  return query.has(URL_PARAM) || query.has(SHARE_PARAM);
}
