import type { Language } from '../app/scenario/scenario.types';

const SUPPORTED: readonly Language[] = ['en', 'de'];
const STORAGE_KEY = 'lang';

function isSupported(value: string): value is Language {
  return (SUPPORTED as readonly string[]).includes(value);
}

/** Reads a previously-saved manual language override from localStorage. */
export function readStoredLanguage(): Language | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && isSupported(value)) return value;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredLanguage(lang: Language): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Quota or sandboxed env — non-fatal.
  }
}

/** Maps a BCP-47 language tag to a supported `Language`, falling back to `'en'`. */
export function languageFromTag(tag: string | null | undefined): Language {
  const base = (tag ?? '').toLowerCase().split('-')[0];
  return isSupported(base) ? base : 'en';
}

/** Cold-load precedence: localStorage > navigator.language > 'en'. */
export function detectLanguage(): Language {
  const stored = readStoredLanguage();
  if (stored) return stored;
  if (typeof navigator === 'undefined') return 'en';
  return languageFromTag(navigator.language);
}
