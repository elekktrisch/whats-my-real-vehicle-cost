import { tcoBreakdown } from './tco';
import { maintenanceK } from './maintenance';

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
  maintenanceBase: 525,
  maintenanceK: 0,
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
  opportunityCostRate: 0,
};

describe('leaseTco', () => {
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

  it('opportunity-cost on down payment grows with the rate', () => {
    const lo = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0 });
    const hi = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0.08 });
    expect(hi.totals.financing).toBeGreaterThan(lo.totals.financing);
    const expectedExtra = usLeaseShared.downPayment * 0.08 * usLeaseShared.keepDurationYears;
    expect(hi.totals.financing - lo.totals.financing).toBeCloseTo(expectedExtra, 4);
  });
});

describe('leaseTco — maintenance age curve', () => {
  it('renew lease: maintenance per cycle is identical (sawtooth resets each cycle)', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      maintenanceBase: 525,
      maintenanceK: maintenanceK('mid', 'ICE'),
    });
    const cycle1Maint = r.series[36].maintenance - r.series[0].maintenance;
    const cycle2Maint = r.series[72].maintenance - r.series[36].maintenance;
    // Each cycle starts a new car at age 0, so per-cycle maintenance is equal.
    expect(cycle2Maint).toBeCloseTo(cycle1Maint, 2);
  });

  it('buyout: maintenance is flat through the lease term, then climbs on the owned tail', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut',
      maintenanceBase: 525,
      maintenanceK: maintenanceK('mid', 'ICE'),
    });
    const mid1 = r.series[18].maintenance - r.series[6].maintenance;
    const mid2 = r.series[30].maintenance - r.series[18].maintenance;
    expect(mid1).toBeCloseTo(mid2, 1); // flat slope during lease
    const ownedYr1 = r.series[48].maintenance - r.series[36].maintenance;
    const ownedYr3 = r.series[72].maintenance - r.series[60].maintenance;
    expect(ownedYr3).toBeGreaterThan(ownedYr1);
  });
});
