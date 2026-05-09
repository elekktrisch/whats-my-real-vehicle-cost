import {
  ANCHOR_AGES,
  DEFAULT_CURVES,
  PREVIEW_END_AGE,
  PREVIEW_STEP,
  buildPreviewSamples,
  clampFactorAt,
  defaultCurveForPowertrain,
  depreciationFactor,
  factorsOf,
  makeCurve,
  pchipInterpolate,
} from './depreciation';

describe('makeCurve / DepreciationCurve shape', () => {
  it('builds a curve whose samples zip ANCHOR_AGES with the given factors', () => {
    const c = makeCurve([1, 0.7, 0.5, 0.35, 0.2]);
    expect(c.samples.length).toBe(5);
    expect(c.samples.map((s) => s.age)).toEqual([0, 2, 4, 7, 12]);
    expect(c.samples.map((s) => s.factor)).toEqual([1, 0.7, 0.5, 0.35, 0.2]);
  });

  it('forces factor at age 0 to 1 (Y0 locked)', () => {
    const c = makeCurve([0.9, 0.6, 0.4, 0.25, 0.15]);
    expect(c.samples[0].factor).toBe(1);
  });

  it('factorsOf returns the y-array in anchor order', () => {
    const c = makeCurve([1, 0.7, 0.5, 0.35, 0.2]);
    expect(factorsOf(c)).toEqual([1, 0.7, 0.5, 0.35, 0.2]);
  });
});

describe('ANCHOR_AGES / DEFAULT_CURVES', () => {
  it('exposes 5 anchor ages [0, 2, 4, 7, 12]', () => {
    expect(Array.from(ANCHOR_AGES)).toEqual([0, 2, 4, 7, 12]);
  });

  it('ICE default samples match the legacy step-curve at the anchors', () => {
    expect(factorsOf(DEFAULT_CURVES.ICE)).toEqual([1.0, 0.68, 0.49, 0.34, 0.2]);
  });

  it('EV default is steeper mid-curve than ICE', () => {
    const ice = factorsOf(DEFAULT_CURVES.ICE);
    const ev = factorsOf(DEFAULT_CURVES.EV);
    expect(ev[0]).toBe(1.0);
    expect(ice[1] - ev[1]).toBeGreaterThanOrEqual(0.1);
    expect(ice[2] - ev[2]).toBeGreaterThanOrEqual(0.1);
    expect(ice[3] - ev[3]).toBeGreaterThanOrEqual(0.1);
  });

  it('defaultCurveForPowertrain returns the matching curve object', () => {
    expect(defaultCurveForPowertrain('ICE')).toEqual(DEFAULT_CURVES.ICE);
    expect(defaultCurveForPowertrain('EV')).toEqual(DEFAULT_CURVES.EV);
  });
});

