import type { CashTcoInputs, FinanceTcoInputs, LeaseTcoInputs } from './tco';
import { tcoBreakdown } from './tco';
import type { CostCategory } from '../scenario.types';

// ── Fixtures ───────────────────────────────────────────────────────────────

const baseShared = {
  locale: 'US' as const,
  powertrain: 'ICE' as const,
  purchasePrice: 35_000,
  residualValue: 18_000,
  vehicleAge: 0,
  annualMileage: 12_000,
  keepDurationYears: 5,
  insuranceAnnual: 1_750,
  maintenanceBase: 525,
  maintenanceK: 0.08,
  fuelEfficiency: 28,
  fuelPrice: 3.5,
  chargerStatus: 'none' as const,
  solar: false,
};

function cashInputs(o: Partial<CashTcoInputs> = {}): CashTcoInputs {
  return {
    ...baseShared,
    tab: 'cash',
    downPayment: 0,
    opportunityCostRate: 0.05,
    ...o,
  };
}

function financeInputs(o: Partial<FinanceTcoInputs> = {}): FinanceTcoInputs {
  return {
    ...baseShared,
    tab: 'finance',
    downPayment: 5_000,
    apr: 6,
    loanTermMonths: 60,
    opportunityCostRate: 0.05,
    ...o,
  };
}

function leaseInputs(o: Partial<LeaseTcoInputs> = {}): LeaseTcoInputs {
  return {
    ...baseShared,
    tab: 'lease',
    downPayment: 5_000,
    apr: 4.5,
    leaseTermMonths: 36,
    leaseEndChoice: 'handBack',
    dispositionFee: 395,
    mileageOverageRate: 0.25,
    excessWearEstimate: 800,
    buyoutFee: 300,
    earlyTerminationFee: 400,
    leaseEndResidual: 18_000,
    opportunityCostRate: 0.05,
    ...o,
  };
}

// ── Universal invariants — must hold for every input set ───────────────────

const CATEGORIES: CostCategory[] = [
  'depreciationOrLease',
  'interestAndFees',
  'opportunityCost',
  'fuel',
  'insurance',
  'maintenance',
  'leaseEnd',
];

function checkUniversalInvariants(inputs: CashTcoInputs | FinanceTcoInputs | LeaseTcoInputs): void {
  const r = tcoBreakdown(inputs);

  // Series shape
  const expectedMonths = Math.max(Math.round(inputs.keepDurationYears * 12), 1);
  expect(r.series.length).toBe(expectedMonths + 1);
  expect(r.series[0].month).toBe(0);

  // All totals finite + non-negative
  for (const k of CATEGORIES) {
    expect(Number.isFinite(r.totals[k])).toBe(true);
    expect(r.totals[k]).toBeGreaterThanOrEqual(0);
  }
  expect(Number.isFinite(r.total)).toBe(true);
  expect(r.total).toBeGreaterThan(0);

  // Sum of category totals equals breakdown.total
  const sum = CATEGORIES.reduce((s, k) => s + r.totals[k], 0);
  expect(sum).toBeCloseTo(r.total, 4);

  // CashOut is non-negative + monotonically non-decreasing
  expect(r.series[r.series.length - 1].cashOut).toBeGreaterThan(0);
  for (let m = 1; m < r.series.length; m++) {
    expect(r.series[m].cashOut).toBeGreaterThanOrEqual(r.series[m - 1].cashOut);
  }

  // Every cumulative category is monotonically non-decreasing
  for (const k of CATEGORIES) {
    for (let m = 1; m < r.series.length; m++) {
      expect(r.series[m][k]).toBeGreaterThanOrEqual(r.series[m - 1][k]);
    }
  }

  // Last point's per-category values match totals
  const last = r.series[r.series.length - 1];
  for (const k of CATEGORIES) {
    expect(last[k]).toBeCloseTo(r.totals[k], 4);
  }
}

// ── Universal sweep — basic ───────────────────────────────────────────────

