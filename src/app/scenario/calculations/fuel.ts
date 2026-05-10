import type { ChargerStatus, Powertrain, Region } from '../scenario.types';

export interface FuelCostInputs {
  efficiency: number;
  fuelPrice: number;
  annualMileage: number;
  years: number;
  powertrain: Powertrain;
  region: Region;
  chargerStatus: ChargerStatus;
  solar: boolean;
}

/**
 * Returns total fuel/electricity cost for the keep-duration.
 * Units differ per region × powertrain — see [REGION_CONFIG] / [PRODUCT.md].
 */
export function fuelCostOverYears(input: FuelCostInputs): number {
  const distance = input.annualMileage * Math.max(input.years, 0);
  if (distance <= 0 || input.efficiency <= 0) return 0;

  const evPriceMultiplier =
    input.chargerStatus !== 'none' && input.solar ? 0.15 : 1;

  if (input.region === 'US' && input.powertrain === 'ICE') {
    const gallons = distance / input.efficiency;
    return gallons * input.fuelPrice;
  }
  if (input.region === 'US' && input.powertrain === 'EV') {
    const kwh = distance / input.efficiency;
    return kwh * input.fuelPrice * evPriceMultiplier;
  }
  if (input.region === 'EU' && input.powertrain === 'ICE') {
    const liters = (distance / 100) * input.efficiency;
    return liters * input.fuelPrice;
  }
  // EU EV
  const kwh = (distance / 100) * input.efficiency;
  return kwh * input.fuelPrice * evPriceMultiplier;
}
