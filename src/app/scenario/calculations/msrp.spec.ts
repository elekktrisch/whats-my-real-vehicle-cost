import { backDeriveMsrp } from './msrp';

describe('backDeriveMsrp', () => {
  it('returns purchase price for a new car', () => {
    expect(backDeriveMsrp(40000, 0)).toBe(40000);
  });

  it('back-derives MSRP from a 4-year-old VW Golf using the PRODUCT.md curve', () => {
    // 4-yr retention = 0.8 * 0.85^3 ≈ 0.491 → 15000 / 0.491 ≈ 30,500
    const msrp = backDeriveMsrp(15000, 4);
    expect(msrp).toBeGreaterThan(29000);
    expect(msrp).toBeLessThan(32000);
  });

  it('grows monotonically with age for a fixed purchase price', () => {
    let prev = backDeriveMsrp(20000, 0);
    for (let age = 1; age <= 8; age++) {
      const msrp = backDeriveMsrp(20000, age);
      expect(msrp).toBeGreaterThan(prev);
      prev = msrp;
    }
  });
});