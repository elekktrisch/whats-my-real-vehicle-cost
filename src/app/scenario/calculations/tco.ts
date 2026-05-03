import type {
  CategoryMultipliers,
  CostBreakdown,
  CostCategory,
  LeaseEndChoice,
  Locale,
  MonthlyTcoPoint,
  Powertrain,
  Tab,
} from '../scenario.types';
import { financePayment, leasePayment } from './financing';
import { fuelCostOverYears } from './fuel';
import { opportunityCostMonthly } from './opportunity';

export interface TcoBaseInputs {
  tab: Tab;
  locale: Locale;
  powertrain: Powertrain;
  purchasePrice: number;
  residualValue: number;
  vehicleAge: number;
  annualMileage: number;
  keepDurationYears: number;
  downPayment: number;
  insuranceAnnual: number;
  maintenanceAnnual: number;
  fuelEfficiency: number;
  fuelPrice: number;
  homeChargerInstall: number;
  categoryMultipliers: CategoryMultipliers;
}

export interface LeaseTcoInputs extends TcoBaseInputs {
  tab: 'lease';
  apr: number;
  leaseTermMonths: number;
  leaseEndChoice: LeaseEndChoice;
  dispositionFee: number;
  mileageOverageRate: number;
  excessWearEstimate: number;
  buyoutFee: number;
  opportunityCostRate: number;
}

export interface FinanceTcoInputs extends TcoBaseInputs {
  tab: 'finance';
  apr: number;
  loanTermMonths: number;
}

export interface CashTcoInputs extends TcoBaseInputs {
  tab: 'cash';
  opportunityCostRate: number;
}

export type TcoInputs = LeaseTcoInputs | FinanceTcoInputs | CashTcoInputs;

const COST_KEYS: CostCategory[] = [
  'depreciationOrLease',
  'financing',
  'fuel',
  'insurance',
  'maintenance',
  'leaseEnd',
];

function emptyPoint(month: number): MonthlyTcoPoint {
  return {
    month,
    depreciationOrLease: 0,
    financing: 0,
    fuel: 0,
    insurance: 0,
    maintenance: 0,
    leaseEnd: 0,
  };
}

function emptyTotals(): Record<CostCategory, number> {
  return {
    depreciationOrLease: 0,
    financing: 0,
    fuel: 0,
    insurance: 0,
    maintenance: 0,
    leaseEnd: 0,
  };
}

function buildCommonSeries(input: TcoBaseInputs): MonthlyTcoPoint[] {
  const months = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const series: MonthlyTcoPoint[] = [emptyPoint(0)];
  const monthlyInsurance = input.insuranceAnnual / 12;
  const monthlyMaintenance = input.maintenanceAnnual / 12;
  const totalFuel = fuelCostOverYears({
    efficiency: input.fuelEfficiency,
    fuelPrice: input.fuelPrice,
    annualMileage: input.annualMileage,
    years: input.keepDurationYears,
    powertrain: input.powertrain,
    locale: input.locale,
  });
  const monthlyFuel = totalFuel / months;

  for (let m = 1; m <= months; m++) {
    series.push({
      month: m,
      depreciationOrLease: 0,
      financing: 0,
      fuel: series[m - 1].fuel + monthlyFuel,
      insurance: series[m - 1].insurance + monthlyInsurance,
      maintenance: series[m - 1].maintenance + monthlyMaintenance,
      leaseEnd: 0,
    });
  }

  if (input.powertrain === 'EV' && input.homeChargerInstall > 0) {
    for (let m = 0; m <= months; m++) {
      series[m].maintenance += input.homeChargerInstall;
    }
  }
  return series;
}

function summarize(series: MonthlyTcoPoint[]): CostBreakdown {
  const last = series[series.length - 1];
  const totals = emptyTotals();
  for (const key of COST_KEYS) totals[key] = last[key];
  const total = COST_KEYS.reduce((sum, k) => sum + totals[k], 0);
  return { series, totals, total };
}

