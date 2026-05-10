import { tcoBreakdown } from './tco';
import { MaintenanceContext, makeMaintenanceCurve } from './maintenance';

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
  homeChargerInstall: 1500,
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

describe('leaseTco', () => {
  it('lease total includes interest & fees', () => {
    const r = tcoBreakdown(usLeaseShared);
    expect(r.totals.interestAndFees).toBeGreaterThan(0);
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
    const lateFinance = r.series[60].interestAndFees - r.series[36].interestAndFees;
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

  it('renew lease grows opportunity cost faster after each cycle boundary', () => {
    // Each cycle adds a fresh down payment that compounds independently from
    // its cycle start. Cycle 2 onward has more compounding principal in play,
    // so the slope is strictly greater than cycle 1's.
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      opportunityCostRate: 0.06,
    });
    const cycle1Slope = (r.series[36].opportunityCost - r.series[0].opportunityCost) / 36;
    const cycle2Slope = (r.series[72].opportunityCost - r.series[36].opportunityCost) / 36;
    expect(cycle2Slope).toBeGreaterThan(cycle1Slope);
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

  it('opportunity-cost compounds with the rate (covers down + monthly fees + handback)', () => {
    const lo = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0 });
    const hi = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0.08 });
    expect(hi.totals.opportunityCost).toBeGreaterThan(lo.totals.opportunityCost);
    // Strict lower bound: opp on the down alone compounded for the keep.
    // Full opp also includes monthly lease fees and the cycle-end handback.
    const oppOnDownAlone =
      usLeaseShared.downPayment * (Math.pow(1.08, usLeaseShared.keepDurationYears) - 1);
    expect(hi.totals.opportunityCost - lo.totals.opportunityCost).toBeGreaterThan(oppOnDownAlone);
    // Real lease finance fees unaffected by opp-cost rate.
    expect(hi.totals.interestAndFees).toBeCloseTo(lo.totals.interestAndFees, 4);
  });

  it('buyout uses leaseEndResidual for the cash payment (cashOut differs by leaseEndResidual delta)', () => {
    const baseInputs = {
      ...usLeaseShared,
      keepDurationYears: 5,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut' as const,
      buyoutFee: 0,
      earlyTerminationFee: 0,
      residualValue: 14_000, // end-of-keep
    };
    const lowResidual = tcoBreakdown({ ...baseInputs, leaseEndResidual: 16_000 });
    const highResidual = tcoBreakdown({ ...baseInputs, leaseEndResidual: 22_000 });
    // The cash flow at buyout differs by exactly the leaseEndResidual delta.
    // (The chart's leaseEnd line now only shows buyoutFee + earlyExit; the
    // residual portion flows into depreciation since the user keeps the asset.)
    const lowAtBuyout = lowResidual.series[36].cashOut;
    const highAtBuyout = highResidual.series[36].cashOut;
    expect(highAtBuyout - lowAtBuyout).toBeCloseTo(6_000, 0);
  });
});

describe('leaseTco — maintenance age curve', () => {
  it('renew lease: maintenance per cycle is identical (sawtooth resets each cycle)', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'handBack',
      maintenance: mctxLinear(35000, 0.08, 0.015),
    });
    const cycle1Maint = r.series[36].maintenance - r.series[0].maintenance;
    const cycle2Maint = r.series[72].maintenance - r.series[36].maintenance;
    // Each cycle starts a new car at age 0, so per-cycle maintenance is equal.
    expect(cycle2Maint).toBeCloseTo(cycle1Maint, 2);
  });

  it('buyout: owned-tail maintenance reflects car age at buyout (not age 0)', () => {
    // After a 36-month lease, the car is 3 years old. Once buyout flips the
    // car into owned status, maintenance should immediately reflect age 3,
    // not restart at age 0. The first owned-tail month's maintenance
    // increment must exceed what month 1 of a brand-new ownership would be.
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 5,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut',
      maintenance: mctxLinear(35000, 0.08, 0.015),
    });
    // First-month-of-owned-tail increment (car aged 3yr, full K).
    const firstTailMonth = r.series[37].maintenance - r.series[36].maintenance;
    // Compare to a fresh-car cash purchase: month 1 increment (car aged 0).
    const cash = tcoBreakdown({
      ...usLeaseShared,
      tab: 'cash' as const,
      vehicleAge: 0,
      keepDurationYears: 1,
      maintenance: mctxLinear(35000, 0.08, 0.015),
    });
    const freshMonth1 = cash.series[1].maintenance - cash.series[0].maintenance;
    // A 3-year-old car's monthly maintenance must be strictly greater than
    // a brand-new car's. With K~0.07 for mid ICE, ratio should be ~(1+0.07×3) = 1.21×.
    expect(firstTailMonth).toBeGreaterThan(freshMonth1 * 1.15);
  });

  it('buyout: maintenance grows slowly during lease, then climbs faster on the owned tail', () => {
    const r = tcoBreakdown({
      ...usLeaseShared,
      keepDurationYears: 6,
      leaseTermMonths: 36,
      leaseEndChoice: 'buyOut',
      maintenance: mctxLinear(35000, 0.08, 0.015),
    });
    // Lease portion: half-aging (warranty handles powertrain, consumables age).
    // Owned tail: full aging.
    const leasedYr1 = r.series[12].maintenance - r.series[0].maintenance;
    const leasedYr3 = r.series[36].maintenance - r.series[24].maintenance;
    expect(leasedYr3).toBeGreaterThan(leasedYr1); // grows during lease (half-K)
    const ownedYr1 = r.series[48].maintenance - r.series[36].maintenance;
    const ownedYr3 = r.series[72].maintenance - r.series[60].maintenance;
    expect(ownedYr3).toBeGreaterThan(ownedYr1); // and grows faster once owned
    // Owned-tail growth slope > lease-portion growth slope (full vs half K).
    expect(ownedYr3 - ownedYr1).toBeGreaterThan(leasedYr3 - leasedYr1);
  });
});
