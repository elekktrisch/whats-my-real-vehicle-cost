import { regionFromLanguage, regionFromTimezone } from './region.config';

describe('regionFromTimezone', () => {
  it('maps common US timezones to US', () => {
    expect(regionFromTimezone('America/New_York')).toBe('US');
    expect(regionFromTimezone('America/Los_Angeles')).toBe('US');
    expect(regionFromTimezone('America/Chicago')).toBe('US');
    expect(regionFromTimezone('America/Denver')).toBe('US');
    expect(regionFromTimezone('America/Phoenix')).toBe('US');
    expect(regionFromTimezone('America/Anchorage')).toBe('US');
    expect(regionFromTimezone('Pacific/Honolulu')).toBe('US');
  });

  it('maps any Europe/* timezone to EU', () => {
    expect(regionFromTimezone('Europe/Berlin')).toBe('EU');
    expect(regionFromTimezone('Europe/Zurich')).toBe('EU');
    expect(regionFromTimezone('Europe/Paris')).toBe('EU');
    expect(regionFromTimezone('Europe/London')).toBe('EU');
    expect(regionFromTimezone('Europe/Vienna')).toBe('EU');
  });

  it('returns null for non-US, non-Europe timezones (so caller can fall back)', () => {
    expect(regionFromTimezone('Asia/Tokyo')).toBe(null);
    expect(regionFromTimezone('America/Toronto')).toBe(null); // Canada — not US-listed
    expect(regionFromTimezone('America/Mexico_City')).toBe(null);
    expect(regionFromTimezone('Australia/Sydney')).toBe(null);
  });

  it('returns null for empty/missing input', () => {
    expect(regionFromTimezone(null)).toBe(null);
    expect(regionFromTimezone(undefined)).toBe(null);
    expect(regionFromTimezone('')).toBe(null);
  });
});

describe('regionFromLanguage', () => {
  it('maps en-US and en to US', () => {
    expect(regionFromLanguage('en-US')).toBe('US');
    expect(regionFromLanguage('en-us')).toBe('US');
    expect(regionFromLanguage('en')).toBe('US');
  });

  it('maps everything else to EU', () => {
    expect(regionFromLanguage('de-CH')).toBe('EU');
    expect(regionFromLanguage('de-DE')).toBe('EU');
    expect(regionFromLanguage('fr-FR')).toBe('EU');
    expect(regionFromLanguage('en-GB')).toBe('EU');
    expect(regionFromLanguage('ja-JP')).toBe('EU');
  });

  it('falls back to US when input is missing', () => {
    expect(regionFromLanguage(null)).toBe('US');
    expect(regionFromLanguage(undefined)).toBe('US');
  });
});
