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
    defaultIceFuelPrice: 1.75,
    defaultIceEfficiency: 6.5,
    defaultElectricityPrice: 0.32,
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

export function detectLocaleFromBrowser(): Locale {
  if (typeof navigator === 'undefined') return 'US';
  const lang = navigator.language?.toLowerCase() ?? 'en-us';
  return lang.startsWith('en-us') || lang === 'en' ? 'US' : 'EU';
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