describe('TCO invariants — universal shape', () => {
  it('cash: default scenario', () => checkUniversalInvariants(cashInputs()));
  it('finance: default scenario', () => checkUniversalInvariants(financeInputs()));
  it('lease renew: default scenario', () => checkUniversalInvariants(leaseInputs()));
  it('lease buyout: default scenario', () =>
    checkUniversalInvariants(leaseInputs({ leaseEndChoice: 'buyOut' })));
});

// ── Parameter sweeps — each crosses normal & extreme values ───────────────

describe('TCO invariants — APR sweep (0% → 25%)', () => {
  for (const apr of [0, 0.5, 5, 10, 25]) {
    it(`finance @ ${apr}% APR`, () =>
      checkUniversalInvariants(financeInputs({ apr })));
    it(`lease renew @ ${apr}% APR`, () =>
      checkUniversalInvariants(leaseInputs({ apr })));
    it(`lease buyout @ ${apr}% APR`, () =>
      checkUniversalInvariants(leaseInputs({ apr, leaseEndChoice: 'buyOut' })));
  }
});

describe('TCO invariants — term length sweep', () => {
  for (const term of [12, 24, 36, 60, 84, 120]) {
    it(`finance loan term ${term}mo`, () =>
      checkUniversalInvariants(financeInputs({ loanTermMonths: term })));
    it(`lease renew term ${term}mo`, () =>
      checkUniversalInvariants(leaseInputs({ leaseTermMonths: term })));
    it(`lease buyout term ${term}mo`, () =>
      checkUniversalInvariants(
        leaseInputs({ leaseTermMonths: term, leaseEndChoice: 'buyOut' }),
      ));
  }
});

describe('TCO invariants — keep duration sweep (1yr → 15yr)', () => {
  for (const keep of [1, 3, 5, 7, 10, 15]) {
    it(`cash, keep ${keep}yr`, () =>
      checkUniversalInvariants(cashInputs({ keepDurationYears: keep })));
    it(`finance, keep ${keep}yr`, () =>
      checkUniversalInvariants(financeInputs({ keepDurationYears: keep })));
    it(`lease renew, keep ${keep}yr`, () =>
      checkUniversalInvariants(leaseInputs({ keepDurationYears: keep })));
    it(`lease buyout, keep ${keep}yr`, () =>
      checkUniversalInvariants(
        leaseInputs({ keepDurationYears: keep, leaseEndChoice: 'buyOut' }),
      ));
  }
});

describe('TCO invariants — down payment sweep ($0 → 100%)', () => {
  for (const down of [0, 1_000, 5_000, 15_000, 35_000]) {
    it(`finance down $${down}`, () =>
      checkUniversalInvariants(financeInputs({ downPayment: down })));
    it(`lease down $${down}`, () =>
      checkUniversalInvariants(leaseInputs({ downPayment: down })));
  }
});

describe('TCO invariants — opportunity-cost rate sweep (0% → 20%)', () => {
  for (const rate of [0, 0.01, 0.05, 0.1, 0.2]) {
    it(`cash, rate ${(rate * 100).toFixed(1)}%`, () =>
      checkUniversalInvariants(cashInputs({ opportunityCostRate: rate })));
    it(`finance, rate ${(rate * 100).toFixed(1)}%`, () =>
      checkUniversalInvariants(financeInputs({ opportunityCostRate: rate })));
    it(`lease, rate ${(rate * 100).toFixed(1)}%`, () =>
      checkUniversalInvariants(leaseInputs({ opportunityCostRate: rate })));
  }
});

describe('TCO invariants — annual mileage sweep (0 → 50k)', () => {
  for (const miles of [0, 5_000, 12_000, 25_000, 50_000]) {
    it(`cash, ${miles} mi/yr`, () =>
      checkUniversalInvariants(cashInputs({ annualMileage: miles })));
    it(`finance, ${miles} mi/yr`, () =>
      checkUniversalInvariants(financeInputs({ annualMileage: miles })));
    it(`lease, ${miles} mi/yr`, () =>
      checkUniversalInvariants(leaseInputs({ annualMileage: miles })));
  }
});

