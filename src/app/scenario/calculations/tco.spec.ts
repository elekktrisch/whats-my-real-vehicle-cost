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
  earlyTerminationFee: 400,
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

  it('hand back + keep > term rolls into a fresh lease cycle (rolling lease model)', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
    });
    // Lease/financing keep accruing past the first term — we sign another lease.
    const lateLease = r.series[60].depreciationOrLease - r.series[36].depreciationOrLease;
    expect(lateLease).toBeGreaterThan(0);
    const lateFinance = r.series[60].financing - r.series[36].financing;
    expect(lateFinance).toBeGreaterThan(0);
    // A handback fee fires at every cycle boundary — months 36 and 72 here.
    expect(r.series[36].leaseEnd).toBeGreaterThan(r.series[35].leaseEnd);
    expect(r.series[72].leaseEnd).toBeGreaterThan(r.series[71].leaseEnd);
  });

  it('renew lease + keep < term applies early termination penalty (single partial cycle)', () => {
    const aligned = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 3,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      earlyTerminationFee: 400,
    });
    const partial = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 2,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      earlyTerminationFee: 400,
    });
    expect(partial.totals.leaseEnd).toBeGreaterThan(aligned.totals.leaseEnd);
  });

  it('renew lease + keep > term + partial final cycle does NOT add early termination (shorter last cycle assumed)', () => {
    const noEtf = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 5,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      earlyTerminationFee: 0,
    });
    const withEtf = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 5,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      earlyTerminationFee: 1000,
    });
    // Final partial cycle (24 of 36 mo in cycle 2) is treated as a shorter
    // last lease — early-termination fee should be irrelevant here.
    expect(withEtf.totals.leaseEnd).toBeCloseTo(noEtf.totals.leaseEnd, 4);
  });

  it('buy out + keep < term applies early termination penalty on top of the buyout', () => {
    const noEtf = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 2,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut',
      earlyTerminationFee: 0,
    });
    const withEtf = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 2,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut',
      earlyTerminationFee: 500,
    });
    expect(withEtf.totals.leaseEnd - noEtf.totals.leaseEnd).toBeCloseTo(500, 4);
  });

  it('renew lease pays a fresh down payment per cycle (no shallowing after first cycle)', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
    });
    // depreciationOrLease slope (= lease.depreciationFee + downPayment/term) should
    // be roughly the same in cycle 2 (months 37-72) as in cycle 1 (months 1-36).
    const cycle1Slope = (r.series[36].depreciationOrLease - r.series[0].depreciationOrLease) / 36;
    const cycle2Slope = (r.series[72].depreciationOrLease - r.series[36].depreciationOrLease) / 36;
    expect(cycle2Slope).toBeCloseTo(cycle1Slope, 4);
  });

  it('renew lease grows opportunity cost step-wise at each cycle boundary', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      opportunityCostRate: 0.06,
    });
    const cycle1Slope = (r.series[36].financing - r.series[0].financing) / 36;
    const cycle2Slope = (r.series[72].financing - r.series[36].financing) / 36;
    // After cycle 2 starts, cumulative down payment doubles → opp cost slope
    // grows by downPayment * rate / 12.
    const expectedDelta = (usLeaseShared.downPayment * 0.06) / 12;
    expect(cycle2Slope - cycle1Slope).toBeCloseTo(expectedDelta, 4);
  });

  it('hand back + keep > term has roughly 2× the cost of a single-term lease', () => {
    const oneCycle = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 3,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
    });
    const twoCycles = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
    });
    const ratio = twoCycles.total / oneCycle.total;
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
  });

  it('lease tab opportunity-cost on down payment grows with the rate', () => {
    const lo = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0 });
    const hi = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0.08 });
    expect(hi.totals.financing).toBeGreaterThan(lo.totals.financing);
    // Linear: total opportunity cost = downPayment * rate * years.
    const expectedExtra = usLeaseShared.downPayment * 0.08 * usLeaseShared.keepDurationYears;
    expect(hi.totals.financing - lo.totals.financing).toBeCloseTo(expectedExtra, 4);
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