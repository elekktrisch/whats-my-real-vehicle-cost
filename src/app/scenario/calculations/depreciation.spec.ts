import { depreciationFactor } from './depreciation';

describe('depreciationFactor', () => {
  it('is 1 for a new car (age 0)', () => {
    expect(depreciationFactor(0)).toBe(1);
  });

  it('drops 20% in year 1', () => {
    expect(depreciationFactor(1)).toBeCloseTo(0.8, 6);
  });

  it('drops 15%/yr in years 2 to 5', () => {
    expect(depreciationFactor(2)).toBeCloseTo(0.8 * 0.85, 6);
    expect(depreciationFactor(5)).toBeCloseTo(0.8 * Math.pow(0.85, 4), 6);
  });

  it('drops 10%/yr after year 5', () => {
    const yr5 = depreciationFactor(5);
    expect(depreciationFactor(6)).toBeCloseTo(yr5 * 0.9, 6);
  });

  it('is monotonically decreasing', () => {
    let prev = depreciationFactor(0);
    for (let age = 1; age <= 10; age++) {
      const f = depreciationFactor(age);
      expect(f).toBeLessThan(prev);
      prev = f;
    }
  });
});