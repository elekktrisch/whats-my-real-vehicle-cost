import type { CostBreakdown } from '../scenario.types';
import { LeaseTcoInputs, leaseTco } from './tco-lease';
import { FinanceTcoInputs, financeTco } from './tco-finance';
import { CashTcoInputs, cashTco } from './tco-cash';

export type { TcoBaseInputs } from './tco-shared';
export type { LeaseTcoInputs } from './tco-lease';
export type { FinanceTcoInputs } from './tco-finance';
export type { CashTcoInputs } from './tco-cash';

export type TcoInputs = LeaseTcoInputs | FinanceTcoInputs | CashTcoInputs;

/**
 * Dispatch to the per-mode TCO accumulator.
 *
 * Returns a `CostBreakdown` with a per-month `series[]` (one entry per month
 * 0..keep, each carrying cumulative totals per cost category and cash-out)
 * plus an aggregated `total` and category `totals`.
 *
 * The three modes share `TcoBaseInputs` (running-cost knobs) and add their
 * own financing fields. Behavior across modes is value-comparable: the same
 * vehicle/keep/locale produces meaningfully different numbers per tab — that
 * cross-mode comparison is the app's whole point.
 */
export function tcoBreakdown(input: TcoInputs): CostBreakdown {
  if (input.tab === 'lease') return leaseTco(input);
  if (input.tab === 'finance') return financeTco(input);
  return cashTco(input);
}

/** Total TCO ÷ months kept. The cross-mode apples-to-apples KPI. */
export function effectiveMonthly(breakdown: CostBreakdown, keepDurationYears: number): number {
  const months = Math.max(Math.round(keepDurationYears * 12), 1);
  return breakdown.total / months;
}

/** Total TCO ÷ total distance driven over keep. Returns 0 if distance is 0. */
export function costPerDistance(
  breakdown: CostBreakdown,
  annualMileage: number,
  keepDurationYears: number,
): number {
  const distance = annualMileage * keepDurationYears;
  return distance > 0 ? breakdown.total / distance : 0;
}
