import { categoryMultipliers } from './category';
import { costPerDistance, effectiveMonthly, tcoBreakdown } from './tco';
import type { CategoryMultipliers } from '../scenario.types';

const baseMultipliers: CategoryMultipliers = categoryMultipliers('economy');

const usLeaseShared = {
  tab: 'lease' as const,
  locale: 'US' as const,
  powertrain: 'ICE' as const,
  purchasePrice: 35000,
  residualValue: 18000,
  vehicleAge: 0,
  annualMileage: 12000,
  keepDurationYears: 3,
  downPayment: 4000,
  insuranceAnnual: 1750,
  maintenanceAnnual: 525,
  fuelEfficiency: 28,
  fuelPrice: 3.5,
  homeChargerInstall: 0,
  categoryMultipliers: baseMultipliers,
  apr: 4.5,
  leaseTermMonths: 36,
  leaseEndChoice: 'handBack' as const,
  dispositionFee: 395,
  mileageOverageRate: 0.25,
  excessWearEstimate: 800,
  buyoutFee: 300,
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

  it('lease total includes financing', () => {
    const r = tcoBreakdown(usLeaseShared);
    expect(r.totals.financing).toBeGreaterThan(0);
  });

  it('UC4 buy-out adds a leaseEnd step at the lease term', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut',
      buyoutFee: 300,
    });
    const beforeBuyout = r.series[35].leaseEnd;
    const afterBuyout = r.series[36].leaseEnd;
    expect(afterBuyout).toBeGreaterThan(beforeBuyout);
  });

  it('cash tab opportunity-cost grows with the rate', () => {
    const lo = tcoBreakdown({
      tab: 'cash',
      locale: 'US',
      powertrain: 'ICE',
      purchasePrice: 40000,
      residualValue: 14000,
      vehicleAge: 0,
      annualMileage: 10000,
      keepDurationYears: 7,
      downPayment: 40000,
      insuranceAnnual: 2000,
      maintenanceAnnual: 600,
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      homeChargerInstall: 0,
      categoryMultipliers: baseMultipliers,
      opportunityCostRate: 0,
    });
    const hi = tcoBreakdown({
      tab: 'cash',
      locale: 'US',
      powertrain: 'ICE',
      purchasePrice: 40000,
      residualValue: 14000,
      vehicleAge: 0,
      annualMileage: 10000,
      keepDurationYears: 7,
      downPayment: 40000,
      insuranceAnnual: 2000,
      maintenanceAnnual: 600,
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      homeChargerInstall: 0,
      categoryMultipliers: baseMultipliers,
      opportunityCostRate: 0.08,
    });
    expect(hi.totals.financing).toBeGreaterThan(lo.totals.financing);
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