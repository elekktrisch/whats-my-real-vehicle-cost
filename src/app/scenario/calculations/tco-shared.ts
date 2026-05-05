import type {
  ChargerStatus,
  CostBreakdown,
  CostCategory,
  Locale,
  MonthlyTcoPoint,
  Powertrain,
  Tab,
} from '../scenario.types';
import { LOCALE_CONFIG } from '../locale.config';
import { fuelCostOverYears } from './fuel';
import { maintenanceAt } from './maintenance';

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
  // Year-0 annual maintenance, before the age curve. The curve uses
  // `maintenanceK` with a mode-specific age clock — lease-renew resets each
  // cycle; lease-buyout is flat through the lease then climbs from owned-year-1;
  // finance/cash starts at `vehicleAge`.
  maintenanceBase: number;
  maintenanceK: number;
  fuelEfficiency: number;
  fuelPrice: number;
  chargerStatus: ChargerStatus;
  solar: boolean;
}

export const COST_KEYS: CostCategory[] = [
  'depreciationOrLease',
  'financing',
  'fuel',
  'insurance',
  'maintenance',
  'leaseEnd',
];

export function emptyPoint(month: number): MonthlyTcoPoint {
  return {
    month,
    depreciationOrLease: 0,
    financing: 0,
    fuel: 0,
    insurance: 0,
    maintenance: 0,
    leaseEnd: 0,
    cashOut: 0,
  };
}

export function emptyTotals(): Record<CostCategory, number> {
  return {
    depreciationOrLease: 0,
    financing: 0,
    fuel: 0,
    insurance: 0,
    maintenance: 0,
    leaseEnd: 0,
  };
}

export interface OwnedWindowInputs {
  startAgeYears: number;
  durationMonths: number;
  monthlyInsurance: number;
  monthlyFuel: number;
  maintenanceBase: number;
  maintenanceK: number;
}

export interface OwnedWindowIncrements {
  fuel: number[];
  insurance: number[];
  maintenance: number[];
}

// Per-month fuel + insurance + maintenance over an owned-months window.
// Maintenance follows `base × (1 + k × age)`; the others are flat per-month.
// Lease-renew calls this once per cycle with startAge=0 (sawtooth);
// lease-buyout calls twice (lease portion k=0, owned tail k from category);
// finance/cash calls once with startAge=vehicleAge.
export function buildOwnedMonthsSeries(input: OwnedWindowInputs): OwnedWindowIncrements {
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

export function fuelTotalForMonths(input: TcoBaseInputs, months: number): number {
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

// Only 'buying' adds install cost; 'installed' is sunk, don't double-count.
export function homeChargerInstallCost(input: TcoBaseInputs): number {
  if (input.powertrain !== 'EV' || input.chargerStatus !== 'buying') return 0;
  return LOCALE_CONFIG[input.locale].defaultHomeChargerInstall;
}

export function allocateSeries(totalMonths: number): MonthlyTcoPoint[] {
  const series: MonthlyTcoPoint[] = [emptyPoint(0)];
  for (let m = 1; m <= totalMonths; m++) series.push(emptyPoint(m));
  return series;
}

export function summarize(series: MonthlyTcoPoint[]): CostBreakdown {
  const last = series[series.length - 1];
  const totals = emptyTotals();
  for (const key of COST_KEYS) totals[key] = last[key];
  const total = COST_KEYS.reduce((sum, k) => sum + totals[k], 0);
  return { series, totals, total };
}
