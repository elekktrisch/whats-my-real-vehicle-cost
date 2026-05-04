export type Locale = 'US' | 'EU';
export type Powertrain = 'ICE' | 'EV';
export type Tab = 'lease' | 'finance' | 'cash';
export type VehicleCategory = 'economy' | 'mid' | 'luxury';
export type LeaseEndChoice = 'handBack' | 'buyOut';
/**
 * Home charger status — replaces the old `homeChargerInstalled: boolean`.
 *  - `'none'`     : public-charging only; no install cost; solar disabled.
 *  - `'installed'`: charger already paid for (sunk cost); solar available.
 *  - `'buying'`   : charger to be installed; install cost added at month 0;
 *                   solar available.
 */
export type ChargerStatus = 'none' | 'installed' | 'buying';

export interface CategoryMultipliers {
  insurance: number;
  maintenance: number;
}

export interface Globals {
  locale: Locale;
  powertrain: Powertrain;
  purchasePrice: number;
  /** null = auto-derive from msrp × depreciationFactor(vehicleAge + keepDuration). */
  residualValue: number | null;
  vehicleAge: number;
  annualMileage: number;
  keepDuration: number;
  activeTab: Tab;
  /** EV-only: home wall charger plan — gates solar AND the install cost. */
  chargerStatus: ChargerStatus;
  /** EV-only: solar at home (85% home / 15% public split). Gated by charger. */
  solar: boolean;
}

export interface LeaseInputs {
  apr: number;
  leaseTerm: number;
  downPayment: number;
  /** null = auto-derive from keep-duration vs. lease term. Set by the user toggle. */
  leaseEndChoice: LeaseEndChoice | null;
  dispositionFee: number | null;
  mileageOverageRate: number | null;
  excessWearEstimate: number | null;
  buyoutFee: number | null;
  earlyTerminationFee: number | null;
}

export interface FinanceInputs {
  apr: number;
  loanTerm: number;
  downPayment: number;
}

export interface CashInputs {
  opportunityCostRate: number;
}

export interface TcoOverrides {
  insurance: number | null;
  fuelEfficiency: number | null;
  fuelPrice: number | null;
}

export interface ScenarioSnapshot {
  globals: Globals;
  lease: LeaseInputs;
  finance: FinanceInputs;
  cash: CashInputs;
  overrides: TcoOverrides;
}

export type CostCategory =
  | 'depreciationOrLease'
  | 'financing'
  | 'fuel'
  | 'insurance'
  | 'maintenance'
  | 'leaseEnd';

export interface MonthlyTcoPoint {
  month: number;
  depreciationOrLease: number;
  financing: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  leaseEnd: number;
}

export interface CostBreakdown {
  series: MonthlyTcoPoint[];
  totals: Record<CostCategory, number>;
  total: number;
}