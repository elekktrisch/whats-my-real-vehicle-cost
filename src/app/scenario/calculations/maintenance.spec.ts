import {
  DEFAULT_MAINTENANCE_CURVES,
  MAINTENANCE_ANCHOR_AGES,
  MAINTENANCE_PREVIEW_END_AGE,
  buildMaintenancePreviewSamples,
  clampMaintenanceFactorAt,
  defaultMaintenanceCurveForPowertrain,
  factorsOfMaintenance,
  maintenanceAt,
  maintenanceFactor,
  makeMaintenanceCurve,
} from './maintenance';

describe('makeMaintenanceCurve / MaintenanceCurve shape', () => {
  it('builds a curve whose samples zip MAINTENANCE_ANCHOR_AGES with the given factors', () => {
    const c = makeMaintenanceCurve([0.015, 0.0186, 0.0222, 0.027, 0.033]);
    expect(c.samples.length).toBe(5);
    expect(c.samples.map((s) => s.age)).toEqual([0, 3, 6, 10, 15]);
    expect(c.samples.map((s) => s.factor)).toEqual([0.015, 0.0186, 0.0222, 0.027, 0.033]);
  });

  it('factorsOfMaintenance returns the y-array in anchor order', () => {
    const c = makeMaintenanceCurve([0.015, 0.0186, 0.0222, 0.027, 0.033]);
    expect(factorsOfMaintenance(c)).toEqual([0.015, 0.0186, 0.0222, 0.027, 0.033]);
  });

  it('Y0 is NOT auto-locked — caller controls the year-0 value', () => {
    const c = makeMaintenanceCurve([0.005, 0.01, 0.02, 0.03, 0.05]);
    expect(c.samples[0].factor).toBe(0.005);
  });
});

describe('MAINTENANCE_ANCHOR_AGES / DEFAULT_MAINTENANCE_CURVES', () => {
  it('exposes 5 anchor ages [0, 3, 6, 10, 15]', () => {
    expect(Array.from(MAINTENANCE_ANCHOR_AGES)).toEqual([0, 3, 6, 10, 15]);
  });

  it('ICE default is [1.50%, 1.86%, 2.22%, 2.70%, 3.30%] of MSRP', () => {
    expect(factorsOfMaintenance(DEFAULT_MAINTENANCE_CURVES.ICE)).toEqual([
      0.015, 0.0186, 0.0222, 0.027, 0.033,
    ]);
  });

  it('EV default is roughly half of ICE (cheaper drivetrain wear)', () => {
    expect(factorsOfMaintenance(DEFAULT_MAINTENANCE_CURVES.EV)).toEqual([
      0.007, 0.008, 0.009, 0.0104, 0.012,
    ]);
  });

  it('defaultMaintenanceCurveForPowertrain returns the matching curve object', () => {
    expect(defaultMaintenanceCurveForPowertrain('ICE')).toEqual(DEFAULT_MAINTENANCE_CURVES.ICE);
    expect(defaultMaintenanceCurveForPowertrain('EV')).toEqual(DEFAULT_MAINTENANCE_CURVES.EV);
  });
});

