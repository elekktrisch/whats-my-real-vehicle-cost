import { backDeriveMsrp } from './msrp';
import { DEFAULT_CURVES } from './depreciation';

describe('backDeriveMsrp', () => {
  it('returns purchase price for a new car', () => {
    expect(backDeriveMsrp(40000, 0)).toBe(40000);
  });

  it('back-derives MSRP from a 4-year-old VW Golf using the default ICE curve', () => {
    // ICE curve at age 4 = 0.49 → 15000 / 0.49 ≈ 30,612.
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

  it('accepts an explicit curve and uses it for the back-derive', () => {
    const ev = DEFAULT_CURVES.EV;
    // EV curve at age 4 = 0.36 → 15000 / 0.36 ≈ 41,667.
    const msrp = backDeriveMsrp(15000, 4, ev);
    expect(msrp).toBeCloseTo(15000 / 0.36, 0);
  });

  it('EV curve back-derives a higher MSRP than ICE for the same used price', () => {
    const ice = backDeriveMsrp(15000, 4, DEFAULT_CURVES.ICE);
    const ev = backDeriveMsrp(15000, 4, DEFAULT_CURVES.EV);
    expect(ev).toBeGreaterThan(ice);
  });
});