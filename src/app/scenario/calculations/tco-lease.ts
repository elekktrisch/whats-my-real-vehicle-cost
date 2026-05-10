import type { CostBreakdown, LeaseEndChoice, MonthlyTcoPoint } from '../scenario.types';
import { leasePayment } from './financing';
import { opportunityCostStream } from './opportunity';
import {
  OwnedWindowIncrements,
  TcoBaseInputs,
  allocateSeries,
  buildOwnedMonthsSeries,
  fuelTotalForMonths,
  homeChargerInstallCost,
  summarize,
} from './tco-shared';

// Lessor handles powertrain repairs under warranty, but consumables (tires,
// brakes, fluids, alignment) still age — half the gain above year-0.
const LEASE_WARRANTY_AGING_SCALE = 0.5;

type CashOutflow = { month: number; amount: number };

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

interface LeaseContext {
  totalMonths: number;
  term: number;
  monthlyLeaseFee: number;
  depreciationFee: number;
  financeFee: number;
  monthlyFuel: number;
  monthlyInsurance: number;
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
    region: input.region,
  });
  const fuelTotal = fuelTotalForMonths(input, totalMonths);
  const ctx: LeaseContext = {
    totalMonths,
    term,
    monthlyLeaseFee: lease.depreciationFee + lease.financeFee,
    depreciationFee: lease.depreciationFee,
    financeFee: lease.financeFee,
    monthlyFuel: totalMonths > 0 ? fuelTotal / totalMonths : 0,
    monthlyInsurance: input.insuranceAnnual / 12,
  };

  const series = allocateSeries(totalMonths);
  const chargerInstall = homeChargerInstallCost(input);
  series[0].maintenance = chargerInstall;
  series[0].cashOut = chargerInstall;

  if (input.leaseEndChoice === 'buyOut') {
    fillBuyoutSeries(series, input, ctx);
  } else {
    fillRenewalSeries(series, input, ctx);
  }
  return summarize(series);
}

// ============================================================================
// Buyout branch — lease for term months, then own the car the rest of keep
// ============================================================================

function fillBuyoutSeries(
  series: MonthlyTcoPoint[],
  input: LeaseTcoInputs,
  ctx: LeaseContext,
): void {
  const leasePeriod = Math.min(ctx.term, ctx.totalMonths);
  const ownedMonths = ctx.totalMonths - leasePeriod;
  const earlyExitPenalty = ctx.totalMonths < ctx.term ? input.earlyTerminationFee : 0;
  const buyoutCashOut = input.leaseEndResidual + input.buyoutFee + earlyExitPenalty;
  // The chart's leaseEnd line shows only the net cost above asset value
  // received — the leaseEndResidual portion buys the asset itself, tracked
  // separately under owned-tail depreciation.
  const leaseEndChartCost = input.buyoutFee + earlyExitPenalty;

  const opportunity = opportunityCostStream(
    buyoutOpportunityInjections(input, ctx, leasePeriod, buyoutCashOut),
    input.opportunityCostRate,
    ctx.totalMonths,
  );
  const leaseInc = buildOwnedMonthsSeries({
    startAgeYears: 0,
    durationMonths: leasePeriod,
    monthlyFuel: ctx.monthlyFuel,
    monthlyInsurance: ctx.monthlyInsurance,
    maintenance: input.maintenance,
    maintenanceAgingScale: LEASE_WARRANTY_AGING_SCALE,
  });
  const ownedInc = buildOwnedMonthsSeries({
    // Owned tail picks up where the lease left off — a 3-year-old buyout car
    // has more wear than a brand-new one.
    startAgeYears: input.vehicleAge + leasePeriod / 12,
    durationMonths: ownedMonths,
    monthlyFuel: ctx.monthlyFuel,
    monthlyInsurance: ctx.monthlyInsurance,
    maintenance: input.maintenance,
  });

  accrueRunningCosts(series, leaseInc, ownedInc, leasePeriod, ctx.totalMonths);
  accrueLeasePeriodFinancials(series, opportunity, ctx, input.downPayment, leasePeriod);
  fillFlatLeaseEnd(series, leasePeriod, ctx.totalMonths, leaseEndChartCost);
  if (ownedMonths > 0) {
    const ownedDepreciation = Math.max(input.leaseEndResidual - input.residualValue, 0);
    accrueOwnedTailDepreciation(series, opportunity, leasePeriod, ctx.totalMonths, ownedDepreciation);
  }
  accrueBuyoutCashOut(series, input, ctx, leaseInc, ownedInc, leasePeriod, buyoutCashOut);
}

