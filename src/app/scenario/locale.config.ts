import type { Locale, Powertrain } from './scenario.types';

export interface LocaleConfig {
  currencySymbol: string;
  currencyAfter: boolean;
  decimalSeparator: '.' | ',';
  distanceUnit: 'mi' | 'km';
  iceEfficiencyUnit: 'mpg' | 'L/100km';
  evEfficiencyUnit: 'mi/kWh' | 'kWh/100km';
  fuelPriceUnit: '$/gal' | '€/L';
  electricityPriceUnit: '$/kWh' | '€/kWh';
  leaseRateLabel: string;
  insuranceRate: number;
  defaultIceFuelPrice: number;
  defaultIceEfficiency: number;
  defaultElectricityPrice: number;
  defaultEvEfficiency: number;
  defaultHomeChargerInstall: number;
}

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  US: {
    currencySymbol: '$',
    currencyAfter: false,
    decimalSeparator: '.',
    distanceUnit: 'mi',
    iceEfficiencyUnit: 'mpg',
    evEfficiencyUnit: 'mi/kWh',
    fuelPriceUnit: '$/gal',
    electricityPriceUnit: '$/kWh',
    leaseRateLabel: 'Money factor',
    insuranceRate: 0.02,
    defaultIceFuelPrice: 3.5,
    defaultIceEfficiency: 28,
    defaultElectricityPrice: 0.16,
    defaultEvEfficiency: 3.5,
    defaultHomeChargerInstall: 1500,
  },
  EU: {
    currencySymbol: '€',
    currencyAfter: true,
    decimalSeparator: ',',
    distanceUnit: 'km',
    iceEfficiencyUnit: 'L/100km',
    evEfficiencyUnit: 'kWh/100km',
    fuelPriceUnit: '€/L',
    electricityPriceUnit: '€/kWh',
    leaseRateLabel: 'Leasingfaktor',
    insuranceRate: 0.015,
    defaultIceFuelPrice: 1.9,
    defaultIceEfficiency: 6.5,
    defaultElectricityPrice: 0.27,
    defaultEvEfficiency: 17,
    defaultHomeChargerInstall: 1200,
  },
};

export function fuelEfficiencyDefault(locale: Locale, powertrain: Powertrain): number {
  const cfg = LOCALE_CONFIG[locale];
  return powertrain === 'EV' ? cfg.defaultEvEfficiency : cfg.defaultIceEfficiency;
}

export function fuelPriceDefault(locale: Locale, powertrain: Powertrain): number {
  const cfg = LOCALE_CONFIG[locale];
  return powertrain === 'EV' ? cfg.defaultElectricityPrice : cfg.defaultIceFuelPrice;
}

/** All 29 IANA timezones inside the United States (including HI/AK). Used to
 * decide locale from physical location rather than browser language — handy
 * for e.g. an en-US browser used in Europe. */
const US_TIMEZONES = new Set<string>([
  'America/New_York',
  'America/Detroit',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Indiana/Indianapolis',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Vevay',
  'America/Indiana/Tell_City',
  'America/Indiana/Knox',
  'America/Chicago',
  'America/Menominee',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/North_Dakota/Beulah',
  'America/Denver',
  'America/Boise',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Juneau',
  'America/Sitka',
  'America/Metlakatla',
  'America/Yakutat',
  'America/Nome',
  'America/Adak',
  'Pacific/Honolulu',
]);

/** Pure: maps an IANA timezone to a locale, or null if it's neither US nor EU. */
export function localeFromTimezone(tz: string | null | undefined): Locale | null {
  if (!tz) return null;
  if (US_TIMEZONES.has(tz)) return 'US';
  if (tz.startsWith('Europe/')) return 'EU';
  return null;
}

/** Pure: maps a BCP-47 language tag to a locale. Used as a fallback. */
export function localeFromLanguage(lang: string | null | undefined): Locale {
  const l = (lang ?? 'en-us').toLowerCase();
  return l.startsWith('en-us') || l === 'en' ? 'US' : 'EU';
}

export function detectLocaleFromBrowser(): Locale {
  // Timezone is "where you are" — beats navigator.language which is just
  // "what content you like" (e.g. an en-US browser configured globally).
  try {
    if (typeof Intl !== 'undefined') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fromTz = localeFromTimezone(tz);
      if (fromTz) return fromTz;
    }
  } catch {
    // Intl unavailable in some sandboxed envs — fall through to language.
  }
  if (typeof navigator === 'undefined') return 'EU';
  return localeFromLanguage(navigator.language);
}

export function formatCurrency(value: number, locale: Locale, fractionDigits = 0): string {
  const cfg = LOCALE_CONFIG[locale];
  const formatted = Math.abs(value).toLocaleString(locale === 'US' ? 'en-US' : 'de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  const sign = value < 0 ? '-' : '';
  return cfg.currencyAfter
    ? `${sign}${formatted} ${cfg.currencySymbol}`
    : `${sign}${cfg.currencySymbol}${formatted}`;
}

/**
 * Compact-currency for tight UI captions: "$32,500" → "$32.5k", "$5,000" →
 * "$5k". Sub-1000 values keep `subThousandFractionDigits` decimals (default 0
 * for hero captions, 2 for the money pipe so cents render correctly).
 *
 * Round-to-hundreds-then-divide-by-ten gives one decimal place above the
 * threshold: 32500 → 325 → 32.5.
 */
export function formatCompactCurrency(
  value: number,
  locale: Locale,
  subThousandFractionDigits = 0,
): string {
  const cfg = LOCALE_CONFIG[locale];
  const abs = Math.abs(value);
  const subThousandScale = 10 ** subThousandFractionDigits;
  const k =
    abs >= 1000
      ? `${Math.round(abs / 100) / 10}k`
      : String(Math.round(abs * subThousandScale) / subThousandScale);
  const sign = value < 0 ? '-' : '';
  return cfg.currencyAfter ? `${sign}${k} ${cfg.currencySymbol}` : `${sign}${cfg.currencySymbol}${k}`;
}
