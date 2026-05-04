import { costPerDistance, effectiveMonthly, tcoBreakdown } from './tco';
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
  homeChargerInstalled: false,
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

  it('lease tab opportunity-cost on down payment grows with the rate', () => {
    const lo = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0 });
    const hi = tcoBreakdown({ ...usLeaseShared, opportunityCostRate: 0.08 });
    expect(hi.totals.financing).toBeGreaterThan(lo.totals.financing);
    const expectedExtra = usLeaseShared.downPayment * 0.08 * usLeaseShared.keepDurationYears;
    expect(hi.totals.financing - lo.totals.financing).toBeCloseTo(expectedExtra, 4);
  });

  it('cash tab opportunity-cost grows with the rate', () => {
    const baseCash = {
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
      homeChargerInstalled: false,
      solar: false,
    };
    const lo = tcoBreakdown({ ...baseCash, opportunityCostRate: 0 });
    const hi = tcoBreakdown({ ...baseCash, opportunityCostRate: 0.08 });
    expect(hi.totals.financing).toBeGreaterThan(lo.totals.financing);
  });

  it('finance tab applies opportunity cost on the down payment', () => {
    const base = {
      tab: 'finance' as const,
      locale: 'US' as const,
      powertrain: 'ICE' as const,
      purchasePrice: 35000,
      residualValue: 17500,
      vehicleAge: 0,
      annualMileage: 12000,
      keepDurationYears: 5,
      downPayment: 5000,
      insuranceAnnual: 1750,
      maintenanceBase: 525,
      maintenanceK: 0,
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      homeChargerInstalled: false,
      solar: false,
      apr: 6,
      loanTermMonths: 60,
    };
    const noOpp = tcoBreakdown({ ...base, opportunityCostRate: 0 });
    const withOpp = tcoBreakdown({ ...base, opportunityCostRate: 0.08 });
    const expectedExtra = base.downPayment * 0.08 * base.keepDurationYears;
    expect(withOpp.totals.financing - noOpp.totals.financing).toBeCloseTo(expectedExtra, 4);
  });

  it('finance with 100% down ≈ cash for the same scenario (same capital tied up)', () => {
    const shared = {
      locale: 'US' as const,
      powertrain: 'ICE' as const,
      purchasePrice: 35000,
      residualValue: 17500,
      vehicleAge: 0,
      annualMileage: 12000,
      keepDurationYears: 10,
      insuranceAnnual: 1750,
      maintenanceBase: 525,
      maintenanceK: 0,
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      homeChargerInstalled: false,
      solar: false,
      opportunityCostRate: 0.05,
    };
    const finance = tcoBreakdown({
      ...shared,
      tab: 'finance',
      downPayment: 35000,
      apr: 6,
      loanTermMonths: 60,
    });
    const cash = tcoBreakdown({
      ...shared,
      tab: 'cash',
      downPayment: 0,
    });
    expect(finance.total).toBeGreaterThan(cash.total * 0.9);
    expect(finance.total).toBeLessThan(cash.total * 1.1);
  });
});

describe('tcoBreakdown — maintenance age curve', () => {
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
    homeChargerInstalled: false,
    solar: false,
    opportunityCostRate: 0,
  };

  it('cash: maintenance grows ~base for year 1 → ~base × (1 + k × 9.5) by year 10', () => {
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

  it('cash: total maintenance with k > 0 exceeds flat (k = 0)', () => {
    const flat = tcoBreakdown({ ...cashAged, maintenanceK: 0 });
    const curved = tcoBreakdown(cashAged);
    expect(curved.totals.maintenance).toBeGreaterThan(flat.totals.maintenance);
  });

  it('finance: vehicleAge shifts the curve forward (older car → more maintenance)', () => {
    const young = tcoBreakdown({
      tab: 'finance' as const,
      locale: 'US' as const,
      powertrain: 'ICE' as const,
      purchasePrice: 35000,
      residualValue: 14000,
      vehicleAge: 0,
      annualMileage: 12000,
      keepDurationYears: 5,
      downPayment: 5000,
      insuranceAnnual: 1750,
      maintenanceBase: 525,
      maintenanceK: maintenanceK('mid', 'ICE'),
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      homeChargerInstalled: false,
      solar: false,
      apr: 6,
      loanTermMonths: 60,
      opportunityCostRate: 0,
    });
    const old = tcoBreakdown({
      tab: 'finance' as const,
      locale: 'US' as const,
      powertrain: 'ICE' as const,
      purchasePrice: 35000,
      residualValue: 14000,
      vehicleAge: 5,
      annualMileage: 12000,
      keepDurationYears: 5,
      downPayment: 5000,
      insuranceAnnual: 1750,
      maintenanceBase: 525,
      maintenanceK: maintenanceK('mid', 'ICE'),
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      homeChargerInstalled: false,
      solar: false,
      apr: 6,
      loanTermMonths: 60,
      opportunityCostRate: 0,
    });
    expect(old.totals.maintenance).toBeGreaterThan(young.totals.maintenance);
  });

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
    // Lease portion (months 1..36) — flat. Per-month increment ≈ base/12.
    const mid1 = r.series[18].maintenance - r.series[6].maintenance;
    const mid2 = r.series[30].maintenance - r.series[18].maintenance;
    expect(mid1).toBeCloseTo(mid2, 1); // flat slope during lease
    // Owned tail (months 37..72) climbs above the flat base.
    const ownedYr1 = r.series[48].maintenance - r.series[36].maintenance;
    const ownedYr3 = r.series[72].maintenance - r.series[60].maintenance;
    expect(ownedYr3).toBeGreaterThan(ownedYr1);
  });
});

describe('tcoBreakdown — solar / home charger', () => {
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
    homeChargerInstalled: false,
    solar: false,
    opportunityCostRate: 0,
  };

  it('charger off: no install cost added to maintenance', () => {
    const r = tcoBreakdown(usEv);
    expect(r.series[0].maintenance).toBe(0);
  });

  it('charger on: install cost lands at month 0 (US default $1500)', () => {
    const r = tcoBreakdown({ ...usEv, homeChargerInstalled: true });
    expect(r.series[0].maintenance).toBeCloseTo(1500, 4);
    // And the step persists through the cumulative chain.
    expect(r.series[1].maintenance).toBeGreaterThan(1500);
  });

  it('charger on EU: install cost is €1200', () => {
    const r = tcoBreakdown({
      ...usEv,
      locale: 'EU',
      fuelEfficiency: 17,
      fuelPrice: 0.32,
      homeChargerInstalled: true,
    });
    expect(r.series[0].maintenance).toBeCloseTo(1200, 4);
  });

  it('charger on + solar: fuel cost drops to 15% of grid', () => {
    const grid = tcoBreakdown({ ...usEv, homeChargerInstalled: true, solar: false });
    const solar = tcoBreakdown({ ...usEv, homeChargerInstalled: true, solar: true });
    expect(solar.totals.fuel).toBeCloseTo(grid.totals.fuel * 0.15, 2);
  });

  it('solar without charger has no effect (gating)', () => {
    const off = tcoBreakdown({ ...usEv, homeChargerInstalled: false, solar: false });
    const solar = tcoBreakdown({ ...usEv, homeChargerInstalled: false, solar: true });
    expect(solar.totals.fuel).toBeCloseTo(off.totals.fuel, 2);
  });

  it('install cost only applies for EV (ignored for ICE)', () => {
    const r = tcoBreakdown({
      ...usEv,
      powertrain: 'ICE',
      homeChargerInstalled: true,
    });
    expect(r.series[0].maintenance).toBe(0);
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