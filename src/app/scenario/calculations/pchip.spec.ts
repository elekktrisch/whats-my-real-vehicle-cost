import { pchipInterpolate } from './pchip';

describe('pchipInterpolate (decreasing inputs)', () => {
  const xs = [0, 2, 4, 7, 12] as const;
  const ys = [1.0, 0.68, 0.49, 0.34, 0.2] as const;

  it('returns the y value exactly at each anchor x', () => {
    for (let i = 0; i < xs.length; i++) {
      expect(pchipInterpolate(xs, ys, xs[i])).toBeCloseTo(ys[i], 9);
    }
  });

  it('clamps below the first x to y[0]', () => {
    expect(pchipInterpolate(xs, ys, -3)).toBe(ys[0]);
  });

  it('clamps above the last x to y[last]', () => {
    expect(pchipInterpolate(xs, ys, 99)).toBe(ys[ys.length - 1]);
  });

  it('is monotonically non-increasing for monotonic-decreasing inputs', () => {
    let prev = pchipInterpolate(xs, ys, 0);
    for (let t = 0; t <= 12; t += 0.1) {
      const v = pchipInterpolate(xs, ys, t);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });

  it('does not overshoot the bracketing anchors in any sub-interval', () => {
    for (let i = 0; i < xs.length - 1; i++) {
      const lo = ys[i + 1];
      const hi = ys[i];
      const span = xs[i + 1] - xs[i];
      for (let s = 0; s <= 1; s += 0.05) {
        const v = pchipInterpolate(xs, ys, xs[i] + s * span);
        expect(v).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(v).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });
});

describe('pchipInterpolate (increasing inputs)', () => {
  // Same machinery should preserve monotonic-increasing data symmetrically —
  // PCHIP is direction-agnostic. Anchors mimic the maintenance curve shape.
  const xs = [0, 3, 6, 10, 15] as const;
  const ys = [0.015, 0.0186, 0.0222, 0.027, 0.033] as const;

  it('returns the y value exactly at each anchor x', () => {
    for (let i = 0; i < xs.length; i++) {
      expect(pchipInterpolate(xs, ys, xs[i])).toBeCloseTo(ys[i], 9);
    }
  });

  it('is monotonically non-decreasing for monotonic-increasing inputs', () => {
    let prev = pchipInterpolate(xs, ys, 0);
    for (let t = 0; t <= 15; t += 0.1) {
      const v = pchipInterpolate(xs, ys, t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('does not overshoot the bracketing anchors in any sub-interval', () => {
    for (let i = 0; i < xs.length - 1; i++) {
      const lo = ys[i];
      const hi = ys[i + 1];
      const span = xs[i + 1] - xs[i];
      for (let s = 0; s <= 1; s += 0.05) {
        const v = pchipInterpolate(xs, ys, xs[i] + s * span);
        expect(v).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(v).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });
});
