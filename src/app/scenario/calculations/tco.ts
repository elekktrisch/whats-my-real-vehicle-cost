import type {
  ChargerStatus,
  CostBreakdown,
  CostCategory,
  LeaseEndChoice,
  Locale,
  MonthlyTcoPoint,
  Powertrain,
  Tab,
} from '../scenario.types';
import { LOCALE_CONFIG } from '../locale.config';
import { financePayment, leasePayment } from './financing';
import { fuelCostOverYears } from './fuel';
import { maintenanceAt } from './maintenance';
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
  // Year-0 annual maintenance, *before* the age curve. The curve is applied
  // per-month inside TCO using `maintenanceK` and a mode-specific age clock
  // (lease-renew resets every cycle; lease-buyout flat through term then
  // climbs from year 1 of the owned tail; finance/cash starts at vehicleAge).
  maintenanceBase: number;
  maintenanceK: number;
  fuelEfficiency: number;
  fuelPrice: number;
  chargerStatus: ChargerStatus;
  solar: boolean;
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
  earlyTerminationFee: number;
  opportunityCostRate: number;
}

export interface FinanceTcoInputs extends TcoBaseInputs {
  tab: 'finance';
  apr: number;
  loanTermMonths: number;
  opportunityCostRate: number;
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

interface OwnedWindowInputs {
  startAgeYears: number;
  durationMonths: number;
  monthlyInsurance: number;
  monthlyFuel: number;
  maintenanceBase: number;
  maintenanceK: number;
}

interface OwnedWindowIncrements {
  fuel: number[];
  insurance: number[];
  maintenance: number[];
}

/**
 * Per-month increments for fuel + insurance + maintenance over an
 * owned-months window with a starting age. Maintenance follows the linear
 * age curve (`base × (1 + k × age)`); fuel and insurance are flat per-month.
 *
 * Each TCO mode composes these: lease-renew calls once per cycle (startAge=0
 * each time → sawtooth), lease-buyout calls twice (lease portion with k=0
 * for flat maintenance, then owned tail with k from category × powertrain),
 * finance/cash calls once for the full keep with startAge=vehicleAge.
 */
function buildOwnedMonthsSeries(input: OwnedWindowInputs): OwnedWindowIncrements {
  const months = Math.max(input.durationMonths, 0);
  const fuel = new Array<number>(months).fill(input.monthlyFuel);
  const insurance = new Array<number>(months).fill(input.monthlyInsurance);
  const maintenance = new Array<number>(months);
  for (let i = 0; i < months; i++) {
    // Mid-month sample integrates the linear curve over the month.
    const ageMidMonth = input.startAgeYears + (i + 0.5) / 12;
    maintenance[i] =
      maintenanceAt(input.maintenanceBase, input.maintenanceK, ageMidMonth) / 12;
  }
  return { fuel, insurance, maintenance };
}

function fuelTotalForMonths(input: TcoBaseInputs, months: number): number {
  return fuelCostOverYears({
    efficiency: input.fuelEfficiency,
    fuelPrice: input.fuelPrice,
    annualMileage: input.annualMileage,
    years: months / 12,
    powertrain: input.powertrain,
    locale: input.locale,
    chargerStatus: input.chargerStatus,
    solar: input.solar,
  });
}

function homeChargerInstallCost(input: TcoBaseInputs): number {
  // Sunk cost on `'installed'` (already paid out-of-pocket) — don't double-count
  // it as a future expense. Only `'buying'` adds the install cost to TCO.
  if (input.powertrain !== 'EV' || input.chargerStatus !== 'buying') return 0;
  return LOCALE_CONFIG[input.locale].defaultHomeChargerInstall;
}

function allocateSeries(totalMonths: number): MonthlyTcoPoint[] {
  const series: MonthlyTcoPoint[] = [emptyPoint(0)];
  for (let m = 1; m <= totalMonths; m++) series.push(emptyPoint(m));
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
  // Home-charger install fires at month 0 and propagates via the cumulative
  // chain that follows. Same shape as the old slider-driven step.
  series[0].maintenance = homeChargerInstallCost(input);

  if (buyOut) {
    const leasePeriod = Math.min(term, totalMonths);
    const ownedMonths = totalMonths - leasePeriod;

    // Lease portion: flat maintenance (k=0). Fuel/insurance accrue normally.
    const leaseInc = buildOwnedMonthsSeries({
      startAgeYears: 0,
      durationMonths: leasePeriod,
      monthlyFuel,
      monthlyInsurance,
      maintenanceBase: input.maintenanceBase,
      maintenanceK: 0,
    });
    // Owned tail: maintenance climbs from year 1 of the owned tail (startAge=0).
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

    // Lease payments + opportunity cost on the down payment during the lease.
    for (let m = 1; m <= leasePeriod; m++) {
      const prev = series[m - 1];
      series[m].depreciationOrLease =
        prev.depreciationOrLease + lease.depreciationFee + input.downPayment / leasePeriod;
      series[m].financing = prev.financing + lease.financeFee + monthlyOppCostBase;
    }

    // Buying out before the lease term ends owes the lessor's early-exit fee.
    const earlyExitPenalty = totalMonths < term ? input.earlyTerminationFee : 0;
    const buyoutTotal = input.residualValue + input.buyoutFee + earlyExitPenalty;
    if (leasePeriod <= totalMonths) {
      for (let m = leasePeriod; m <= totalMonths; m++) {
        series[m].leaseEnd = buyoutTotal;
      }
    }

    // Owned tail: continue depreciating the bought-out car.
    if (ownedMonths > 0) {
      const ownedDepreciation = Math.max(input.residualValue - input.residualValue * 0.6, 0);
      const perMonth = ownedDepreciation / ownedMonths;
      for (let m = leasePeriod + 1; m <= totalMonths; m++) {
        const prev = series[m - 1];
        series[m].depreciationOrLease = prev.depreciationOrLease + perMonth;
        series[m].financing = prev.financing + monthlyOppCostBase;
      }
    }
    return summarize(series);
  }

  // Renew lease — rolling cycles, each a new car (age resets to 0).
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
      series[m].financing = prev.financing + lease.financeFee + monthlyOpp;

      const onCycleBoundary = m === cycleEnd && cycleLen === term;
      const finalPartial = m === totalMonths && totalMonths % term !== 0;
      if (onCycleBoundary || finalPartial) cumLeaseEnd += handbackFee;
      // Early termination only fires for a single partial cycle (keep < term).
      // A partial FINAL cycle with keep > term is modeled as the user signing
      // a shorter last lease — no penalty.
      if (finalPartial && totalMonths < term) {
        cumLeaseEnd += input.earlyTerminationFee;
      }
      series[m].leaseEnd = cumLeaseEnd;
    }
    cycleStart += term;
  }
  return summarize(series);
}

