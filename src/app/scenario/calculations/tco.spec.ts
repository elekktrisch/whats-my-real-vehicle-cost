import { costPerDistance, effectiveMonthly, tcoBreakdown } from './tco';
import { MaintenanceContext, makeMaintenanceCurve } from './maintenance';

// Reproduce the legacy linear `(1 + k × age) × baseRate` shape, sampled at
// MAINTENANCE_ANCHOR_AGES, so existing year-N test expectations still hold.
const mctxLinear = (msrp: number, k: number, baseRate: number): MaintenanceContext => ({
  msrp,
  curve: makeMaintenanceCurve([0, 3, 6, 10, 15].map((t) => baseRate * (1 + k * t))),
  categoryMult: 1,
  mileageFactor: 1,
});

const usLeaseShared = {
  tab: 'lease' as const,
  region: 'US' as const,
  powertrain: 'ICE' as const,
  purchasePrice: 35000,
  residualValue: 18000,
  vehicleAge: 0,
  annualMileage: 12000,
  keepDurationYears: 3,
  downPayment: 4000,
  insuranceAnnual: 1750,
  maintenance: mctxLinear(35000, 0, 0.015),
  fuelEfficiency: 28,
  fuelPrice: 3.5,
  chargerStatus: 'none' as const,
  solar: false,
  apr: 4.5,
  leaseTermMonths: 36,
  leaseEndChoice: 'handBack' as const,
  dispositionFee: 395,
  mileageOverageRate: 0.25,
  excessWearEstimate: 800,
  buyoutFee: 300,
  earlyTerminationFee: 400,
  leaseEndResidual: 18000,
  opportunityCostRate: 0,
};

describe('tcoBreakdown', () => {
  it('returns one series point per month plus a zero anchor at month 0', () => {
    const r = tcoBreakdown(usLeaseShared);
    expect(r.series.length).toBe(36 + 1);
    expect(r.series[0].month).toBe(0);
    expect(r.series[0].depreciationOrLease).toBe(0);
  });

  it('series cumulatives match totals at the last month', () => {
    const r = tcoBreakdown(usLeaseShared);
    const last = r.series[r.series.length - 1];
    expect(last.fuel).toBeCloseTo(r.totals.fuel, 4);
    expect(last.insurance).toBeCloseTo(r.totals.insurance, 4);
  });

  it('series is non-decreasing in every category', () => {
    const r = tcoBreakdown(usLeaseShared);
    for (let m = 1; m < r.series.length; m++) {
      const prev = r.series[m - 1];
      const cur = r.series[m];
      expect(cur.fuel).toBeGreaterThanOrEqual(prev.fuel);
      expect(cur.insurance).toBeGreaterThanOrEqual(prev.insurance);
      expect(cur.maintenance).toBeGreaterThanOrEqual(prev.maintenance);
    }
  });

  it('routes to the per-mode function based on tab', () => {
    // Different tabs on otherwise-identical inputs produce different totals —
    // proves the dispatcher actually fans out instead of always running one path.
    const lease = tcoBreakdown(usLeaseShared);
    const finance = tcoBreakdown({
      tab: 'finance',
      region: 'US',
      powertrain: 'ICE',
      purchasePrice: 35000,
      residualValue: 18000,
      vehicleAge: 0,
      annualMileage: 12000,
      keepDurationYears: 3,
      downPayment: 4000,
      insuranceAnnual: 1750,
      maintenance: mctxLinear(35000, 0, 0.015),
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      chargerStatus: 'none',
      solar: false,
      apr: 6,
      loanTermMonths: 36,
      opportunityCostRate: 0,
    });
    expect(lease.total).not.toBeCloseTo(finance.total, 0);
  });
});

describe('effectiveMonthly', () => {
  it('divides total cost by months', () => {
    const r = tcoBreakdown(usLeaseShared);
    const months = 36;
    expect(effectiveMonthly(r, 3)).toBeCloseTo(r.total / months, 6);
  });
});

describe('costPerDistance', () => {
  it('divides total cost by total distance', () => {
    const r = tcoBreakdown(usLeaseShared);
    expect(costPerDistance(r, 12000, 3)).toBeCloseTo(r.total / 36000, 6);
  });

  it('returns 0 when there is no distance', () => {
    const r = tcoBreakdown(usLeaseShared);
    expect(costPerDistance(r, 0, 3)).toBe(0);
  });
});