describe('pchipInterpolate', () => {
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

describe('depreciationFactor', () => {
  it('is 1 for a new car (age 0)', () => {
    expect(depreciationFactor(0)).toBe(1);
  });

  it('hits the ICE anchor values exactly when sampled at anchor ages', () => {
    expect(depreciationFactor(0)).toBeCloseTo(1.0, 9);
    expect(depreciationFactor(2)).toBeCloseTo(0.68, 9);
    expect(depreciationFactor(4)).toBeCloseTo(0.49, 9);
    expect(depreciationFactor(7)).toBeCloseTo(0.34, 9);
    expect(depreciationFactor(12)).toBeCloseTo(0.2, 9);
  });

  it('accepts an explicit curve override (EV defaults)', () => {
    const ev = DEFAULT_CURVES.EV;
    const ys = factorsOf(ev);
    expect(depreciationFactor(0, ev)).toBeCloseTo(1.0, 9);
    expect(depreciationFactor(2, ev)).toBeCloseTo(ys[1], 9);
    expect(depreciationFactor(4, ev)).toBeCloseTo(ys[2], 9);
    expect(depreciationFactor(7, ev)).toBeCloseTo(ys[3], 9);
    expect(depreciationFactor(12, ev)).toBeCloseTo(ys[4], 9);
  });

  it('decays at 10%/yr past year 12 (exponential tail)', () => {
    const yr12 = depreciationFactor(12);
    expect(depreciationFactor(13)).toBeCloseTo(yr12 * 0.9, 9);
    expect(depreciationFactor(15)).toBeCloseTo(yr12 * Math.pow(0.9, 3), 9);
    expect(depreciationFactor(20)).toBeCloseTo(yr12 * Math.pow(0.9, 8), 9);
  });

  it('is monotonically decreasing across the full domain we use', () => {
    let prev = depreciationFactor(0);
    for (let age = 1; age <= 25; age++) {
      const f = depreciationFactor(age);
      expect(f).toBeLessThan(prev);
      prev = f;
    }
  });

  it('EV factor is below ICE factor in years 2–10 (steeper drop)', () => {
    for (const age of [2, 3, 5, 7, 10]) {
      const ice = depreciationFactor(age, DEFAULT_CURVES.ICE);
      const ev = depreciationFactor(age, DEFAULT_CURVES.EV);
      expect(ev).toBeLessThan(ice);
    }
  });

  it('never returns a negative value (extrapolation stays positive)', () => {
    for (let age = 0; age <= 50; age++) {
      expect(depreciationFactor(age)).toBeGreaterThan(0);
    }
  });
});

describe('clampFactorAt', () => {
  const ice = factorsOf(DEFAULT_CURVES.ICE); // [1.0, 0.68, 0.49, 0.34, 0.20]

  it('locks index 0 at 1 regardless of input', () => {
    expect(clampFactorAt(ice, 0, 0.5)).toBe(1);
    expect(clampFactorAt(ice, 0, 99)).toBe(1);
  });

  it('clamps an interior factor below its left neighbor', () => {
    expect(clampFactorAt(ice, 1, 1.5)).toBe(ice[0]); // 1.5 > Y0=1.0 → 1.0
  });

  it('clamps an interior factor above its right neighbor', () => {
    expect(clampFactorAt(ice, 1, 0.1)).toBe(ice[2]); // 0.1 < Y4=0.49 → 0.49
  });

  it('passes through valid in-range values', () => {
    expect(clampFactorAt(ice, 2, 0.4)).toBeCloseTo(0.4, 9);
  });

  it('clamps the last index to >= 0 with no right neighbor constraint', () => {
    expect(clampFactorAt(ice, 4, -0.2)).toBe(0);
    expect(clampFactorAt(ice, 4, 0.5)).toBe(ice[3]); // can't exceed Y7=0.34
  });
});

describe('buildPreviewSamples', () => {
  it('spans 0..PREVIEW_END_AGE in PREVIEW_STEP increments', () => {
    const samples = buildPreviewSamples(DEFAULT_CURVES.ICE);
    expect(samples[0].age).toBe(0);
    expect(samples[samples.length - 1].age).toBe(PREVIEW_END_AGE);
    expect(samples.length).toBe(Math.round(PREVIEW_END_AGE / PREVIEW_STEP) + 1);
  });

  it('exact-anchor samples match the curve factors', () => {
    const samples = buildPreviewSamples(DEFAULT_CURVES.ICE);
    const ice = factorsOf(DEFAULT_CURVES.ICE);
    for (let i = 0; i < ANCHOR_AGES.length; i++) {
      const found = samples.find((s) => s.age === ANCHOR_AGES[i]);
      expect(found).toBeDefined();
      expect(found!.factor).toBeCloseTo(ice[i], 6);
    }
  });

  it('extrapolation samples (age > 12) decay 10%/yr from the year-12 anchor', () => {
    const samples = buildPreviewSamples(DEFAULT_CURVES.ICE);
    const yr12 = samples.find((s) => s.age === 12)!.factor;
    const yr13 = samples.find((s) => s.age === 13)!.factor;
    expect(yr13).toBeCloseTo(yr12 * 0.9, 6);
  });

  it('produces a monotonically non-increasing series', () => {
    const samples = buildPreviewSamples(DEFAULT_CURVES.EV);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].factor).toBeLessThanOrEqual(samples[i - 1].factor + 1e-9);
    }
  });
});