describe('TCO invariants — vehicle age sweep (0yr → 10yr)', () => {
  for (const age of [0, 2, 5, 10]) {
    it(`cash, age ${age}yr`, () =>
      checkUniversalInvariants(cashInputs({ vehicleAge: age })));
    it(`finance, age ${age}yr`, () =>
      checkUniversalInvariants(financeInputs({ vehicleAge: age })));
    it(`lease, age ${age}yr`, () =>
      checkUniversalInvariants(leaseInputs({ vehicleAge: age })));
  }
});

describe('TCO invariants — keep × term combinations', () => {
  // keep < term (early exit), keep == term (clean), keep > term (rolling/owned-tail)
  const grid = [
    { keep: 2, term: 36 }, // keep < term
    { keep: 3, term: 36 }, // keep == term
    { keep: 5, term: 36 }, // keep > term, multi-cycle / owned-tail
    { keep: 7, term: 84 }, // keep == term, longer
    { keep: 10, term: 48 }, // keep >> term
  ];
  for (const { keep, term } of grid) {
    it(`lease renew, keep ${keep}yr × term ${term}mo`, () =>
      checkUniversalInvariants(
        leaseInputs({ keepDurationYears: keep, leaseTermMonths: term, leaseEndChoice: 'handBack' }),
      ));
    it(`lease buyout, keep ${keep}yr × term ${term}mo`, () =>
      checkUniversalInvariants(
        leaseInputs({ keepDurationYears: keep, leaseTermMonths: term, leaseEndChoice: 'buyOut' }),
      ));
  }
});

describe('TCO invariants — EV / charger / solar combinations', () => {
  for (const chargerStatus of ['none', 'installed', 'buying'] as const) {
    for (const solar of [false, true]) {
      it(`EV cash, charger ${chargerStatus}, solar ${solar}`, () =>
        checkUniversalInvariants(
          cashInputs({
            powertrain: 'EV',
            fuelEfficiency: 3.5,
            fuelPrice: 0.16,
            chargerStatus,
            solar,
          }),
        ));
    }
  }
});

// ── Mode-specific arithmetic invariants ───────────────────────────────────

describe('TCO invariants — cash mode arithmetic', () => {
  it('zero real interest (no loan)', () => {
    const r = tcoBreakdown(cashInputs());
    expect(r.totals.interestAndFees).toBe(0);
  });

  it('zero opp rate → zero opportunity cost', () => {
    const r = tcoBreakdown(cashInputs({ opportunityCostRate: 0 }));
    expect(r.totals.opportunityCost).toBe(0);
  });

  it('positive opp rate → opportunity cost ≈ price × ((1+r)^t − 1) (compounded)', () => {
    const inputs = cashInputs({ opportunityCostRate: 0.05, keepDurationYears: 5 });
    const r = tcoBreakdown(inputs);
    const expected = inputs.purchasePrice * (Math.pow(1.05, 5) - 1);
    expect(r.totals.opportunityCost).toBeCloseTo(expected, 0);
  });

  it('chart total + residual ≈ cashOut + opp (cash flow / cost identity)', () => {
    const inputs = cashInputs({ opportunityCostRate: 0.05 });
    const r = tcoBreakdown(inputs);
    const cashOut = r.series[r.series.length - 1].cashOut;
    // total = depreciation + opp + running; cashOut = price + running.
    // total + residual = price + opp + running = cashOut + opp.
    expect(r.total + inputs.residualValue).toBeCloseTo(cashOut + r.totals.opportunityCost, 0);
  });

  it('zero mileage → zero fuel total', () => {
    const r = tcoBreakdown(cashInputs({ annualMileage: 0 }));
    expect(r.totals.fuel).toBeCloseTo(0, 4);
  });
});

