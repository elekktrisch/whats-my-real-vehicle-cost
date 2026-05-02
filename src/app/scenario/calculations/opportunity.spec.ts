import { opportunityCostMonthly, opportunityCostOverYears } from './opportunity';

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