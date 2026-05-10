import type { Language, Powertrain, Region } from './scenario.types';

/**
 * The pair of axes the formatters need: `region` decides currency symbol +
 * placement; `language` decides number-formatting conventions (decimal
 * separator, thousands grouping). Pure code passes a context object so
 * neither axis leaks individually.
 */
export interface FormatContext {
  region: Region;
  language: Language;
}

/** Build a BCP-47 locale string for `toLocaleString` from a FormatContext. */
export function bcp47ForContext(ctx: FormatContext): string {
  if (ctx.language === 'en' && ctx.region === 'EU') return 'en-GB';
  if (ctx.language === 'en') return 'en-US';
  return 'de-DE';
}

export interface RegionConfig {
  currencySymbol: string;
  currencyAfter: boolean;
  decimalSeparator: '.' | ',';
  distanceUnit: 'mi' | 'km';
  iceEfficiencyUnit: 'mpg' | 'L/100km';
  evEfficiencyUnit: 'mi/kWh' | 'kWh/100km';
  fuelPriceUnit: '$/gal' | '€/L';
  electricityPriceUnit: '$/kWh' | '€/kWh';
  insuranceRate: number;
  defaultIceFuelPrice: number;
  defaultIceEfficiency: number;
  defaultElectricityPrice: number;
  defaultEvEfficiency: number;
  defaultHomeChargerInstall: number;
}

export const REGION_CONFIG: Record<Region, RegionConfig> = {
  US: {
    currencySymbol: '$',
    currencyAfter: false,
    decimalSeparator: '.',
    distanceUnit: 'mi',
    iceEfficiencyUnit: 'mpg',
    evEfficiencyUnit: 'mi/kWh',
    fuelPriceUnit: '$/gal',
    electricityPriceUnit: '$/kWh',
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
    insuranceRate: 0.015,
    defaultIceFuelPrice: 1.9,
    defaultIceEfficiency: 6.5,
    defaultElectricityPrice: 0.27,
    defaultEvEfficiency: 17,
    defaultHomeChargerInstall: 1200,
  },
};

export function fuelEfficiencyDefault(region: Region, powertrain: Powertrain): number {
  const cfg = REGION_CONFIG[region];
  return powertrain === 'EV' ? cfg.defaultEvEfficiency : cfg.defaultIceEfficiency;
}

export function fuelPriceDefault(region: Region, powertrain: Powertrain): number {
  const cfg = REGION_CONFIG[region];
  return powertrain === 'EV' ? cfg.defaultElectricityPrice : cfg.defaultIceFuelPrice;
}

/** All 29 IANA timezones inside the United States (including HI/AK). Used to
 * decide region from physical location rather than browser language — handy
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

/** Pure: maps an IANA timezone to a region, or null if it's neither US nor EU. */
export function regionFromTimezone(tz: string | null | undefined): Region | null {
  if (!tz) return null;
  if (US_TIMEZONES.has(tz)) return 'US';
  if (tz.startsWith('Europe/')) return 'EU';
  return null;
}

/** Pure: maps a BCP-47 language tag to a region. Used as a fallback. */
export function regionFromLanguage(lang: string | null | undefined): Region {
  const l = (lang ?? 'en-us').toLowerCase();
  return l.startsWith('en-us') || l === 'en' ? 'US' : 'EU';
}

export function detectRegionFromBrowser(): Region {
  // Timezone is "where you are" — beats navigator.language which is just
  // "what content you like" (e.g. an en-US browser configured globally).
  try {
    if (typeof Intl !== 'undefined') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fromTz = regionFromTimezone(tz);
      if (fromTz) return fromTz;
    }
  } catch {
    // Intl unavailable in some sandboxed envs — fall through to language.
  }
  if (typeof navigator === 'undefined') return 'EU';
  return regionFromLanguage(navigator.language);
}

export function formatCurrency(value: number, region: Region, fractionDigits = 0): string {
  const cfg = REGION_CONFIG[region];
  const formatted = Math.abs(value).toLocaleString(region === 'US' ? 'en-US' : 'de-DE', {
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
  region: Region,
  subThousandFractionDigits = 0,
): string {
  const cfg = REGION_CONFIG[region];
  const abs = Math.abs(value);
  const subThousandScale = 10 ** subThousandFractionDigits;
  const k =
    abs >= 1000
      ? `${Math.round(abs / 100) / 10}k`
      : String(Math.round(abs * subThousandScale) / subThousandScale);
  const sign = value < 0 ? '-' : '';
  return cfg.currencyAfter ? `${sign}${k} ${cfg.currencySymbol}` : `${sign}${cfg.currencySymbol}${k}`;
}
