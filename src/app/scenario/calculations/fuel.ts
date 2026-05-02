import type { Locale, Powertrain } from '../scenario.types';

export interface FuelCostInputs {
  efficiency: number;
  fuelPrice: number;
  annualMileage: number;
  years: number;
  powertrain: Powertrain;
  locale: Locale;
}

/**
 * Returns total fuel/electricity cost for the keep-duration.
 * Units differ per locale × powertrain — see [LOCALE_CONFIG] / [PRODUCT.md].
 */
export function fuelCostOverYears(input: FuelCostInputs): number {
  const distance = input.annualMileage * Math.max(input.years, 0);
  if (distance <= 0 || input.efficiency <= 0) return 0;

  if (input.locale === 'US' && input.powertrain === 'ICE') {
    const gallons = distance / input.efficiency;
    return gallons * input.fuelPrice;
  }
  if (input.locale === 'US' && input.powertrain === 'EV') {
    const kwh = distance / input.efficiency;
    return kwh * input.fuelPrice;
  }
  if (input.locale === 'EU' && input.powertrain === 'ICE') {
    const liters = (distance / 100) * input.efficiency;
    return liters * input.fuelPrice;
  }
  const kwh = (distance / 100) * input.efficiency;
  return kwh * input.fuelPrice;
}