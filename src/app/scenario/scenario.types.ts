export type Locale = 'US' | 'EU';
export type Powertrain = 'ICE' | 'EV';
export type Tab = 'lease' | 'finance' | 'cash';
export type VehicleCategory = 'economy' | 'mid' | 'luxury';
export type LeaseEndChoice = 'handBack' | 'buyOut';
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
  chargerStatus: ChargerStatus;
  solar: boolean;
}

export interface LeaseInputs {
  /** null = auto-derive from vehicleAge (1% new, 3% used). */
  apr: number | null;
  leaseTerm: number;
  downPayment: number;
  /** null = auto-derive from keep-duration vs. lease term. Set by the user toggle. */
  leaseEndChoice: LeaseEndChoice | null;
  dispositionFee: number | null;
  mileageOverageRate: number | null;
  excessWearEstimate: number | null;
  buyoutFee: number | null;
  earlyTerminationFee: number | null;
  /** null = auto-derive at vehicleAge + leaseTerm/12. Distinct from
   * `Globals.residualValue` (end-of-keep), which drives asset display
   * and finance/cash depreciation. */
  leaseEndResidual: number | null;
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
  | 'interestAndFees'
  | 'opportunityCost'
  | 'fuel'
  | 'insurance'
  | 'maintenance'
  | 'leaseEnd';

export interface MonthlyTcoPoint {
  month: number;
  depreciationOrLease: number;
  // Real cash outflows for borrowing — loan interest portion of each payment,
  // lease finance fee. Year-1 spike for the down payment lives in
  // `depreciationOrLease`, not here.
  interestAndFees: number;
  // Foregone return on capital tied up — the down payment (or full purchase
  // for cash) earning nothing during the keep duration. Real cost, but
  // never appears as a check the user writes; lives only in the chart.
  opportunityCost: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  leaseEnd: number;
  // Cumulative *cash out of pocket* through this month — the second lens on
  // the chart, drawn as an overlay line over the stacked-area cost layers.
  // Sums the actual checks the user writes: lump sums (down, buyout,
  // handback, full purchase) at the months they fire, monthly lease/loan
  // payments while they accrue, plus running costs (insurance + maintenance
  // + fuel) per month. Diverges from the cost stack by opportunity-cost +
  // depreciation framing — that gap is the educational point.
  cashOut: number;
}

export interface CostBreakdown {
  series: MonthlyTcoPoint[];
  totals: Record<CostCategory, number>;
  total: number;
}
