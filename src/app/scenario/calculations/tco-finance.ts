import type { CostBreakdown } from '../scenario.types';
import { financePayment } from './financing';
import {
  TcoBaseInputs,
  allocateSeries,
  buildOwnedMonthsSeries,
  fuelTotalForMonths,
  homeChargerInstallCost,
  summarize,
} from './tco-shared';

export interface FinanceTcoInputs extends TcoBaseInputs {
  tab: 'finance';
  apr: number;
  loanTermMonths: number;
  opportunityCostRate: number;
}

export function financeTco(input: FinanceTcoInputs): CostBreakdown {
  const totalMonths = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const principal = Math.max(input.purchasePrice - input.downPayment, 0);
  const loanMonths = Math.min(input.loanTermMonths, totalMonths);
  const monthly = financePayment({
    principal,
    apr: input.apr,
    termMonths: input.loanTermMonths,
  });
  const monthlyInterestRate = input.apr / 100 / 12;
  // Opportunity cost on the down payment — without this, "100% down on a loan"
  // would look cheaper than cash, which it isn't (same capital tied up).
  const monthlyOppCost = (input.downPayment * input.opportunityCostRate) / 12;

  const fuelTotal = fuelTotalForMonths(input, totalMonths);
  const monthlyFuel = totalMonths > 0 ? fuelTotal / totalMonths : 0;
  const monthlyInsurance = input.insuranceAnnual / 12;
  const inc = buildOwnedMonthsSeries({
    startAgeYears: input.vehicleAge,
    durationMonths: totalMonths,
    monthlyFuel,
    monthlyInsurance,
    maintenanceBase: input.maintenanceBase,
    maintenanceK: input.maintenanceK,
  });

  const series = allocateSeries(totalMonths);
  const chargerInstall = homeChargerInstallCost(input);
  series[0].maintenance = chargerInstall;
  series[0].cashOut = chargerInstall;

  let balance = principal;
  for (let m = 1; m <= totalMonths; m++) {
    const i = m - 1;
    const prev = series[m - 1];
    let principalPart = 0;
    let interestPart = 0;
    if (m <= loanMonths && balance > 0) {
      interestPart = balance * monthlyInterestRate;
      principalPart = Math.min(monthly - interestPart, balance);
      balance -= principalPart;
    }
    series[m].fuel = prev.fuel + inc.fuel[i];
    series[m].insurance = prev.insurance + inc.insurance[i];
    series[m].maintenance = prev.maintenance + inc.maintenance[i];
    series[m].depreciationOrLease =
      prev.depreciationOrLease + principalPart + (m === 1 ? input.downPayment : 0);
    series[m].financing = prev.financing + interestPart + monthlyOppCost;
    // Cash flow: down at month 1, full loan payment (principal + interest)
    // every month while the loan is active, plus running costs.
    const downThisMonth = m === 1 ? input.downPayment : 0;
    const loanPaymentThisMonth = m <= loanMonths && balance >= 0 ? principalPart + interestPart : 0;
    series[m].cashOut =
      prev.cashOut +
      downThisMonth +
      loanPaymentThisMonth +
      inc.fuel[i] +
      inc.insurance[i] +
      inc.maintenance[i];
  }

  const totalDepreciation = Math.max(input.purchasePrice - input.residualValue, 0);
  const lastDep = series[totalMonths].depreciationOrLease;
  if (lastDep > 0) {
    const scale = totalDepreciation / lastDep;
    for (let m = 1; m <= totalMonths; m++) {
      series[m].depreciationOrLease = series[m].depreciationOrLease * scale;
    }
  }

  return summarize(series);
}