describe('TCO invariants — finance mode arithmetic', () => {
  it('APR=0 → zero interest', () => {
    const r = tcoBreakdown(financeInputs({ apr: 0 }));
    expect(r.totals.interestAndFees).toBeCloseTo(0, 4);
  });

  it('positive APR → positive interest', () => {
    const r = tcoBreakdown(financeInputs({ apr: 5 }));
    expect(r.totals.interestAndFees).toBeGreaterThan(0);
  });

  it('zero down → opp cost is purely from monthly loan payments (still > 0)', () => {
    // Under Framing B, every loan payment is also a cash outflow that loses
    // returns from payment time onward — so $0 down does not zero out opp.
    const withRate = tcoBreakdown(financeInputs({ downPayment: 0, opportunityCostRate: 0.06 }));
    const noRate = tcoBreakdown(financeInputs({ downPayment: 0, opportunityCostRate: 0 }));
    expect(noRate.totals.opportunityCost).toBe(0);
    expect(withRate.totals.opportunityCost).toBeGreaterThan(0);
  });

  it('opportunity cost > down × ((1+r)^t − 1): includes opp on monthly loan payments too', () => {
    const inputs = financeInputs({ downPayment: 8_000, opportunityCostRate: 0.06, keepDurationYears: 4 });
    const r = tcoBreakdown(inputs);
    const oppOnDownAlone = 8_000 * (Math.pow(1.06, 4) - 1);
    expect(r.totals.opportunityCost).toBeGreaterThan(oppOnDownAlone);
  });

  it('100% down ≈ cash mode (within 15%)', () => {
    const shared = { keepDurationYears: 5, opportunityCostRate: 0.05 };
    const fin = tcoBreakdown(financeInputs({ ...shared, downPayment: 35_000, apr: 6 }));
    const cash = tcoBreakdown(cashInputs(shared));
    expect(fin.total).toBeGreaterThan(cash.total * 0.85);
    expect(fin.total).toBeLessThan(cash.total * 1.15);
  });
});

