import type { CostBreakdown, LeaseEndChoice } from '../scenario.types';
import { leasePayment } from './financing';
import { opportunityCostStream } from './opportunity';
import {
  TcoBaseInputs,
  allocateSeries,
  buildOwnedMonthsSeries,
  fuelTotalForMonths,
  homeChargerInstallCost,
  summarize,
} from './tco-shared';

export interface LeaseTcoInputs extends TcoBaseInputs {
  tab: 'lease';
  apr: number;
  leaseTermMonths: number;
  leaseEndChoice: LeaseEndChoice;
  dispositionFee: number;
  mileageOverageRate: number;
  excessWearEstimate: number;
  buyoutFee: number;
  earlyTerminationFee: number;
  opportunityCostRate: number;
  /** Residual at end of LEASE TERM (used as buyout price). Distinct from
   * `residualValue` (end-of-keep) which still drives asset display + the
   * owned-tail depreciation when keep > term. */
  leaseEndResidual: number;
}

/**
 * Lease TCO accumulator. Two branches selected by `leaseEndChoice`:
 *
 * - `'buyOut'`: lease for `leaseTermMonths`, then pay `leaseEndResidual +
 *   buyoutFee` and own the car for the remainder of `keepDurationYears`.
 *   The owned tail accrues depreciation from `leaseEndResidual` down to
 *   `residualValue`.
 * - `'handBack'`: rolling lease — at every term boundary, sign a fresh
 *   comparable lease (same payment, fresh down + handback fee). Each cycle
 *   restarts the car's age at zero.
 *
 * The `earlyTerminationFee` fires only when `keep < term` (a single partial
 * cycle = the user signed a longer lease than they're keeping). Multi-cycle
 * final partial cycles model "shorter last lease" and don't trigger it.
 *
 * Returns the standard `CostBreakdown` with cumulative monthly series across
 * all categories plus a `cashOut` line tracking real outflows (distinct from
 * `opportunityCost`, which is return foregone on capital tied up).
 */
