import type { Tab } from './scenario.types';

/** Identifier strings for every retrofitted lever. Keeps tab/global mapping
 * and copy in one place. */
export type ConflictKey =
  | 'leaseApr'
  | 'residualValue'
  | 'insurance'
  | 'fuelEfficiency'
  | 'fuelPrice'
  | 'leaseEndChoice'
  | 'earlyTerminationFee'
  | 'leaseEndResidual';

export type ConflictScope = Tab | 'global';

export const CONFLICT_SCOPE: Record<ConflictKey, ConflictScope> = {
  leaseApr: 'lease',
  residualValue: 'global',
  insurance: 'global',
  fuelEfficiency: 'global',
  fuelPrice: 'global',
  leaseEndChoice: 'lease',
  earlyTerminationFee: 'lease',
  leaseEndResidual: 'lease',
};

export interface ActiveConflict {
  key: ConflictKey;
  scope: ConflictScope;
  /** Short slider-style label (e.g. "Lease APR"). */
  label: string;
  /** 1–2 sentences explaining the rule and what triggered it. */
  reason: string;
  /** Formatted current (override) value. */
  currentValue: string;
  /** Formatted proposed (auto-derived) value. */
  proposedValue: string;
  /** DOM id of the slider this conflict belongs to (for scroll-into-view). */
  sliderAnchor: string;
  /** Clears the override; lever returns to auto-track. */
  apply: () => void;
  /** Marks the conflict dismissed for this (override, default) pair. */
  keep: () => void;
}

/** Counts conflicts that affect a given mode-card's TCO calculation:
 * tab-specific conflicts + every global conflict. */
export function conflictCountForTab(active: readonly ActiveConflict[], tab: Tab): number {
  return active.reduce((sum, c) => {
    if (c.scope === 'global' || c.scope === tab) return sum + 1;
    return sum;
  }, 0);
}