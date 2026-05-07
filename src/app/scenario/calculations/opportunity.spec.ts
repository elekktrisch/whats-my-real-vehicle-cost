import {
  opportunityCostMonthly,
  opportunityCostOverYears,
  opportunityCostStream,
} from './opportunity';

describe('opportunityCostOverYears', () => {
  it('is zero when rate is zero', () => {
    expect(opportunityCostOverYears(40000, 0, 5)).toBe(0);
  });

  it('is zero when years is zero', () => {
    expect(opportunityCostOverYears(40000, 0.05, 0)).toBe(0);
  });

  it('grows monotonically with the rate', () => {
    const at5 = opportunityCostOverYears(40000, 0.05, 7);
    const at8 = opportunityCostOverYears(40000, 0.08, 7);
    expect(at8).toBeGreaterThan(at5);
  });

  it('40k at 5% over 7 years is between 15k and 20k', () => {
    const cost = opportunityCostOverYears(40000, 0.05, 7);
    expect(cost).toBeGreaterThan(15000);
    expect(cost).toBeLessThan(20000);
  });
});

describe('opportunityCostMonthly', () => {
  it('returns months+1 entries starting at 0', () => {
    const series = opportunityCostMonthly(40000, 0.05, 60);
    expect(series.length).toBe(61);
    expect(series[0]).toBe(0);
  });

  it('is monotonically increasing', () => {
    const series = opportunityCostMonthly(40000, 0.08, 84);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeGreaterThanOrEqual(series[i - 1]);
    }
  });
});

describe('opportunityCostStream', () => {
  it('returns months+1 entries starting at 0', () => {
    const series = opportunityCostStream([{ month: 0, amount: 5000 }], 0.05, 60);
    expect(series.length).toBe(61);
    expect(series[0]).toBe(0);
  });

  it('with a single injection at month 0 matches opportunityCostMonthly', () => {
    const stream = opportunityCostStream([{ month: 0, amount: 5000 }], 0.05, 60);
    const single = opportunityCostMonthly(5000, 0.05, 60);
    for (let i = 0; i < stream.length; i++) {
      expect(stream[i]).toBeCloseTo(single[i], 6);
    }
  });

  it('an injection at month T contributes nothing before month T', () => {
    const series = opportunityCostStream([{ month: 24, amount: 5000 }], 0.05, 60);
    for (let m = 0; m <= 24; m++) expect(series[m]).toBe(0);
    expect(series[25]).toBeGreaterThan(0);
  });

  it('two injections sum to the per-injection contributions', () => {
    const a = { month: 0, amount: 5000 };
    const b = { month: 36, amount: 5000 };
    const combined = opportunityCostStream([a, b], 0.05, 72);
    const onlyA = opportunityCostStream([a], 0.05, 72);
    const onlyB = opportunityCostStream([b], 0.05, 72);
    for (let m = 0; m < combined.length; m++) {
      expect(combined[m]).toBeCloseTo(onlyA[m] + onlyB[m], 6);
    }
  });

  it('is monotonically non-decreasing', () => {
    const series = opportunityCostStream(
      [
        { month: 0, amount: 5000 },
        { month: 36, amount: 5000 },
      ],
      0.05,
      72,
    );
    for (let m = 1; m < series.length; m++) {
      expect(series[m]).toBeGreaterThanOrEqual(series[m - 1]);
    }
  });

  it('zero rate or zero injections returns all zeros', () => {
    expect(opportunityCostStream([{ month: 0, amount: 5000 }], 0, 12)).toEqual(new Array(13).fill(0));
    expect(opportunityCostStream([], 0.05, 12)).toEqual(new Array(13).fill(0));
  });
});