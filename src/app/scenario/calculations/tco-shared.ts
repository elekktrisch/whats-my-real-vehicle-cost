import type {
  ChargerStatus,
  CostBreakdown,
  CostCategory,
  MonthlyTcoPoint,
  Powertrain,
  Region,
  Tab,
} from '../scenario.types';
import { fuelCostOverYears } from './fuel';
import { MaintenanceContext, maintenanceAt } from './maintenance';

export interface TcoBaseInputs {
  tab: Tab;
  region: Region;
  powertrain: Powertrain;
  purchasePrice: number;
  residualValue: number;
  vehicleAge: number;
  annualMileage: number;
  keepDurationYears: number;
  downPayment: number;
  insuranceAnnual: number;
  // Maintenance is now curve-driven — ctx bundles msrp + curve + categoryMult
  // + mileageFactor. Mode-specific age clocks live in the per-mode TCO
  // builders (lease-renew resets each cycle; lease-buyout passes 0.5
  // agingScale through the lease portion; finance/cash starts at vehicleAge).
  maintenance: MaintenanceContext;
  fuelEfficiency: number;
  fuelPrice: number;
  chargerStatus: ChargerStatus;
  solar: boolean;
  // One-shot install cost when the user is buying a home charger. Resolved
  // by the store from the context-aware region config so UK mode picks up
  // the GBP-equivalent figure rather than the EUR EU baseline.
  homeChargerInstall: number;
}

export const COST_KEYS: CostCategory[] = [
  'depreciationOrLease',
  'interestAndFees',
  'opportunityCost',
  'fuel',
  'insurance',
  'maintenance',
  'leaseEnd',
];

export function emptyPoint(month: number): MonthlyTcoPoint {
  return {
    month,
    depreciationOrLease: 0,
    interestAndFees: 0,
    opportunityCost: 0,
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
    interestAndFees: 0,
    opportunityCost: 0,
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
  maintenance: MaintenanceContext;
  /** Scales only the growth above year-0. Default 1 (full aging); lease
   * passes 0.5 for the warranty portion (consumables age slower). */
  maintenanceAgingScale?: number;
}

export interface OwnedWindowIncrements {
  fuel: number[];
  insurance: number[];
  maintenance: number[];
}

// Per-month fuel + insurance + maintenance over an owned-months window.
// Maintenance follows the curve evaluated at mid-month age; the others are
// flat per-month. Lease-renew calls this once per cycle with startAge=0
// (sawtooth); lease-buyout calls twice (lease portion agingScale=0.5, owned
// tail agingScale=1); finance/cash calls once with startAge=vehicleAge.
export function buildOwnedMonthsSeries(input: OwnedWindowInputs): OwnedWindowIncrements {
  const months = Math.max(input.durationMonths, 0);
  const fuel = new Array<number>(months).fill(input.monthlyFuel);
  const insurance = new Array<number>(months).fill(input.monthlyInsurance);
  const maintenance = new Array<number>(months);
  const agingScale = input.maintenanceAgingScale ?? 1;
  for (let i = 0; i < months; i++) {
    // Mid-month sample integrates the curve over the month.
    const ageMidMonth = input.startAgeYears + (i + 0.5) / 12;
    maintenance[i] = maintenanceAt(input.maintenance, ageMidMonth, agingScale) / 12;
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
    region: input.region,
    chargerStatus: input.chargerStatus,
    solar: input.solar,
  });
}

// Only 'buying' adds install cost; 'installed' is sunk, don't double-count.
export function homeChargerInstallCost(input: TcoBaseInputs): number {
  if (input.powertrain !== 'EV' || input.chargerStatus !== 'buying') return 0;
  return input.homeChargerInstall;
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