export function leaseTco(input: LeaseTcoInputs): CostBreakdown {
  const totalMonths = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const term = Math.max(input.leaseTermMonths, 1);
  const lease = leasePayment({
    capCost: input.purchasePrice,
    downPayment: input.downPayment,
    residualValue: input.residualValue,
    apr: input.apr,
    termMonths: term,
    locale: input.locale,
  });
  const buyOut = input.leaseEndChoice === 'buyOut';

  const fuelTotal = fuelTotalForMonths(input, totalMonths);
  const monthlyFuel = totalMonths > 0 ? fuelTotal / totalMonths : 0;
  const monthlyInsurance = input.insuranceAnnual / 12;

  const series = allocateSeries(totalMonths);
  const chargerInstall = homeChargerInstallCost(input);
  series[0].maintenance = chargerInstall;
  series[0].cashOut = chargerInstall;
  const monthlyLeaseFee = lease.depreciationFee + lease.financeFee;

  if (buyOut) {
    const leasePeriod = Math.min(term, totalMonths);
    const ownedMonths = totalMonths - leasePeriod;
    const earlyExitPenalty = totalMonths < term ? input.earlyTerminationFee : 0;
    // The user pays this amount in cash at buyout (real outflow).
    const buyoutCashOut = input.leaseEndResidual + input.buyoutFee + earlyExitPenalty;
    // The chart's leaseEnd line shows only the *net* cost above asset value
    // received: buyoutFee + earlyExit. The leaseEndResidual portion is paid
    // for the asset itself, which the user keeps — owned-tail depreciation
    // (separately tracked in `depreciationOrLease`) covers any subsequent
    // value loss. This mirrors how cash mode nets `price - residual` into
    // depreciation rather than charging the residual portion twice.
    const chartLeaseEnd = input.buyoutFee + earlyExitPenalty;

    // 1. Opportunity-cost injections.
    // Every cash outflow that's part of the lease decision (down + each
    // monthly lease payment + buyout payment at end of term) stops earning
    // returns from outflow time onward. Each injection compounds
    // independently from its own time to end-of-keep.
    const oppInjections: { month: number; amount: number }[] = [];
    if (input.downPayment > 0) oppInjections.push({ month: 0, amount: input.downPayment });
    for (let m = 1; m <= leasePeriod; m++) {
      oppInjections.push({ month: m, amount: monthlyLeaseFee });
    }
    if (buyoutCashOut > 0 && leasePeriod >= 1) {
      oppInjections.push({ month: leasePeriod, amount: buyoutCashOut });
    }
    const opportunity = opportunityCostStream(
      oppInjections,
      input.opportunityCostRate,
      totalMonths,
    );

    // 2. Build the running-cost increment streams (lease + owned-tail).
    // Lease portion: half the aging penalty. Lessor handles powertrain repairs
    // under warranty, but consumables (tires, brakes, fluids, alignment) still
    // age with the car — so maintenance grows over time, just slower than for
    // an owner who's responsible for everything.
    const leaseInc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: leasePeriod,
      monthlyFuel,
      monthlyInsurance,
      maintenance: input.maintenance,
      // Lessor handles powertrain repairs under warranty, but consumables
      // (tires, brakes, fluids, alignment) still age — half the gain above
      // year-0, year-0 itself unchanged.
      maintenanceAgingScale: 0.5,
    });
    const ownedInc = buildOwnedMonthsSeries({
      // The car aged through the lease term — owned tail starts at that age,
      // not zero. A 3-year-old buyout car has more wear than a brand-new one.
      startAgeYears: input.vehicleAge + leasePeriod / 12,
      durationMonths: ownedMonths,
      monthlyFuel,
      monthlyInsurance,
      maintenance: input.maintenance,
    });

    for (let m = 1; m <= totalMonths; m++) {
      const prev = series[m - 1];
      const inLease = m <= leasePeriod;
      const inc = inLease ? leaseInc : ownedInc;
      const j = inLease ? m - 1 : m - 1 - leasePeriod;
      series[m].fuel = prev.fuel + inc.fuel[j];
      series[m].insurance = prev.insurance + inc.insurance[j];
      series[m].maintenance = prev.maintenance + inc.maintenance[j];
    }

    for (let m = 1; m <= leasePeriod; m++) {
      const prev = series[m - 1];
      series[m].depreciationOrLease =
        prev.depreciationOrLease + lease.depreciationFee + input.downPayment / leasePeriod;
      series[m].interestAndFees = prev.interestAndFees + lease.financeFee;
      series[m].opportunityCost = opportunity[m];
    }

    if (leasePeriod <= totalMonths) {
      for (let m = leasePeriod; m <= totalMonths; m++) {
        series[m].leaseEnd = chartLeaseEnd;
      }
    }

    if (ownedMonths > 0) {
      // Owned-tail depreciation: from leaseEndResidual (the price paid at
      // buyout) down to residualValue (the end-of-keep value). Replaces the
      // old magic 60%-retention rule with a model-driven figure.
      const ownedDepreciation = Math.max(input.leaseEndResidual - input.residualValue, 0);
      const perMonth = ownedDepreciation / ownedMonths;
      for (let m = leasePeriod + 1; m <= totalMonths; m++) {
        const prev = series[m - 1];
        series[m].depreciationOrLease = prev.depreciationOrLease + perMonth;
        // Owned tail: no real interest/fees, just opportunity cost on the
        // down payment that's still tied up.
        series[m].interestAndFees = prev.interestAndFees;
        series[m].opportunityCost = opportunity[m];
      }
    }

    // 3. Cash-out forward sweep — real outflows only (down + monthlies +
    // buyout + running costs). Distinct from opportunity cost above.
    for (let m = 1; m <= totalMonths; m++) {
      const prev = series[m - 1];
      const inLease = m <= leasePeriod;
      const inc = inLease ? leaseInc : ownedInc;
      const j = inLease ? m - 1 : m - 1 - leasePeriod;
      const downThisMonth = m === 1 ? input.downPayment : 0;
      const monthlyThisMonth = inLease ? monthlyLeaseFee : 0;
      const buyoutThisMonth = m === leasePeriod ? buyoutCashOut : 0;
      series[m].cashOut =
        prev.cashOut +
        downThisMonth +
        monthlyThisMonth +
        buyoutThisMonth +
        inc.fuel[j] +
        inc.insurance[j] +
        inc.maintenance[j];
    }
    return summarize(series);
  }

  // Renew lease: rolling cycles, each a new car (age resets to 0).
  const handbackFee = input.dispositionFee + input.excessWearEstimate;
  let cumLeaseEnd = 0;

  // 1. Opportunity-cost injections.
  // Every outflow loses returns from outflow time onward — down at each
  // cycle start, every monthly lease fee, and cycle-end fees (handback /
  // early exit). Each compounds independently.
  const oppInjections: { month: number; amount: number }[] = [];
  for (let cs = 1; cs <= totalMonths; cs += term) {
    const ce = Math.min(cs + term - 1, totalMonths);
    const cl = ce - cs + 1;
    if (input.downPayment > 0) oppInjections.push({ month: cs - 1, amount: input.downPayment });
    for (let i = 0; i < cl; i++) {
      oppInjections.push({ month: cs + i, amount: monthlyLeaseFee });
    }
    const onCycleBoundary = cl === term;
    const finalPartial = ce === totalMonths && totalMonths % term !== 0;
    if (onCycleBoundary || finalPartial) {
      oppInjections.push({ month: ce, amount: handbackFee });
    }
    if (finalPartial && totalMonths < term) {
      oppInjections.push({ month: ce, amount: input.earlyTerminationFee });
    }
  }
  const opportunity = opportunityCostStream(
    oppInjections,
    input.opportunityCostRate,
    totalMonths,
  );

  // 2. Cycle sweep — accumulate breakdown layers + cash-out per cycle.
  let cycleStart = 1;
  while (cycleStart <= totalMonths) {
    const cycleEnd = Math.min(cycleStart + term - 1, totalMonths);
    const cycleLen = cycleEnd - cycleStart + 1;
    const inc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: cycleLen,
      monthlyFuel,
      monthlyInsurance,
      maintenance: input.maintenance,
    });
    const downContrib = input.downPayment / cycleLen;

    for (let i = 0; i < cycleLen; i++) {
      const m = cycleStart + i;
      const prev = series[m - 1];
      series[m].fuel = prev.fuel + inc.fuel[i];
      series[m].insurance = prev.insurance + inc.insurance[i];
      series[m].maintenance = prev.maintenance + inc.maintenance[i];
      series[m].depreciationOrLease =
        prev.depreciationOrLease + lease.depreciationFee + downContrib;
      series[m].interestAndFees = prev.interestAndFees + lease.financeFee;
      series[m].opportunityCost = opportunity[m];

      const onCycleBoundary = m === cycleEnd && cycleLen === term;
      const finalPartial = m === totalMonths && totalMonths % term !== 0;
      const isHandbackTrigger = onCycleBoundary || finalPartial;
      if (isHandbackTrigger) cumLeaseEnd += handbackFee;
      // Early termination fires only for a single partial cycle (keep < term).
      // Partial FINAL cycles when keep > term model "shorter last lease" — no penalty.
      if (finalPartial && totalMonths < term) {
        cumLeaseEnd += input.earlyTerminationFee;
      }
      series[m].leaseEnd = cumLeaseEnd;

      // 3. Cash flow this month: down at cycle start, monthly lease fee every
      // month, handback at cycle end (full or final-partial), early-exit on
      // the keep < term partial. Running costs accrue per month.
      const downThisMonth = i === 0 ? input.downPayment : 0;
      let endFeeThisMonth = 0;
      if (isHandbackTrigger) endFeeThisMonth += handbackFee;
      if (finalPartial && totalMonths < term) endFeeThisMonth += input.earlyTerminationFee;
      series[m].cashOut =
        prev.cashOut +
        downThisMonth +
        monthlyLeaseFee +
        endFeeThisMonth +
        inc.fuel[i] +
        inc.insurance[i] +
        inc.maintenance[i];
    }
    cycleStart += term;
  }
  return summarize(series);
}
