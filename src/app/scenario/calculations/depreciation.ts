import type { DepreciationCurve, Powertrain } from '../scenario.types';

export type { DepreciationCurve, DepreciationSample } from '../scenario.types';

/** Anchor x-positions used by every curve in this module. */
export const ANCHOR_AGES = [0, 2, 4, 7, 12] as const;

/** Right edge of the preview chart x-axis (years). */
export const PREVIEW_END_AGE = 15;
/** Resolution at which `buildPreviewSamples` emits chart points. */
export const PREVIEW_STEP = 0.25;

const TAIL_DECAY_PER_YEAR = 0.9;

/**
 * Build a curve from a 5-element y-array sampled at ANCHOR_AGES.
 * Y at age 0 is forced to 1.0 (locked anchor).
 */
export function makeCurve(factors: readonly number[]): DepreciationCurve {
  if (factors.length !== ANCHOR_AGES.length) {
    throw new Error(`makeCurve expects ${ANCHOR_AGES.length} factors, got ${factors.length}`);
  }
  const samples = ANCHOR_AGES.map((age, i) => ({
    age,
    factor: i === 0 ? 1 : factors[i],
  }));
  return { samples: samples as unknown as DepreciationCurve['samples'] };
}

/** Extract just the y-values from a curve, in anchor order. */
export function factorsOf(curve: DepreciationCurve): number[] {
  return curve.samples.map((s) => s.factor);
}

/**
 * Clamp a proposed factor at a given anchor index so the curve stays
 * monotonically non-increasing. Index 0 is always 1.0 (locked); interior
 * indices are bounded by `(rightNeighbor, leftNeighbor)`; the final
 * index is bounded by `(0, leftNeighbor)`.
 */
export function clampFactorAt(factors: readonly number[], index: number, raw: number): number {
  if (index === 0) return 1;
  const left = factors[index - 1];
  const right = index === factors.length - 1 ? 0 : factors[index + 1];
  if (raw < right) return right;
  if (raw > left) return left;
  return raw;
}

/**
 * Sample the curve at fine resolution for chart rendering. Spans
 * 0..PREVIEW_END_AGE in PREVIEW_STEP increments. Always emits exact
 * samples at every ANCHOR_AGES position so chart markers line up
 * pixel-perfect with the underlying anchors.
 */
export function buildPreviewSamples(
  curve: DepreciationCurve,
): { age: number; factor: number }[] {
  const out: { age: number; factor: number }[] = [];
  const steps = Math.round(PREVIEW_END_AGE / PREVIEW_STEP);
  for (let i = 0; i <= steps; i++) {
    const age = +(i * PREVIEW_STEP).toFixed(4);
    out.push({ age, factor: depreciationFactor(age, curve) });
  }
  return out;
}

/**
 * ICE matches the legacy step-curve sampled at the anchors; EV is
 * ~10–15pp lower mid-curve to capture battery-anxiety depreciation.
 */
export const DEFAULT_CURVES: Record<Powertrain, DepreciationCurve> = {
  ICE: makeCurve([1.0, 0.68, 0.49, 0.34, 0.2]),
  EV: makeCurve([1.0, 0.55, 0.36, 0.22, 0.13]),
};

export function defaultCurveForPowertrain(pt: Powertrain): DepreciationCurve {
  return DEFAULT_CURVES[pt];
}

/**
 * Multiply MSRP by this to get the resale value at `age`. Defaults to
 * the ICE curve for backward compat; pass an explicit curve for EV
 * scenarios or a user override.
 */
export function depreciationFactor(
  age: number,
  curve: DepreciationCurve = DEFAULT_CURVES.ICE,
): number {
  const samples = curve.samples;
  if (age <= 0) return samples[0].factor;
  const last = samples[samples.length - 1];
  if (age >= last.age) {
    return last.factor * Math.pow(TAIL_DECAY_PER_YEAR, age - last.age);
  }
  const xs = samples.map((s) => s.age);
  const ys = samples.map((s) => s.factor);
  return pchipInterpolate(xs, ys, age);
}

/**
 * Monotonic cubic (Fritsch–Carlson PCHIP) interpolation. Given monotonic
 * inputs, the result is monotonic by construction. Outside the input
 * range, clamps to the endpoint y-values.
 */
export function pchipInterpolate(
  xs: readonly number[],
  ys: readonly number[],
  x: number,
): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];

  const h: number[] = new Array(n - 1);
  const delta: number[] = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    delta[i] = (ys[i + 1] - ys[i]) / h[i];
  }

  const d: number[] = new Array(n);
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] === 0 || delta[i] === 0 || delta[i - 1] * delta[i] < 0) {
      d[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }
  d[0] = endpointSlope(h[0], h[1], delta[0], delta[1]);
  d[n - 1] = endpointSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);

  let i = 0;
  while (i < n - 1 && xs[i + 1] < x) i++;

  const t = (x - xs[i]) / h[i];
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * ys[i] + h10 * h[i] * d[i] + h01 * ys[i + 1] + h11 * h[i] * d[i + 1];
}

// One-sided endpoint slope. h0/delta0 are adjacent to the endpoint; h1/delta1
// are one step further in. Clamped to preserve monotonicity.
function endpointSlope(h0: number, h1: number, delta0: number, delta1: number): number {
  const d = ((2 * h0 + h1) * delta0 - h0 * delta1) / (h0 + h1);
  if (d * delta0 <= 0) return 0;
  if (delta0 * delta1 < 0 && Math.abs(d) > 3 * Math.abs(delta0)) return 3 * delta0;
  return d;
}
