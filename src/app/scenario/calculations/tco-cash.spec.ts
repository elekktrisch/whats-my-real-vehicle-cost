import { tcoBreakdown } from './tco';
import { maintenanceK } from './maintenance';

const usCashShared = {
  tab: 'cash' as const,
  locale: 'US' as const,
  powertrain: 'ICE' as const,
  purchasePrice: 40000,
  residualValue: 14000,
  vehicleAge: 0,
  annualMileage: 10000,
  keepDurationYears: 7,
  downPayment: 40000,
  insuranceAnnual: 2000,
  maintenanceBase: 600,
  maintenanceK: 0,
  fuelEfficiency: 28,
  fuelPrice: 3.5,
  chargerStatus: 'none' as const,
  solar: false,
};

describe('cashTco', () => {
  it('opportunity-cost grows with the rate', () => {
    const lo = tcoBreakdown({ ...usCashShared, opportunityCostRate: 0 });
    const hi = tcoBreakdown({ ...usCashShared, opportunityCostRate: 0.08 });
    expect(hi.totals.financing).toBeGreaterThan(lo.totals.financing);
  });
});

describe('cashTco — maintenance age curve', () => {
  // Cash mode is the cleanest place to inspect maintenance behavior because
  // there's no lease-cycle structure on top of the curve.
  const cashAged = {
    tab: 'cash' as const,
    locale: 'US' as const,
    powertrain: 'ICE' as const,
    purchasePrice: 40000,
    residualValue: 14000,
    vehicleAge: 0,
    annualMileage: 12000,
    keepDurationYears: 10,
    downPayment: 40000,
    insuranceAnnual: 2000,
    maintenanceBase: 600,
    maintenanceK: maintenanceK('mid', 'ICE'), // 0.08
    fuelEfficiency: 28,
    fuelPrice: 3.5,
    chargerStatus: 'none' as const,
    solar: false,
    opportunityCostRate: 0,
  };

  it('grows ~base for year 1 → ~base × (1 + k × 9.5) by year 10', () => {
    const r = tcoBreakdown(cashAged);
    const yr1 = r.series[12].maintenance - r.series[0].maintenance;
    const yr10 = r.series[120].maintenance - r.series[108].maintenance;
    // yr1 ≈ base × (1 + k × 0.5) ≈ 600 × 1.04 = 624
    expect(yr1).toBeGreaterThan(620);
    expect(yr1).toBeLessThan(640);
    // yr10 ≈ base × (1 + k × 9.5) ≈ 600 × 1.76 = 1056
    expect(yr10).toBeGreaterThan(1040);
    expect(yr10).toBeLessThan(1080);
  });

  it('total maintenance with k > 0 exceeds flat (k = 0)', () => {
    const flat = tcoBreakdown({ ...cashAged, maintenanceK: 0 });
    const curved = tcoBreakdown(cashAged);
    expect(curved.totals.maintenance).toBeGreaterThan(flat.totals.maintenance);
  });
});

describe('cashTco — solar / home charger', () => {
  const usEv = {
    tab: 'cash' as const,
    locale: 'US' as const,
    powertrain: 'EV' as const,
    purchasePrice: 40000,
    residualValue: 18000,
    vehicleAge: 0,
    annualMileage: 12000,
    keepDurationYears: 5,
    downPayment: 40000,
    insuranceAnnual: 2000,
    maintenanceBase: 400,
    maintenanceK: maintenanceK('mid', 'EV'),
    fuelEfficiency: 3.5,
    fuelPrice: 0.16,
    chargerStatus: 'none' as const,
    solar: false,
    opportunityCostRate: 0,
  };

  it('charger off: no install cost added to maintenance', () => {
    const r = tcoBreakdown(usEv);
    expect(r.series[0].maintenance).toBe(0);
  });

  it('charger on: install cost lands at month 0 (US default $1500)', () => {
    const r = tcoBreakdown({ ...usEv, chargerStatus: 'buying' });
    expect(r.series[0].maintenance).toBeCloseTo(1500, 4);
    expect(r.series[1].maintenance).toBeGreaterThan(1500);
  });

  it('charger on EU: install cost is €1200', () => {
    const r = tcoBreakdown({
      ...usEv,
      locale: 'EU',
      fuelEfficiency: 17,
      fuelPrice: 0.32,
      chargerStatus: 'buying' as const,
    });
    expect(r.series[0].maintenance).toBeCloseTo(1200, 4);
  });

  it('charger on + solar: fuel cost drops to 15% of grid', () => {
    const grid = tcoBreakdown({ ...usEv, chargerStatus: 'buying' as const, solar: false });
    const solar = tcoBreakdown({ ...usEv, chargerStatus: 'buying' as const, solar: true });
    expect(solar.totals.fuel).toBeCloseTo(grid.totals.fuel * 0.15, 2);
  });

  it('solar without charger has no effect (gating)', () => {
    const off = tcoBreakdown({ ...usEv, chargerStatus: 'none' as const, solar: false });
    const solar = tcoBreakdown({ ...usEv, chargerStatus: 'none' as const, solar: true });
    expect(solar.totals.fuel).toBeCloseTo(off.totals.fuel, 2);
  });

  it('install cost only applies for EV (ignored for ICE)', () => {
    const r = tcoBreakdown({
      ...usEv,
      powertrain: 'ICE',
      chargerStatus: 'buying' as const,
    });
    expect(r.series[0].maintenance).toBe(0);
  });

  it('"installed" charger: solar applies but install cost is not added (sunk)', () => {
    const grid = tcoBreakdown({ ...usEv, chargerStatus: 'installed' as const, solar: false });
    const solar = tcoBreakdown({ ...usEv, chargerStatus: 'installed' as const, solar: true });
    expect(grid.series[0].maintenance).toBe(0);
    expect(solar.totals.fuel).toBeCloseTo(grid.totals.fuel * 0.15, 2);
  });
});
