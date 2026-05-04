import { maintenanceAt, maintenanceK } from './maintenance';

describe('maintenanceK', () => {
  it('ICE: economy 0.05, mid 0.08, luxury 0.12', () => {
    expect(maintenanceK('economy', 'ICE')).toBeCloseTo(0.05, 6);
    expect(maintenanceK('mid', 'ICE')).toBeCloseTo(0.08, 6);
    expect(maintenanceK('luxury', 'ICE')).toBeCloseTo(0.12, 6);
  });

  it('EV is 60% of ICE for the same category', () => {
    expect(maintenanceK('economy', 'EV')).toBeCloseTo(0.05 * 0.6, 6);
    expect(maintenanceK('mid', 'EV')).toBeCloseTo(0.08 * 0.6, 6);
    expect(maintenanceK('luxury', 'EV')).toBeCloseTo(0.12 * 0.6, 6);
  });
});

describe('maintenanceAt', () => {
  it('returns base at age 0', () => {
    expect(maintenanceAt(1000, 0.08, 0)).toBe(1000);
  });

  it('grows linearly with age', () => {
    // 1000 × (1 + 0.08 × 5) = 1400
    expect(maintenanceAt(1000, 0.08, 5)).toBeCloseTo(1400, 6);
    // 1000 × (1 + 0.08 × 10) = 1800
    expect(maintenanceAt(1000, 0.08, 10)).toBeCloseTo(1800, 6);
  });

  it('end-to-end: ICE economy at age 10 is 1.5×, ICE mid 1.8×, ICE luxury 2.2×', () => {
    expect(maintenanceAt(100, maintenanceK('economy', 'ICE'), 10)).toBeCloseTo(150, 6);
    expect(maintenanceAt(100, maintenanceK('mid', 'ICE'), 10)).toBeCloseTo(180, 6);
    expect(maintenanceAt(100, maintenanceK('luxury', 'ICE'), 10)).toBeCloseTo(220, 6);
  });

  it('clamps negative ages to 0 (returns base)', () => {
    expect(maintenanceAt(1000, 0.08, -5)).toBe(1000);
  });
});