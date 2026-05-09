import type { MaintenanceCurve, Powertrain } from '../scenario.types';
import { pchipInterpolate } from './pchip';

export type { MaintenanceCurve, MaintenanceSample } from '../scenario.types';

/** Anchor x-positions used by every maintenance curve. Back-loaded — captures
 * post-warranty cliff (~year 3) and wear-out climb (~years 10–15). */
export const MAINTENANCE_ANCHOR_AGES = [0, 3, 6, 10, 15] as const;

/** Right edge of the preview chart x-axis (years). */
export const MAINTENANCE_PREVIEW_END_AGE = 18;
/** Resolution at which `buildMaintenancePreviewSamples` emits chart points. */
export const MAINTENANCE_PREVIEW_STEP = 0.25;

const TAIL_SLOPE_MULTIPLIER = 3;
const MAX_FACTOR = 0.1;

/**
 * Bundle of inputs that compose with the curve to produce a currency value.
 * Built once by the store and threaded through TCO calculations.
 */
export interface MaintenanceContext {
  msrp: number;
  curve: MaintenanceCurve;
  categoryMult: number;
  mileageFactor: number;
}

/**
 * Build a curve from a 5-element y-array sampled at MAINTENANCE_ANCHOR_AGES.
 * Y0 is NOT auto-locked — caller controls the year-0 value.
 */
export function makeMaintenanceCurve(factors: readonly number[]): MaintenanceCurve {
  if (factors.length !== MAINTENANCE_ANCHOR_AGES.length) {
    throw new Error(
      `makeMaintenanceCurve expects ${MAINTENANCE_ANCHOR_AGES.length} factors, got ${factors.length}`,
    );
  }
  const samples = MAINTENANCE_ANCHOR_AGES.map((age, i) => ({ age, factor: factors[i] }));
  return { samples: samples as unknown as MaintenanceCurve['samples'] };
}

/** Extract just the y-values from a curve, in anchor order. */
export function factorsOfMaintenance(curve: MaintenanceCurve): number[] {
  return curve.samples.map((s) => s.factor);
}

/**
 * Clamp a proposed factor at a given anchor index so the curve stays
 * monotonically non-decreasing. Direction-flipped from depreciation:
 * index 0 is bounded below by 0 (no negative maintenance) and above by
 * its right neighbor; interior indices are bounded by `(leftNeighbor, rightNeighbor)`;
 * the final index is bounded by `(leftNeighbor, MAX_FACTOR)` — hard cap at
 * 10% of MSRP/yr.
 */
export function clampMaintenanceFactorAt(
  factors: readonly number[],
  index: number,
  raw: number,
): number {
  const lower = index === 0 ? 0 : factors[index - 1];
  const upper = index === factors.length - 1 ? MAX_FACTOR : factors[index + 1];
  if (raw < lower) return lower;
  if (raw > upper) return upper;
  return raw;
}

/**
 * Sample the curve at fine resolution for chart rendering. Spans
 * 0..MAINTENANCE_PREVIEW_END_AGE in MAINTENANCE_PREVIEW_STEP increments.
 * Always emits exact samples at every MAINTENANCE_ANCHOR_AGES position so
 * chart markers line up pixel-perfect with the underlying anchors.
 */
export function buildMaintenancePreviewSamples(
  curve: MaintenanceCurve,
): { age: number; factor: number }[] {
  const out: { age: number; factor: number }[] = [];
  const steps = Math.round(MAINTENANCE_PREVIEW_END_AGE / MAINTENANCE_PREVIEW_STEP);
  for (let i = 0; i <= steps; i++) {
    const age = +(i * MAINTENANCE_PREVIEW_STEP).toFixed(4);
    out.push({ age, factor: maintenanceFactor(age, curve) });
  }
  return out;
}

/**
 * Defaults sampled from the legacy linear model `(1 + k_mid × age) × baseRate`
 * at MAINTENANCE_ANCHOR_AGES, mid-category, nominal mileage. ICE baseRate
 * 0.015 with k_mid 0.08; EV baseRate 0.007 with k_mid 0.048 (= 0.08 × 0.6).
 */
export const DEFAULT_MAINTENANCE_CURVES: Record<Powertrain, MaintenanceCurve> = {
  ICE: makeMaintenanceCurve([0.015, 0.0186, 0.0222, 0.027, 0.033]),
  EV: makeMaintenanceCurve([0.007, 0.008, 0.009, 0.0104, 0.012]),
};

export function defaultMaintenanceCurveForPowertrain(pt: Powertrain): MaintenanceCurve {
  return DEFAULT_MAINTENANCE_CURVES[pt];
}

/**
 * Curve eval at a given age — returns the unitless % of MSRP factor.
 * PCHIP between anchors. Past the last anchor, linear extrapolation at
 * `TAIL_SLOPE_MULTIPLIER × lastSegmentSlope` so the tail bends visibly upward.
 */
export function maintenanceFactor(age: number, curve: MaintenanceCurve): number {
  const samples = curve.samples;
  if (age <= 0) return samples[0].factor;
  const last = samples[samples.length - 1];
  if (age >= last.age) {
    const prev = samples[samples.length - 2];
    const lastSlope = (last.factor - prev.factor) / (last.age - prev.age);
    return last.factor + (age - last.age) * lastSlope * TAIL_SLOPE_MULTIPLIER;
  }
  const xs = samples.map((s) => s.age);
  const ys = samples.map((s) => s.factor);
  return pchipInterpolate(xs, ys, age);
}

/**
 * Effective annual maintenance for a given age, in currency. Standard
 * formula (agingScale=1): `msrp × curve(age) × categoryMult × mileageFactor`.
 *
 * `agingScale` scales only the *growth above year-0*, leaving year-0 cost
 * untouched. Defaults to 1.0 (full aging). The lease-warranty branch in
 * tco-lease passes 0.5 — consumables (tires, brakes, fluids) age at half
 * rate while the lessor handles powertrain repairs under warranty.
 */
export function maintenanceAt(
  ctx: MaintenanceContext,
  age: number,
  agingScale: number = 1,
): number {
  const baseFactor = ctx.curve.samples[0].factor;
  const f = maintenanceFactor(age, ctx.curve);
  const effective = baseFactor + (f - baseFactor) * agingScale;
  return ctx.msrp * effective * ctx.categoryMult * ctx.mileageFactor;
}
