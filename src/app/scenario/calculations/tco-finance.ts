import type { CostBreakdown } from '../scenario.types';
import { financePayment } from './financing';
import { opportunityCostStream } from './opportunity';
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

/**
 * Finance (loan) TCO accumulator.
 *
 * Amortizes a fixed-rate loan over `loanTermMonths` to split each payment
 * into principal vs. interest. Principal accrues into `depreciationOrLease`
 * (since paying down principal is buying equity in the asset); interest
 * lands in `interestAndFees`. After the loan ends, the user owns the car
 * outright and only running costs accrue.
 *
 * `depreciationOrLease` is rescaled at the end so the cumulative total
 * equals `purchasePrice - residualValue` over the keep horizon — the loan's
 * principal schedule shapes the *curve*, but the residual constraint sets
 * the magnitude.
 *
 * Opportunity cost: the down payment plus every loan payment is a real
 * cash outflow that stops earning the user's `opportunityCostRate` from
 * outflow time onward. Each compounds independently to end-of-keep.
 */
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

  // First pass: amortize the loan to find the per-month principal and interest
  // splits. Each loan payment is also a cash outflow that stops earning the
  // user's opportunity rate from that month forward.
  const principalPart = new Array(totalMonths + 1).fill(0);
  const interestPart = new Array(totalMonths + 1).fill(0);
  {
    let balance = principal;
    for (let m = 1; m <= loanMonths && balance > 0; m++) {
      const interest = balance * monthlyInterestRate;
      const prin = Math.min(monthly - interest, balance);
      balance -= prin;
      interestPart[m] = interest;
      principalPart[m] = prin;
    }
  }

  // Opportunity cost: every cash outflow into the financing decision (down +
  // each loan payment) stops earning returns from outflow time onward. The
  // down compounds for the full keep horizon; each monthly payment compounds
  // from its payment month to end-of-keep.
  const oppInjections: { month: number; amount: number }[] = [];
  if (input.downPayment > 0) oppInjections.push({ month: 0, amount: input.downPayment });
  for (let m = 1; m <= loanMonths; m++) {
    const payment = principalPart[m] + interestPart[m];
    if (payment > 0) oppInjections.push({ month: m, amount: payment });
  }
  const opportunity = opportunityCostStream(
    oppInjections,
    input.opportunityCostRate,
    totalMonths,
  );

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

  for (let m = 1; m <= totalMonths; m++) {
    const i = m - 1;
    const prev = series[m - 1];
    series[m].fuel = prev.fuel + inc.fuel[i];
    series[m].insurance = prev.insurance + inc.insurance[i];
    series[m].maintenance = prev.maintenance + inc.maintenance[i];
    series[m].depreciationOrLease =
      prev.depreciationOrLease + principalPart[m] + (m === 1 ? input.downPayment : 0);
    series[m].interestAndFees = prev.interestAndFees + interestPart[m];
    series[m].opportunityCost = opportunity[m];
    // Cash flow: down at month 1, full loan payment (principal + interest)
    // every month while the loan is active, plus running costs.
    const downThisMonth = m === 1 ? input.downPayment : 0;
    const loanPaymentThisMonth = principalPart[m] + interestPart[m];
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