describe('maintenanceFactor', () => {
  it('hits the ICE anchor values exactly when sampled at anchor ages', () => {
    const ice = DEFAULT_MAINTENANCE_CURVES.ICE;
    expect(maintenanceFactor(0, ice)).toBeCloseTo(0.015, 9);
    expect(maintenanceFactor(3, ice)).toBeCloseTo(0.0186, 9);
    expect(maintenanceFactor(6, ice)).toBeCloseTo(0.0222, 9);
    expect(maintenanceFactor(10, ice)).toBeCloseTo(0.027, 9);
    expect(maintenanceFactor(15, ice)).toBeCloseTo(0.033, 9);
  });

  it('clamps negative ages to year-0 factor', () => {
    const ice = DEFAULT_MAINTENANCE_CURVES.ICE;
    expect(maintenanceFactor(-3, ice)).toBe(ice.samples[0].factor);
  });

  it('extrapolates linearly past year 15 at 3× the last-segment slope', () => {
    // ICE last segment: (0.033 - 0.027) / (15 - 10) = 0.0012/yr
    // Tail slope: 0.0012 × 3 = 0.0036/yr
    const ice = DEFAULT_MAINTENANCE_CURVES.ICE;
    const yr15 = maintenanceFactor(15, ice);
    expect(maintenanceFactor(16, ice)).toBeCloseTo(yr15 + 0.0036, 9);
    expect(maintenanceFactor(20, ice)).toBeCloseTo(yr15 + 5 * 0.0036, 9);
    expect(maintenanceFactor(25, ice)).toBeCloseTo(yr15 + 10 * 0.0036, 9);
  });

  it('is monotonically non-decreasing across the full domain', () => {
    const ice = DEFAULT_MAINTENANCE_CURVES.ICE;
    let prev = maintenanceFactor(0, ice);
    for (let age = 0.5; age <= 25; age += 0.5) {
      const f = maintenanceFactor(age, ice);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = f;
    }
  });

  it('ICE factor is above EV factor at every age (ICE costs more to maintain)', () => {
    for (const age of [0, 2, 5, 10, 15, 20]) {
      const ice = maintenanceFactor(age, DEFAULT_MAINTENANCE_CURVES.ICE);
      const ev = maintenanceFactor(age, DEFAULT_MAINTENANCE_CURVES.EV);
      expect(ev).toBeLessThan(ice);
    }
  });
});

describe('clampMaintenanceFactorAt (direction-flipped: monotonic-increasing)', () => {
  const ice = factorsOfMaintenance(DEFAULT_MAINTENANCE_CURVES.ICE);
  // [0.015, 0.0186, 0.0222, 0.027, 0.033]

  it('clamps the first index below 0 to 0 (no negative maintenance)', () => {
    expect(clampMaintenanceFactorAt(ice, 0, -0.01)).toBe(0);
  });

  it('clamps the first index above its right neighbor to the right neighbor', () => {
    expect(clampMaintenanceFactorAt(ice, 0, 0.05)).toBe(ice[1]);
  });

  it('clamps an interior factor below its left neighbor to the left neighbor', () => {
    expect(clampMaintenanceFactorAt(ice, 1, 0.005)).toBe(ice[0]);
  });

  it('clamps an interior factor above its right neighbor to the right neighbor', () => {
    expect(clampMaintenanceFactorAt(ice, 1, 0.05)).toBe(ice[2]);
  });

  it('passes through valid in-range values', () => {
    expect(clampMaintenanceFactorAt(ice, 2, 0.02)).toBeCloseTo(0.02, 9);
  });

  it('clamps the last index above the cap (10% of MSRP) to the cap', () => {
    expect(clampMaintenanceFactorAt(ice, 4, 0.5)).toBe(0.1);
  });

  it('clamps the last index below its left neighbor to the left neighbor', () => {
    expect(clampMaintenanceFactorAt(ice, 4, 0.01)).toBe(ice[3]);
  });
});

describe('buildMaintenancePreviewSamples', () => {
  it('spans 0..MAINTENANCE_PREVIEW_END_AGE', () => {
    const samples = buildMaintenancePreviewSamples(DEFAULT_MAINTENANCE_CURVES.ICE);
    expect(samples[0].age).toBe(0);
    expect(samples[samples.length - 1].age).toBe(MAINTENANCE_PREVIEW_END_AGE);
  });

  it('exact-anchor samples match the curve factors', () => {
    const samples = buildMaintenancePreviewSamples(DEFAULT_MAINTENANCE_CURVES.ICE);
    const ice = factorsOfMaintenance(DEFAULT_MAINTENANCE_CURVES.ICE);
    for (let i = 0; i < MAINTENANCE_ANCHOR_AGES.length; i++) {
      const found = samples.find((s) => s.age === MAINTENANCE_ANCHOR_AGES[i]);
      expect(found).toBeDefined();
      expect(found!.factor).toBeCloseTo(ice[i], 6);
    }
  });

  it('produces a monotonically non-decreasing series (including the tail)', () => {
    const samples = buildMaintenancePreviewSamples(DEFAULT_MAINTENANCE_CURVES.ICE);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].factor).toBeGreaterThanOrEqual(samples[i - 1].factor - 1e-9);
    }
  });

  it('extrapolation samples (age > 15) follow the 3× last-segment slope', () => {
    const samples = buildMaintenancePreviewSamples(DEFAULT_MAINTENANCE_CURVES.ICE);
    const yr15 = samples.find((s) => s.age === 15)!.factor;
    const yr16 = samples.find((s) => s.age === 16)!.factor;
    expect(yr16 - yr15).toBeCloseTo(0.0036, 6);
  });
});

