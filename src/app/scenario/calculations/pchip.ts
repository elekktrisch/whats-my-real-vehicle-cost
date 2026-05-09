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
