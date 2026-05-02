import type { CategoryMultipliers, Locale, VehicleCategory } from '../scenario.types';

export function categorize(msrp: number, locale: Locale): VehicleCategory {
  if (locale === 'US') {
    if (msrp < 35000) return 'economy';
    if (msrp <= 70000) return 'mid';
    return 'luxury';
  }
  if (msrp < 30000) return 'economy';
  if (msrp <= 60000) return 'mid';
  return 'luxury';
}

const MULTIPLIERS: Record<VehicleCategory, CategoryMultipliers> = {
  economy: { insurance: 1.0, maintenance: 1.0 },
  mid: { insurance: 1.2, maintenance: 1.3 },
  luxury: { insurance: 1.5, maintenance: 1.8 },
};

export function categoryMultipliers(category: VehicleCategory): CategoryMultipliers {
  return MULTIPLIERS[category];
}