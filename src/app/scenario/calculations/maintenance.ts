import type { Powertrain, VehicleCategory } from '../scenario.types';

// Linear age curve: maintenance(age) = base × (1 + k × ageYears).
// k by category × powertrain. EV's drivetrain wears slower, but brakes/tires/
// fluids still apply — hence 0.6× ICE rather than 0×.
const ICE_K: Record<VehicleCategory, number> = {
  economy: 0.05,
  mid: 0.08,
  luxury: 0.12,
};

const POWERTRAIN_FACTOR: Record<Powertrain, number> = {
  ICE: 1.0,
  EV: 0.6,
};

export function maintenanceK(category: VehicleCategory, powertrain: Powertrain): number {
  return ICE_K[category] * POWERTRAIN_FACTOR[powertrain];
}

export function maintenanceAt(base: number, k: number, ageYears: number): number {
  return base * (1 + k * Math.max(ageYears, 0));
}