function buyoutOpportunityInjections(
  input: LeaseTcoInputs,
  ctx: LeaseContext,
  leasePeriod: number,
  buyoutCashOut: number,
): CashOutflow[] {
  const outflows: CashOutflow[] = [];
  if (input.downPayment > 0) outflows.push({ month: 0, amount: input.downPayment });
  for (let m = 1; m <= leasePeriod; m++) {
    outflows.push({ month: m, amount: ctx.monthlyLeaseFee });
  }
  if (buyoutCashOut > 0 && leasePeriod >= 1) {
    outflows.push({ month: leasePeriod, amount: buyoutCashOut });
  }
  return outflows;
}

function accrueRunningCosts(
  series: MonthlyTcoPoint[],
  leaseInc: OwnedWindowIncrements,
  ownedInc: OwnedWindowIncrements,
  leasePeriod: number,
  totalMonths: number,
): void {
  for (let m = 1; m <= totalMonths; m++) {
    const prev = series[m - 1];
    const inLease = m <= leasePeriod;
    const inc = inLease ? leaseInc : ownedInc;
    const j = inLease ? m - 1 : m - 1 - leasePeriod;
    series[m].fuel = prev.fuel + inc.fuel[j];
    series[m].insurance = prev.insurance + inc.insurance[j];
    series[m].maintenance = prev.maintenance + inc.maintenance[j];
  }
}

function accrueLeasePeriodFinancials(
  series: MonthlyTcoPoint[],
  opportunity: number[],
  ctx: LeaseContext,
  downPayment: number,
  leasePeriod: number,
): void {
  const downPerMonth = downPayment / leasePeriod;
  for (let m = 1; m <= leasePeriod; m++) {
    const prev = series[m - 1];
    series[m].depreciationOrLease = prev.depreciationOrLease + ctx.depreciationFee + downPerMonth;
    series[m].interestAndFees = prev.interestAndFees + ctx.financeFee;
    series[m].opportunityCost = opportunity[m];
  }
}

function fillFlatLeaseEnd(
  series: MonthlyTcoPoint[],
  leasePeriod: number,
  totalMonths: number,
  leaseEndChartCost: number,
): void {
  for (let m = leasePeriod; m <= totalMonths; m++) {
    series[m].leaseEnd = leaseEndChartCost;
  }
}

function accrueOwnedTailDepreciation(
  series: MonthlyTcoPoint[],
  opportunity: number[],
  leasePeriod: number,
  totalMonths: number,
  ownedDepreciation: number,
): void {
  const ownedMonths = totalMonths - leasePeriod;
  const perMonth = ownedDepreciation / ownedMonths;
  for (let m = leasePeriod + 1; m <= totalMonths; m++) {
    const prev = series[m - 1];
    series[m].depreciationOrLease = prev.depreciationOrLease + perMonth;
    series[m].interestAndFees = prev.interestAndFees;
    series[m].opportunityCost = opportunity[m];
  }
}

