import type { CostBreakdown } from '../scenario.types';
import { LeaseTcoInputs, leaseTco } from './tco-lease';
import { FinanceTcoInputs, financeTco } from './tco-finance';
import { CashTcoInputs, cashTco } from './tco-cash';

export type { TcoBaseInputs } from './tco-shared';
export type { LeaseTcoInputs } from './tco-lease';
export type { FinanceTcoInputs } from './tco-finance';
export type { CashTcoInputs } from './tco-cash';

export type TcoInputs = LeaseTcoInputs | FinanceTcoInputs | CashTcoInputs;

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
