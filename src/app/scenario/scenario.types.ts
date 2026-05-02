export type Locale = 'US' | 'EU';
export type Powertrain = 'ICE' | 'EV';
export type Tab = 'lease' | 'finance' | 'cash';
export type VehicleCategory = 'economy' | 'mid' | 'luxury';
export type LeaseEndChoice = 'handBack' | 'buyOut';

export interface CategoryMultipliers {
  insurance: number;
  maintenance: number;
}

export interface Globals {
  locale: Locale;
  powertrain: Powertrain;
  purchasePrice: number;
  residualValue: number;
  vehicleAge: number;
  annualMileage: number;
  keepDuration: number;
  downPayment: number;
  activeTab: Tab;
}

export interface LeaseInputs {
  apr: number;
  leaseTerm: number;
  leaseEndChoice: LeaseEndChoice;
  dispositionFee: number | null;
  mileageOverageRate: number | null;
  excessWearEstimate: number | null;
  buyoutFee: number | null;
}

export interface FinanceInputs {
  apr: number;
  loanTerm: number;
}

export interface CashInputs {
  opportunityCostRate: number;
}

export interface TcoOverrides {
  insurance: number | null;
  maintenance: number | null;
  fuelEfficiency: number | null;
  fuelPrice: number | null;
  homeChargerInstall: number | null;
}

export interface PerTabOverrides {
  lease: TcoOverrides;
  finance: TcoOverrides;
  cash: TcoOverrides;
}

export interface ScenarioSnapshot {
  globals: Globals;
  lease: LeaseInputs;
  finance: FinanceInputs;
  cash: CashInputs;
  overrides: PerTabOverrides;
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