function accrueBuyoutCashOut(
  series: MonthlyTcoPoint[],
  input: LeaseTcoInputs,
  ctx: LeaseContext,
  leaseInc: OwnedWindowIncrements,
  ownedInc: OwnedWindowIncrements,
  leasePeriod: number,
  buyoutCashOut: number,
): void {
  for (let m = 1; m <= ctx.totalMonths; m++) {
    const prev = series[m - 1];
    const inLease = m <= leasePeriod;
    const inc = inLease ? leaseInc : ownedInc;
    const j = inLease ? m - 1 : m - 1 - leasePeriod;
    const downThisMonth = m === 1 ? input.downPayment : 0;
    const monthlyThisMonth = inLease ? ctx.monthlyLeaseFee : 0;
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
}

// ============================================================================
// Renewal (handback) branch — rolling cycles, each a fresh car (age resets to 0)
// ============================================================================

interface LeaseCycle {
  start: number;
  end: number;
  length: number;
  isFullCycle: boolean;
  isFinalPartial: boolean;
}

function cyclesOver(totalMonths: number, term: number): LeaseCycle[] {
  const cycles: LeaseCycle[] = [];
  for (let cs = 1; cs <= totalMonths; cs += term) {
    const ce = Math.min(cs + term - 1, totalMonths);
    const length = ce - cs + 1;
    cycles.push({
      start: cs,
      end: ce,
      length,
      isFullCycle: length === term,
      isFinalPartial: ce === totalMonths && totalMonths % term !== 0,
    });
  }
  return cycles;
}

function endOfCycleHandbackFires(cycle: LeaseCycle): boolean {
  return cycle.isFullCycle || cycle.isFinalPartial;
}

// Multi-cycle final-partials model "user signed a shorter last lease" — no
// penalty. Only a single partial cycle (keep < term) triggers early-exit.
function endOfCycleEarlyExitFires(cycle: LeaseCycle, ctx: LeaseContext): boolean {
  return cycle.isFinalPartial && ctx.totalMonths < ctx.term;
}

function fillRenewalSeries(
  series: MonthlyTcoPoint[],
  input: LeaseTcoInputs,
  ctx: LeaseContext,
): void {
  const handbackFee = input.dispositionFee + input.excessWearEstimate;
  const cycles = cyclesOver(ctx.totalMonths, ctx.term);
  const opportunity = opportunityCostStream(
    renewalOpportunityInjections(input, ctx, cycles, handbackFee),
    input.opportunityCostRate,
    ctx.totalMonths,
  );

  let cumLeaseEnd = 0;
  for (const cycle of cycles) {
    const inc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: cycle.length,
      monthlyFuel: ctx.monthlyFuel,
      monthlyInsurance: ctx.monthlyInsurance,
      maintenance: input.maintenance,
    });
    const downPerMonth = input.downPayment / cycle.length;

    for (let i = 0; i < cycle.length; i++) {
      const m = cycle.start + i;
      const prev = series[m - 1];
      series[m].fuel = prev.fuel + inc.fuel[i];
      series[m].insurance = prev.insurance + inc.insurance[i];
      series[m].maintenance = prev.maintenance + inc.maintenance[i];
      series[m].depreciationOrLease =
        prev.depreciationOrLease + ctx.depreciationFee + downPerMonth;
      series[m].interestAndFees = prev.interestAndFees + ctx.financeFee;
      series[m].opportunityCost = opportunity[m];

      const atCycleEnd = m === cycle.end;
      const handbackThisMonth = atCycleEnd && endOfCycleHandbackFires(cycle) ? handbackFee : 0;
      const earlyExitThisMonth =
        atCycleEnd && endOfCycleEarlyExitFires(cycle, ctx) ? input.earlyTerminationFee : 0;
      cumLeaseEnd += handbackThisMonth + earlyExitThisMonth;
      series[m].leaseEnd = cumLeaseEnd;

      const downThisMonth = i === 0 ? input.downPayment : 0;
      series[m].cashOut =
        prev.cashOut +
        downThisMonth +
        ctx.monthlyLeaseFee +
        handbackThisMonth +
        earlyExitThisMonth +
        inc.fuel[i] +
        inc.insurance[i] +
        inc.maintenance[i];
    }
  }
}

function renewalOpportunityInjections(
  input: LeaseTcoInputs,
  ctx: LeaseContext,
  cycles: readonly LeaseCycle[],
  handbackFee: number,
): CashOutflow[] {
  const outflows: CashOutflow[] = [];
  for (const cycle of cycles) {
    if (input.downPayment > 0) {
      outflows.push({ month: cycle.start - 1, amount: input.downPayment });
    }
    for (let i = 0; i < cycle.length; i++) {
      outflows.push({ month: cycle.start + i, amount: ctx.monthlyLeaseFee });
    }
    if (endOfCycleHandbackFires(cycle)) {
      outflows.push({ month: cycle.end, amount: handbackFee });
    }
    if (endOfCycleEarlyExitFires(cycle, ctx)) {
      outflows.push({ month: cycle.end, amount: input.earlyTerminationFee });
    }
  }
  return outflows;
}
