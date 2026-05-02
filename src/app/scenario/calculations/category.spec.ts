import { categorize, categoryMultipliers } from './category';

describe('categorize', () => {
  it('uses US bands when locale is US', () => {
    expect(categorize(20000, 'US')).toBe('economy');
    expect(categorize(50000, 'US')).toBe('mid');
    expect(categorize(80000, 'US')).toBe('luxury');
  });

  it('uses EU bands when locale is EU', () => {
    expect(categorize(20000, 'EU')).toBe('economy');
    expect(categorize(45000, 'EU')).toBe('mid');
    expect(categorize(70000, 'EU')).toBe('luxury');
  });

  it('VW Golf back-derived MSRP at €25k is economy in EU', () => {
    expect(categorize(25000, 'EU')).toBe('economy');
  });
});

describe('categoryMultipliers', () => {
  it('Economy multipliers are 1.0', () => {
    expect(categoryMultipliers('economy')).toEqual({ insurance: 1.0, maintenance: 1.0 });
  });
  it('Luxury multipliers are higher than mid', () => {
    const mid = categoryMultipliers('mid');
    const lux = categoryMultipliers('luxury');
    expect(lux.insurance).toBeGreaterThan(mid.insurance);
    expect(lux.maintenance).toBeGreaterThan(mid.maintenance);
  });
});