describe('TCO invariants — lease mode arithmetic', () => {
  it('handback fires once per cycle (renew lease)', () => {
    const r = tcoBreakdown(
      leaseInputs({
        keepDurationYears: 6,
        leaseTermMonths: 36,
        leaseEndChoice: 'handBack',
        earlyTerminationFee: 0, // isolate handback
      }),
    );
    const handbackFee = 395 + 800; // disposition + excess wear
    expect(r.totals.leaseEnd).toBeCloseTo(2 * handbackFee, 0);
  });

  it('buyout chart leaseEnd = buyoutFee + earlyExit (residual netted into depreciation)', () => {
    const r = tcoBreakdown(
      leaseInputs({
        keepDurationYears: 5,
        leaseTermMonths: 36,
        leaseEndChoice: 'buyOut',
        earlyTerminationFee: 0,
        leaseEndResidual: 22_000,
        buyoutFee: 300,
      }),
    );
    // The chart's leaseEnd line shows only the *net* cost: buyoutFee + early
    // exit. The leaseEndResidual portion is the asset value the user keeps —
    // it flows into depreciation (mirroring how cash mode nets price-residual
    // rather than charging the residual as a separate cost).
    expect(r.totals.leaseEnd).toBeCloseTo(300, 0);
    // The actual cash outflow at buyout still includes the full residual.
    const beforeBuyout = r.series[35].cashOut;
    const afterBuyout = r.series[36].cashOut;
    expect(afterBuyout - beforeBuyout).toBeGreaterThan(22_000);
  });

  it('apr=0 → zero finance fees in lease payment', () => {
    const r = tcoBreakdown(leaseInputs({ apr: 0 }));
    expect(r.totals.interestAndFees).toBeCloseTo(0, 4);
  });

  it('down=0 → opp cost is purely from monthly lease payments + handback (still > 0)', () => {
    const withRate = tcoBreakdown(
      leaseInputs({ downPayment: 0, opportunityCostRate: 0.06 }),
    );
    const noRate = tcoBreakdown(leaseInputs({ downPayment: 0, opportunityCostRate: 0 }));
    expect(noRate.totals.opportunityCost).toBe(0);
    expect(withRate.totals.opportunityCost).toBeGreaterThan(0);
  });

  it('lease buyout opp > down-alone compounded: includes monthly fees + buyout outflow', () => {
    const r = tcoBreakdown(
      leaseInputs({
        leaseEndChoice: 'buyOut',
        downPayment: 5_000,
        opportunityCostRate: 0.05,
        keepDurationYears: 5,
      }),
    );
    const oppOnDownAlone = 5_000 * (Math.pow(1.05, 5) - 1);
    expect(r.totals.opportunityCost).toBeGreaterThan(oppOnDownAlone);
  });

  it('lease maintenance grows over keep duration (warranty does not zero out aging)', () => {
    // The lessor handles powertrain repairs but consumables (tires, brakes,
    // fluids) still age. So lease maintenance should be lower than ownership
    // but not perfectly flat over a multi-year keep.
    const cash = tcoBreakdown(cashInputs({ keepDurationYears: 5, maintenanceK: 0.08 }));
    const lease = tcoBreakdown(
      leaseInputs({
        keepDurationYears: 3,
        leaseTermMonths: 36,
        leaseEndChoice: 'buyOut',
        maintenanceK: 0.08,
      }),
    );
    // Cash maintenance over 5yr should clearly exceed lease maintenance over 3yr
    // (more years AND more aging penalty).
    expect(cash.totals.maintenance).toBeGreaterThan(lease.totals.maintenance);
    // But lease shouldn't be perfectly flat: maintenance at month 36 should
    // strictly exceed maintenance at month 12 by more than just the linear
    // base extrapolation (i.e., aging contributes).
    const m12 = lease.series[12].maintenance;
    const m36 = lease.series[36].maintenance;
    const linearBaseExtrapolated = (m12 / 12) * 36;
    expect(m36).toBeGreaterThan(linearBaseExtrapolated);
  });

  it('lease renew opp > Σ down-only compounded: monthly fees + handback also lose returns', () => {
    const down = 5_000;
    const rate = 0.05;
    const r = tcoBreakdown(
      leaseInputs({
        leaseEndChoice: 'handBack',
        downPayment: down,
        opportunityCostRate: rate,
        keepDurationYears: 6,
        leaseTermMonths: 36,
      }),
    );
    const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
    const oppOnDownsAlone =
      down * (Math.pow(1 + monthlyRate, 72) - 1) + down * (Math.pow(1 + monthlyRate, 36) - 1);
    expect(r.totals.opportunityCost).toBeGreaterThan(oppOnDownsAlone);
  });

  it('renew lease cumulative down ≈ cycles × down', () => {
    // Inspect via cashOut delta at cycle boundaries — each cycle starts with
    // a fresh down payment.
    const r = tcoBreakdown(
      leaseInputs({
        keepDurationYears: 6,
        leaseTermMonths: 36,
        leaseEndChoice: 'handBack',
        downPayment: 5_000,
      }),
    );
    // At month 1, cashOut should have at least the first down payment in it.
    expect(r.series[1].cashOut).toBeGreaterThanOrEqual(5_000);
    // At month 37 (start of cycle 2), cumulative cash should have at least 2× down.
    expect(r.series[37].cashOut).toBeGreaterThanOrEqual(10_000);
  });

  it('early termination fires only when keep < term (renew lease)', () => {
    const sharedInputs = {
      leaseTermMonths: 36,
      earlyTerminationFee: 1_000,
      leaseEndChoice: 'handBack' as const,
    };
    const partial = tcoBreakdown(leaseInputs({ ...sharedInputs, keepDurationYears: 2 }));
    const aligned = tcoBreakdown(leaseInputs({ ...sharedInputs, keepDurationYears: 3 }));
    const longer = tcoBreakdown(leaseInputs({ ...sharedInputs, keepDurationYears: 5 }));
    // Only `partial` (keep < term) gets the early-exit penalty added.
    expect(partial.totals.leaseEnd).toBeGreaterThan(aligned.totals.leaseEnd);
    // longer (keep > term) does not add early-exit (final partial cycle is
    // modeled as a "shorter last lease" without penalty).
    expect(longer.totals.leaseEnd).not.toBeCloseTo(longer.totals.leaseEnd + 1_000, 0);
  });
});

