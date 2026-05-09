import type { CostBreakdown, MonthlyTcoPoint } from '../scenario.types';
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
  const monthlyPayment = financePayment({
    principal,
    apr: input.apr,
    termMonths: input.loanTermMonths,
  });

  const schedule = amortizeLoan({
    principal,
    monthlyPayment,
    monthlyRate: input.apr / 100 / 12,
    loanMonths,
    totalMonths,
  });

  const opportunity = opportunityCostStream(
    financingCashOutflows(input.downPayment, schedule, loanMonths),
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
    maintenance: input.maintenance,
  });

  const series = allocateSeries(totalMonths);
  const chargerInstall = homeChargerInstallCost(input);
  series[0].maintenance = chargerInstall;
  series[0].cashOut = chargerInstall;

  for (let m = 1; m <= totalMonths; m++) {
    const i = m - 1;
    const prev = series[m - 1];
    const downThisMonth = m === 1 ? input.downPayment : 0;
    const loanPaymentThisMonth = schedule.principalPart[m] + schedule.interestPart[m];
    series[m].fuel = prev.fuel + inc.fuel[i];
    series[m].insurance = prev.insurance + inc.insurance[i];
    series[m].maintenance = prev.maintenance + inc.maintenance[i];
    series[m].depreciationOrLease =
      prev.depreciationOrLease + schedule.principalPart[m] + downThisMonth;
    series[m].interestAndFees = prev.interestAndFees + schedule.interestPart[m];
    series[m].opportunityCost = opportunity[m];
    series[m].cashOut =
      prev.cashOut +
      downThisMonth +
      loanPaymentThisMonth +
      inc.fuel[i] +
      inc.insurance[i] +
      inc.maintenance[i];
  }

  rescaleDepreciationToResidual(series, totalMonths, input.purchasePrice - input.residualValue);
  return summarize(series);
}

interface AmortizationParams {
  principal: number;
  monthlyPayment: number;
  monthlyRate: number;
  loanMonths: number;
  totalMonths: number;
}

interface LoanSchedule {
  principalPart: number[];
  interestPart: number[];
}

function amortizeLoan(p: AmortizationParams): LoanSchedule {
  const principalPart = new Array<number>(p.totalMonths + 1).fill(0);
  const interestPart = new Array<number>(p.totalMonths + 1).fill(0);
  let balance = p.principal;
  for (let m = 1; m <= p.loanMonths && balance > 0; m++) {
    const interest = balance * p.monthlyRate;
    const principalThisMonth = Math.min(p.monthlyPayment - interest, balance);
    balance -= principalThisMonth;
    interestPart[m] = interest;
    principalPart[m] = principalThisMonth;
  }
  return { principalPart, interestPart };
}

function financingCashOutflows(
  downPayment: number,
  schedule: LoanSchedule,
  loanMonths: number,
): { month: number; amount: number }[] {
  const outflows: { month: number; amount: number }[] = [];
  if (downPayment > 0) outflows.push({ month: 0, amount: downPayment });
  for (let m = 1; m <= loanMonths; m++) {
    const payment = schedule.principalPart[m] + schedule.interestPart[m];
    if (payment > 0) outflows.push({ month: m, amount: payment });
  }
  return outflows;
}

function rescaleDepreciationToResidual(
  series: MonthlyTcoPoint[],
  totalMonths: number,
  totalDepreciation: number,
): void {
  const target = Math.max(totalDepreciation, 0);
  const lastDep = series[totalMonths].depreciationOrLease;
  if (lastDep <= 0) return;
  const scale = target / lastDep;
  for (let m = 1; m <= totalMonths; m++) {
    series[m].depreciationOrLease *= scale;
  }
}
