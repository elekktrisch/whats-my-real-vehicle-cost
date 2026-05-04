import type { Locale, Powertrain } from '../scenario.types';

export interface FuelCostInputs {
  efficiency: number;
  fuelPrice: number;
  annualMileage: number;
  years: number;
  powertrain: Powertrain;
  locale: Locale;
  // EV-only effect: home charger present? Solar only takes effect when this
  // is also true. ICE callers can pass false; the field is ignored.
  homeChargerInstalled: boolean;
  // EV-only effect: 85% home (free from solar) + 15% public (grid rate).
  // Effective price = 15% of grid. Without a home charger, solar has no
  // effect — the multiplier check requires both flags.
  solar: boolean;
}

/**
 * Returns total fuel/electricity cost for the keep-duration.
 * Units differ per locale × powertrain — see [LOCALE_CONFIG] / [PRODUCT.md].
 */
export function fuelCostOverYears(input: FuelCostInputs): number {
  const distance = input.annualMileage * Math.max(input.years, 0);
  if (distance <= 0 || input.efficiency <= 0) return 0;

  const evPriceMultiplier = input.homeChargerInstalled && input.solar ? 0.15 : 1;

  if (input.locale === 'US' && input.powertrain === 'ICE') {
    const gallons = distance / input.efficiency;
    return gallons * input.fuelPrice;
  }
  if (input.locale === 'US' && input.powertrain === 'EV') {
    const kwh = distance / input.efficiency;
    return kwh * input.fuelPrice * evPriceMultiplier;
  }
  if (input.locale === 'EU' && input.powertrain === 'ICE') {
    const liters = (distance / 100) * input.efficiency;
    return liters * input.fuelPrice;
  }
  // EU EV
  const kwh = (distance / 100) * input.efficiency;
  return kwh * input.fuelPrice * evPriceMultiplier;
}