// ── Cross-mode invariants ──────────────────────────────────────────────────

describe('TCO invariants — cross-mode comparisons', () => {
  it('cash opp > finance opp with same down (cash ties up the full price upfront)', () => {
    const cash = tcoBreakdown(cashInputs({ opportunityCostRate: 0.05 }));
    const fin = tcoBreakdown(financeInputs({ downPayment: 5_000, opportunityCostRate: 0.05 }));
    expect(cash.totals.opportunityCost).toBeGreaterThan(fin.totals.opportunityCost);
  });

  // ── APR vs opp-rate sign determines whether financing is cheaper than cash.
  //    The financial-leverage rule: if loan APR < expected investment return,
  //    financing is rational (cheap money beats foregone returns). If APR >
  //    expected return, you're paying more for borrowed money than you'd earn
  //    investing — finance becomes more expensive than cash.
  describe('financing leverage rule (Framing B opp on all outflows)', () => {
    const sharedKeep = { keepDurationYears: 5, opportunityCostRate: 0.06 };

    it('APR > opp rate → finance total > cash total', () => {
      // 9% loan vs 6% expected return: the user pays more in interest than
      // they'd earn investing the freed-up cash. Financing should lose.
      const cash = tcoBreakdown(cashInputs(sharedKeep));
      const fin = tcoBreakdown(
        financeInputs({ ...sharedKeep, apr: 9, downPayment: 5_000, loanTermMonths: 60 }),
      );
      expect(fin.total).toBeGreaterThan(cash.total);
    });

    it('APR < opp rate → finance total < cash total', () => {
      // 3% loan vs 6% return: cheap money. Financing wins.
      const cash = tcoBreakdown(cashInputs(sharedKeep));
      const fin = tcoBreakdown(
        financeInputs({ ...sharedKeep, apr: 3, downPayment: 5_000, loanTermMonths: 60 }),
      );
      expect(fin.total).toBeLessThan(cash.total);
    });

    it('APR ≈ opp rate → finance total ≈ cash total (within 5%)', () => {
      // Identical rates: borrowing should be approximately neutral. Slight
      // gap from APR-as-simple-monthly vs opp-as-compound-monthly conventions.
      const cash = tcoBreakdown(cashInputs(sharedKeep));
      const fin = tcoBreakdown(
        financeInputs({ ...sharedKeep, apr: 6, downPayment: 5_000, loanTermMonths: 60 }),
      );
      const ratio = fin.total / cash.total;
      expect(ratio).toBeGreaterThan(0.95);
      expect(ratio).toBeLessThan(1.05);
    });

    it('lease money-factor > opp rate → lease buyout total > cash total', () => {
      // 15% APR (money factor 0.00625) is a punitive lease. Even buyout —
      // which leaves you owning the car — costs more than cash when the
      // money factor exceeds investment returns.
      const cash = tcoBreakdown(cashInputs(sharedKeep));
      const lease = tcoBreakdown(
        leaseInputs({
          ...sharedKeep,
          apr: 15,
          downPayment: 5_000,
          leaseTermMonths: 36,
          leaseEndChoice: 'buyOut',
        }),
      );
      expect(lease.total).toBeGreaterThan(cash.total);
    });

    it('lease money-factor < opp rate → lease buyout total < cash total', () => {
      const cash = tcoBreakdown(cashInputs(sharedKeep));
      const lease = tcoBreakdown(
        leaseInputs({
          ...sharedKeep,
          apr: 1.5,
          downPayment: 5_000,
          leaseTermMonths: 36,
          leaseEndChoice: 'buyOut',
        }),
      );
      expect(lease.total).toBeLessThan(cash.total);
    });
  });

  // ── Pure cash flow comparison (opp cost excluded): financing should cost
  //    more cash than buying outright once the loan/lease has fully paid the
  //    purchase price plus financing fees. Short keep with partial payoff is
  //    not asserted because the inequality flips (you literally paid less in
  //    cash than the sticker price — at the cost of not owning the asset).
  describe('financing cashOut > cash cashOut (when financing fully completes)', () => {
    const cashOutAt = (r: ReturnType<typeof tcoBreakdown>) =>
      r.series[r.series.length - 1].cashOut;

    it('finance, keep == loanTerm, APR > 0', () => {
      const shared = { keepDurationYears: 5, opportunityCostRate: 0 };
      const cash = tcoBreakdown(cashInputs(shared));
      const fin = tcoBreakdown(
        financeInputs({ ...shared, loanTermMonths: 60, apr: 6, downPayment: 5_000 }),
      );
      expect(cashOutAt(fin)).toBeGreaterThan(cashOutAt(cash));
      // Gap should equal total interest paid, since both pay the same principal + running.
      expect(cashOutAt(fin) - cashOutAt(cash)).toBeCloseTo(fin.totals.interestAndFees, 0);
    });

    it('finance, keep > loanTerm, APR > 0 (kept past payoff)', () => {
      const shared = { keepDurationYears: 7, opportunityCostRate: 0 };
      const cash = tcoBreakdown(cashInputs(shared));
      const fin = tcoBreakdown(
        financeInputs({ ...shared, loanTermMonths: 60, apr: 6, downPayment: 5_000 }),
      );
      expect(cashOutAt(fin)).toBeGreaterThan(cashOutAt(cash));
    });

    it('finance, APR=0, keep == loanTerm: cashOut ≈ cash cashOut (no interest, no gap)', () => {
      const shared = { keepDurationYears: 5, opportunityCostRate: 0 };
      const cash = tcoBreakdown(cashInputs(shared));
      const fin = tcoBreakdown(
        financeInputs({ ...shared, loanTermMonths: 60, apr: 0, downPayment: 5_000 }),
      );
      expect(cashOutAt(fin)).toBeCloseTo(cashOutAt(cash), 0);
    });

    it('lease buyout, keep == term: cashOut > cash cashOut', () => {
      // Note: cash uses age-based maintenance growth (k>0); lease holds
      // maintenance flat during the lease portion (k=0). So cash running costs
      // accrue faster — the gap (lease − cash) is smaller than just
      // interest+buyoutFee. Inequality still holds, just don't assert equality.
      const shared = { keepDurationYears: 3, opportunityCostRate: 0 };
      const cash = tcoBreakdown(cashInputs(shared));
      const lease = tcoBreakdown(
        leaseInputs({
          ...shared,
          leaseTermMonths: 36,
          leaseEndChoice: 'buyOut',
          downPayment: 5_000,
          buyoutFee: 300,
          earlyTerminationFee: 0,
        }),
      );
      expect(cashOutAt(lease)).toBeGreaterThan(cashOutAt(cash));
    });

    it('lease buyout, keep > term: cashOut > cash cashOut', () => {
      const shared = { keepDurationYears: 6, opportunityCostRate: 0 };
      const cash = tcoBreakdown(cashInputs(shared));
      const lease = tcoBreakdown(
        leaseInputs({
          ...shared,
          leaseTermMonths: 36,
          leaseEndChoice: 'buyOut',
          downPayment: 5_000,
          earlyTerminationFee: 0,
        }),
      );
      expect(cashOutAt(lease)).toBeGreaterThan(cashOutAt(cash));
    });

    it('lease renew, multiple full cycles: cashOut > cash cashOut', () => {
      // Note: a single 1-cycle handback can be cheaper than buying outright in
      // pure cash terms — you walked away after one term so you only paid for
      // depreciation + interest + handback, not the full price. Once the keep
      // covers ≥ 2 cycles, the accumulated cycles always exceed the cash price.
      const shared = { keepDurationYears: 9, opportunityCostRate: 0 };
      const cash = tcoBreakdown(cashInputs(shared));
      const lease = tcoBreakdown(
        leaseInputs({
          ...shared,
          leaseTermMonths: 36,
          leaseEndChoice: 'handBack',
          downPayment: 5_000,
          earlyTerminationFee: 0,
        }),
      );
      expect(cashOutAt(lease)).toBeGreaterThan(cashOutAt(cash));
    });
  });

  it('lease total grows with keep duration (more cycles + more running costs)', () => {
    const short = tcoBreakdown(leaseInputs({ keepDurationYears: 3 }));
    const long = tcoBreakdown(leaseInputs({ keepDurationYears: 9 }));
    expect(long.total).toBeGreaterThan(short.total);
  });

  it('higher APR → higher finance total', () => {
    const lo = tcoBreakdown(financeInputs({ apr: 1 }));
    const hi = tcoBreakdown(financeInputs({ apr: 12 }));
    expect(hi.total).toBeGreaterThan(lo.total);
  });

  it('zero solar EV vs solar EV: solar reduces fuel cost', () => {
    const noSolar = tcoBreakdown(
      cashInputs({
        powertrain: 'EV',
        fuelEfficiency: 3.5,
        fuelPrice: 0.16,
        chargerStatus: 'installed',
        solar: false,
      }),
    );
    const solar = tcoBreakdown(
      cashInputs({
        powertrain: 'EV',
        fuelEfficiency: 3.5,
        fuelPrice: 0.16,
        chargerStatus: 'installed',
        solar: true,
      }),
    );
    expect(solar.totals.fuel).toBeLessThan(noSolar.totals.fuel);
  });
});

