import type { ScenarioSnapshot, Tab } from './scenario.types';

// Persistence format: a single URL query param holding URL-encoded JSON of
// `{ v: SNAPSHOT_VERSION, ...snapshot }`. Bumping `v` is how we evolve the
// format without writing migrations — older payloads fall back to defaults
// and the user re-enters their inputs once.
export const URL_PARAM = 's';
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

export function tabFromPath(pathname: string): Tab | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg === 'lease' || seg === 'finance' || seg === 'cash') return seg;
  return null;
}

/** Did the URL carry user-set state? Used by SplashPage's skip rule. */
export function hasAnyState(query: URLSearchParams): boolean {
  return query.has(URL_PARAM);
}