describe('maintenanceAt', () => {
  const ctx = (overrides: Partial<{
    msrp: number;
    curve: ReturnType<typeof makeMaintenanceCurve>;
    categoryMult: number;
    mileageFactor: number;
  }> = {}) => ({
    msrp: 30000,
    curve: DEFAULT_MAINTENANCE_CURVES.ICE,
    categoryMult: 1,
    mileageFactor: 1,
    ...overrides,
  });

  it('standard case = msrp × curve(age) × categoryMult × mileageFactor', () => {
    const c = ctx();
    // age 5 lies between anchors 3 and 6 — non-anchor sample
    const f = maintenanceFactor(5, c.curve);
    expect(maintenanceAt(c, 5)).toBeCloseTo(c.msrp * f * 1 * 1, 6);
  });

  it('scales with categoryMult', () => {
    const standard = maintenanceAt(ctx({ categoryMult: 1 }), 5);
    const luxury = maintenanceAt(ctx({ categoryMult: 1.8 }), 5);
    expect(luxury).toBeCloseTo(standard * 1.8, 6);
  });

  it('scales with mileageFactor (year-0 included, per Q5 decision)', () => {
    const nominal = maintenanceAt(ctx({ mileageFactor: 1 }), 0);
    const heavy = maintenanceAt(ctx({ mileageFactor: 1.67 }), 0);
    expect(heavy).toBeCloseTo(nominal * 1.67, 6);
  });

  it('clamps negative ages to age-0 factor', () => {
    const c = ctx();
    expect(maintenanceAt(c, -5)).toBe(maintenanceAt(c, 0));
  });

  it('agingScale=1 (default) is a no-op', () => {
    const c = ctx();
    expect(maintenanceAt(c, 5, 1)).toBeCloseTo(maintenanceAt(c, 5), 9);
  });

  it('agingScale=0.5 halves only the growth above year-0 (lease-warranty case)', () => {
    const c = ctx();
    const yr0 = maintenanceAt(c, 0);
    const yr5Full = maintenanceAt(c, 5, 1);
    const yr5Half = maintenanceAt(c, 5, 0.5);
    // year-0 unchanged; gain halved
    expect(maintenanceAt(c, 0, 0.5)).toBeCloseTo(yr0, 6);
    expect(yr5Half).toBeCloseTo(yr0 + 0.5 * (yr5Full - yr0), 6);
  });

  it('integration: ICE mid-category nominal-mileage at age 0 reproduces the legacy linear model within rounding', () => {
    // Today: maintenance(0) = msrp × 0.015 × 1.0 × (1 + 0.08 × 0) = msrp × 0.015
    // Curve: maintenanceAt = msrp × 0.015 × 1 × 1 = msrp × 0.015 ✓
    const c = ctx({ msrp: 30000 });
    expect(maintenanceAt(c, 0)).toBeCloseTo(30000 * 0.015, 6);
  });

  it('integration: at anchor ages, default ICE curve matches the legacy linear model exactly', () => {
    // Legacy: m(age) = base × (1 + k × age) with base = 0.015 × msrp, k = 0.08 (mid).
    // Defaults are seeded to match at anchor ages.
    const msrp = 40000;
    const c = ctx({ msrp });
    for (const [age, expectedFactor] of [
      [0, 0.015],
      [3, 0.0186], // 0.015 × (1 + 0.08 × 3) = 0.0186
      [6, 0.0222], // 0.015 × (1 + 0.08 × 6) = 0.0222
      [10, 0.027], // 0.015 × (1 + 0.08 × 10) = 0.027
      [15, 0.033], // 0.015 × (1 + 0.08 × 15) = 0.033
    ] as const) {
      expect(maintenanceAt(c, age)).toBeCloseTo(msrp * expectedFactor, 4);
    }
  });
});