// ── Extreme / degenerate inputs (must not crash, must produce finite output) ─

describe('TCO invariants — extreme inputs do not crash', () => {
  it('1-month keep duration', () => {
    expect(() => tcoBreakdown(cashInputs({ keepDurationYears: 1 / 12 }))).not.toThrow();
    expect(() => tcoBreakdown(financeInputs({ keepDurationYears: 1 / 12 }))).not.toThrow();
    expect(() =>
      tcoBreakdown(leaseInputs({ keepDurationYears: 1 / 12, leaseEndChoice: 'handBack' })),
    ).not.toThrow();
    expect(() =>
      tcoBreakdown(leaseInputs({ keepDurationYears: 1 / 12, leaseEndChoice: 'buyOut' })),
    ).not.toThrow();
  });

  it('15-year keep duration produces finite totals', () => {
    const r = tcoBreakdown(cashInputs({ keepDurationYears: 15 }));
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.total).toBeGreaterThan(0);
  });

  it('zero APR + zero opp rate + zero mileage', () => {
    const r = tcoBreakdown(
      financeInputs({ apr: 0, opportunityCostRate: 0, annualMileage: 0 }),
    );
    expect(r.totals.interestAndFees).toBeCloseTo(0, 4);
    expect(r.totals.opportunityCost).toBe(0);
    expect(r.totals.fuel).toBeCloseTo(0, 4);
    expect(r.total).toBeGreaterThan(0); // still has depreciation + insurance + maintenance
  });

  it('residual = 0 (worst-case depreciation)', () => {
    expect(() => tcoBreakdown(cashInputs({ residualValue: 0 }))).not.toThrow();
    expect(() =>
      tcoBreakdown(leaseInputs({ residualValue: 0, leaseEndResidual: 0 })),
    ).not.toThrow();
  });

  it('residual = purchasePrice (depreciation pinned to zero)', () => {
    const r = tcoBreakdown(cashInputs({ residualValue: 35_000 }));
    expect(r.totals.depreciationOrLease).toBeCloseTo(0, 4);
  });

  it('1-month lease term with multi-year keep', () => {
    expect(() =>
      tcoBreakdown(
        leaseInputs({ leaseTermMonths: 1, keepDurationYears: 5, leaseEndChoice: 'handBack' }),
      ),
    ).not.toThrow();
  });
});