function leaseTco(input: LeaseTcoInputs): CostBreakdown {
  const series = buildCommonSeries(input);
  const totalMonths = series.length - 1;
  const term = Math.max(input.leaseTermMonths, 1);
  const monthlyOppCost = (input.downPayment * input.opportunityCostRate) / 12;
  const lease = leasePayment({
    capCost: input.purchasePrice,
    downPayment: input.downPayment,
    residualValue: input.residualValue,
    apr: input.apr,
    termMonths: term,
    locale: input.locale,
  });
  const buyOut = input.leaseEndChoice === 'buyOut';

  if (buyOut) {
    const leasePeriod = Math.min(term, totalMonths);
    for (let m = 1; m <= leasePeriod; m++) {
      const prev = series[m - 1];
      series[m].depreciationOrLease =
        prev.depreciationOrLease + lease.depreciationFee + input.downPayment / leasePeriod;
      series[m].financing = prev.financing + lease.financeFee + monthlyOppCost;
    }
    const buyoutTotal = input.residualValue + input.buyoutFee;
    if (leasePeriod <= totalMonths) {
      for (let m = leasePeriod; m <= totalMonths; m++) {
        series[m].leaseEnd = buyoutTotal;
      }
    }
    if (totalMonths > leasePeriod) {
      const ownedMonths = totalMonths - leasePeriod;
      const ownedDepreciation = Math.max(input.residualValue - input.residualValue * 0.6, 0);
      const perMonth = ownedDepreciation / ownedMonths;
      for (let m = leasePeriod + 1; m <= totalMonths; m++) {
        const prev = series[m - 1];
        series[m].depreciationOrLease = prev.depreciationOrLease + perMonth;
        series[m].financing = prev.financing + monthlyOppCost;
      }
    }
    return summarize(series);
  }

  // Renew lease: rolling lease across the full keep duration. Each cycle =
  // `term` months at the same monthly payment, plus a fresh down payment that
  // amortizes across that cycle's actual length (the final cycle may be
  // partial). Opportunity cost grows on every down payment paid so far, so the
  // financing line steepens at each cycle boundary.
  const handbackFee = input.dispositionFee + input.excessWearEstimate;
  let cumulativeDownPaid = 0;
  let cumLeaseEnd = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const prev = series[m - 1];
    const cycleIdx = Math.floor((m - 1) / term);
    const cycleStart = cycleIdx * term + 1;
    const cycleEnd = Math.min(cycleStart + term - 1, totalMonths);
    const cycleLen = cycleEnd - cycleStart + 1;
    if (m === cycleStart) cumulativeDownPaid += input.downPayment;
    const downContrib = input.downPayment / cycleLen;
    const monthlyOpp = (cumulativeDownPaid * input.opportunityCostRate) / 12;
    series[m].depreciationOrLease =
      prev.depreciationOrLease + lease.depreciationFee + downContrib;
    series[m].financing = prev.financing + lease.financeFee + monthlyOpp;
    const onCycleBoundary = m % term === 0;
    const finalPartial = m === totalMonths && totalMonths % term !== 0;
    if (onCycleBoundary || finalPartial) cumLeaseEnd += handbackFee;
    series[m].leaseEnd = cumLeaseEnd;
  }
  return summarize(series);
}

function financeTco(input: FinanceTcoInputs): CostBreakdown {
  const series = buildCommonSeries(input);
  const totalMonths = series.length - 1;
  const principal = Math.max(input.purchasePrice - input.downPayment, 0);
  const loanMonths = Math.min(input.loanTermMonths, totalMonths);
  const monthly = financePayment({
    principal,
    apr: input.apr,
    termMonths: input.loanTermMonths,
  });
  const monthlyInterestRate = input.apr / 100 / 12;

  let balance = principal;
  for (let m = 1; m <= totalMonths; m++) {
    const prev = series[m - 1];
    let principalPart = 0;
    let interestPart = 0;
    if (m <= loanMonths && balance > 0) {
      interestPart = balance * monthlyInterestRate;
      principalPart = Math.min(monthly - interestPart, balance);
      balance -= principalPart;
    }
    series[m].depreciationOrLease =
      prev.depreciationOrLease + principalPart + (m === 1 ? input.downPayment : 0);
    series[m].financing = prev.financing + interestPart;
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

function cashTco(input: CashTcoInputs): CostBreakdown {
  const series = buildCommonSeries(input);
  const totalMonths = series.length - 1;
  const totalDepreciation = Math.max(input.purchasePrice - input.residualValue, 0);
  const perMonthDepreciation = totalDepreciation / totalMonths;
  const opportunity = opportunityCostMonthly(
    input.purchasePrice,
    input.opportunityCostRate,
    totalMonths,
  );
  for (let m = 1; m <= totalMonths; m++) {
    series[m].depreciationOrLease = series[m - 1].depreciationOrLease + perMonthDepreciation;
    series[m].financing = opportunity[m];
  }
  return summarize(series);
}

export function tcoBreakdown(input: TcoInputs): CostBreakdown {
  if (input.tab === 'lease') return leaseTco(input);
  if (input.tab === 'finance') return financeTco(input);
  return cashTco(input);
}

export function effectiveMonthly(breakdown: CostBreakdown, keepDurationYears: number): number {
  const months = Math.max(Math.round(keepDurationYears * 12), 1);
  return breakdown.total / months;
}

export function costPerDistance(
  breakdown: CostBreakdown,
  annualMileage: number,
  keepDurationYears: number,
): number {
  const distance = annualMileage * keepDurationYears;
  return distance > 0 ? breakdown.total / distance : 0;
}