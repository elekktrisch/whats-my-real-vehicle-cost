import type { CostBreakdown, LeaseEndChoice } from '../scenario.types';
import { leasePayment } from './financing';
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

export function leaseTco(input: LeaseTcoInputs): CostBreakdown {
  const totalMonths = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const term = Math.max(input.leaseTermMonths, 1);
  const monthlyOppCostBase = (input.downPayment * input.opportunityCostRate) / 12;
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

    // Lease portion: flat maintenance (k=0); owned tail starts age clock at 0.
    const leaseInc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: leasePeriod,
      monthlyFuel,
      monthlyInsurance,
      maintenanceBase: input.maintenanceBase,
      maintenanceK: 0,
    });
    const ownedInc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: ownedMonths,
      monthlyFuel,
      monthlyInsurance,
      maintenanceBase: input.maintenanceBase,
      maintenanceK: input.maintenanceK,
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
      series[m].opportunityCost = prev.opportunityCost + monthlyOppCostBase;
    }

    const earlyExitPenalty = totalMonths < term ? input.earlyTerminationFee : 0;
    const buyoutTotal = input.leaseEndResidual + input.buyoutFee + earlyExitPenalty;
    if (leasePeriod <= totalMonths) {
      for (let m = leasePeriod; m <= totalMonths; m++) {
        series[m].leaseEnd = buyoutTotal;
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
        series[m].opportunityCost = prev.opportunityCost + monthlyOppCostBase;
      }
    }

    // Cash flow pass — single forward sweep over all months.
    for (let m = 1; m <= totalMonths; m++) {
      const prev = series[m - 1];
      const inLease = m <= leasePeriod;
      const inc = inLease ? leaseInc : ownedInc;
      const j = inLease ? m - 1 : m - 1 - leasePeriod;
      const downThisMonth = m === 1 ? input.downPayment : 0;
      const monthlyThisMonth = inLease ? monthlyLeaseFee : 0;
      const buyoutThisMonth = m === leasePeriod ? buyoutTotal : 0;
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
  let cumulativeDownPaid = 0;
  let cumLeaseEnd = 0;

  let cycleStart = 1;
  while (cycleStart <= totalMonths) {
    const cycleEnd = Math.min(cycleStart + term - 1, totalMonths);
    const cycleLen = cycleEnd - cycleStart + 1;
    const inc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: cycleLen,
      monthlyFuel,
      monthlyInsurance,
      maintenanceBase: input.maintenanceBase,
      maintenanceK: input.maintenanceK,
    });
    cumulativeDownPaid += input.downPayment;
    const monthlyOpp = (cumulativeDownPaid * input.opportunityCostRate) / 12;
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
      series[m].opportunityCost = prev.opportunityCost + monthlyOpp;

      const onCycleBoundary = m === cycleEnd && cycleLen === term;
      const finalPartial = m === totalMonths && totalMonths % term !== 0;
      if (onCycleBoundary || finalPartial) cumLeaseEnd += handbackFee;
      // Early termination fires only for a single partial cycle (keep < term).
      // Partial FINAL cycles when keep > term model "shorter last lease" — no penalty.
      if (finalPartial && totalMonths < term) {
        cumLeaseEnd += input.earlyTerminationFee;
      }
      series[m].leaseEnd = cumLeaseEnd;

      // Cash flow: down at cycle start, monthly lease fee every month, handback
      // at cycle end (full or final-partial), early-exit on the keep < term
      // partial. Running costs accrue per month.
      const downThisMonth = i === 0 ? input.downPayment : 0;
      let endFeeThisMonth = 0;
      if (onCycleBoundary || finalPartial) endFeeThisMonth += handbackFee;
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
