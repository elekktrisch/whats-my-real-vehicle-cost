/**
 * Monotonic cubic (Fritsch–Carlson PCHIP) interpolation. Given monotonic
 * inputs, the result is monotonic by construction — direction-agnostic
 * (works for both increasing and decreasing data). Outside the input
 * range, clamps to the endpoint y-values.
 *
 * Shared between the depreciation (monotonic-decreasing) and maintenance
 * (monotonic-increasing) curves.
 */
export function pchipInterpolate(
  xs: readonly number[],
  ys: readonly number[],
  x: number,
): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];

  const stepWidths = new Array<number>(n - 1);
  const secantSlopes = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i++) {
    stepWidths[i] = xs[i + 1] - xs[i];
    secantSlopes[i] = (ys[i + 1] - ys[i]) / stepWidths[i];
  }

  const derivatives = new Array<number>(n);
  for (let i = 1; i < n - 1; i++) {
    derivatives[i] = interiorDerivative(stepWidths, secantSlopes, i);
  }
  derivatives[0] = endpointSlope(stepWidths[0], stepWidths[1], secantSlopes[0], secantSlopes[1]);
  derivatives[n - 1] = endpointSlope(
    stepWidths[n - 2],
    stepWidths[n - 3],
    secantSlopes[n - 2],
    secantSlopes[n - 3],
  );

  const seg = findSegment(xs, x);
  const tNormalized = (x - xs[seg]) / stepWidths[seg];
  return hermiteCubic(
    tNormalized,
    ys[seg],
    ys[seg + 1],
    derivatives[seg],
    derivatives[seg + 1],
    stepWidths[seg],
  );
}

// Weighted-harmonic-mean derivative at an interior point. Pinned to zero on
// flat or sign-changing segments — that's what guarantees monotonicity.
function interiorDerivative(
  stepWidths: readonly number[],
  secantSlopes: readonly number[],
  i: number,
): number {
  const leftSlope = secantSlopes[i - 1];
  const rightSlope = secantSlopes[i];
  const flatOrSignChange = leftSlope === 0 || rightSlope === 0 || leftSlope * rightSlope < 0;
  if (flatOrSignChange) return 0;
  const leftWeight = 2 * stepWidths[i] + stepWidths[i - 1];
  const rightWeight = stepWidths[i] + 2 * stepWidths[i - 1];
  return (leftWeight + rightWeight) / (leftWeight / leftSlope + rightWeight / rightSlope);
}

// One-sided endpoint slope. h0/delta0 are adjacent to the endpoint; h1/delta1
// are one step further in. Clamped to preserve monotonicity.
function endpointSlope(h0: number, h1: number, delta0: number, delta1: number): number {
  const d = ((2 * h0 + h1) * delta0 - h0 * delta1) / (h0 + h1);
  if (d * delta0 <= 0) return 0;
  if (delta0 * delta1 < 0 && Math.abs(d) > 3 * Math.abs(delta0)) return 3 * delta0;
  return d;
}

function findSegment(xs: readonly number[], x: number): number {
  let i = 0;
  while (i < xs.length - 1 && xs[i + 1] < x) i++;
  return i;
}

// Cubic Hermite interpolation on a single segment in normalized parameter t ∈ [0,1].
// The four basis polynomials weight the two endpoint values and the two endpoint
// derivatives (scaled by the segment width).
function hermiteCubic(
  t: number,
  yLeft: number,
  yRight: number,
  dLeft: number,
  dRight: number,
  stepWidth: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const weightYLeft = 2 * t3 - 3 * t2 + 1;
  const weightDLeft = t3 - 2 * t2 + t;
  const weightYRight = -2 * t3 + 3 * t2;
  const weightDRight = t3 - t2;
  return (
    weightYLeft * yLeft +
    weightDLeft * stepWidth * dLeft +
    weightYRight * yRight +
    weightDRight * stepWidth * dRight
  );
}
