import { localeFromLanguage, localeFromTimezone } from './locale.config';

describe('localeFromTimezone', () => {
  it('maps common US timezones to US', () => {
    expect(localeFromTimezone('America/New_York')).toBe('US');
    expect(localeFromTimezone('America/Los_Angeles')).toBe('US');
    expect(localeFromTimezone('America/Chicago')).toBe('US');
    expect(localeFromTimezone('America/Denver')).toBe('US');
    expect(localeFromTimezone('America/Phoenix')).toBe('US');
    expect(localeFromTimezone('America/Anchorage')).toBe('US');
    expect(localeFromTimezone('Pacific/Honolulu')).toBe('US');
  });

  it('maps any Europe/* timezone to EU', () => {
    expect(localeFromTimezone('Europe/Berlin')).toBe('EU');
    expect(localeFromTimezone('Europe/Zurich')).toBe('EU');
    expect(localeFromTimezone('Europe/Paris')).toBe('EU');
    expect(localeFromTimezone('Europe/London')).toBe('EU');
    expect(localeFromTimezone('Europe/Vienna')).toBe('EU');
  });

  it('returns null for non-US, non-Europe timezones (so caller can fall back)', () => {
    expect(localeFromTimezone('Asia/Tokyo')).toBe(null);
    expect(localeFromTimezone('America/Toronto')).toBe(null); // Canada — not US-listed
    expect(localeFromTimezone('America/Mexico_City')).toBe(null);
    expect(localeFromTimezone('Australia/Sydney')).toBe(null);
  });

  it('returns null for empty/missing input', () => {
    expect(localeFromTimezone(null)).toBe(null);
    expect(localeFromTimezone(undefined)).toBe(null);
    expect(localeFromTimezone('')).toBe(null);
  });
});

describe('localeFromLanguage', () => {
  it('maps en-US and en to US', () => {
    expect(localeFromLanguage('en-US')).toBe('US');
    expect(localeFromLanguage('en-us')).toBe('US');
    expect(localeFromLanguage('en')).toBe('US');
  });

  it('maps everything else to EU', () => {
    expect(localeFromLanguage('de-CH')).toBe('EU');
    expect(localeFromLanguage('de-DE')).toBe('EU');
    expect(localeFromLanguage('fr-FR')).toBe('EU');
    expect(localeFromLanguage('en-GB')).toBe('EU');
    expect(localeFromLanguage('ja-JP')).toBe('EU');
  });

  it('falls back to US when input is missing', () => {
    expect(localeFromLanguage(null)).toBe('US');
    expect(localeFromLanguage(undefined)).toBe('US');
  });
});