function financeTco(input: FinanceTcoInputs): CostBreakdown {
  const totalMonths = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const principal = Math.max(input.purchasePrice - input.downPayment, 0);
  const loanMonths = Math.min(input.loanTermMonths, totalMonths);
  const monthly = financePayment({
    principal,
    apr: input.apr,
    termMonths: input.loanTermMonths,
  });
  const monthlyInterestRate = input.apr / 100 / 12;
  // Linear opportunity cost on the down payment — same shape as the lease tab.
  // Without this, "100% down on a loan" would look cheaper than cash, which
  // it isn't (same capital tied up).
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
  series[0].maintenance = homeChargerInstallCost(input);

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
  const totalMonths = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const totalDepreciation = Math.max(input.purchasePrice - input.residualValue, 0);
  const perMonthDepreciation = totalDepreciation / totalMonths;
  const opportunity = opportunityCostMonthly(
    input.purchasePrice,
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
  series[0].maintenance = homeChargerInstallCost(input);

  for (let m = 1; m <= totalMonths; m++) {
    const i = m - 1;
    const prev = series[m - 1];
    series[m].fuel = prev.fuel + inc.fuel[i];
    series[m].insurance = prev.insurance + inc.insurance[i];
    series[m].maintenance = prev.maintenance + inc.maintenance[i];
    series[m].depreciationOrLease = prev.depreciationOrLease + perMonthDepreciation;
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