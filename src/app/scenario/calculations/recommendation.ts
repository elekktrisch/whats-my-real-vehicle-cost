import { formatCurrency } from '../locale.config';
import type { Locale, Tab } from '../scenario.types';

export interface RecommendationInputs {
  costPerDistance: Record<Tab, number>;
  locale: Locale;
  distanceUnit: 'mi' | 'km';
}

export interface Recommendation {
  tab: Tab;
  reason: string;
}

const TABS: readonly Tab[] = ['lease', 'finance', 'cash'];
const LABEL: Record<Tab, string> = { lease: 'Lease', finance: 'Loan', cash: 'Cash' };

/**
 * Picks the tab with the lowest cost per distance unit. Reactive — every input
 * change to any tab's breakdown re-runs this and the wizard updates live.
 */
export function recommendTab(input: RecommendationInputs): Recommendation {
  const winner = TABS.reduce((best, t) =>
    input.costPerDistance[t] < input.costPerDistance[best] ? t : best,
  );
  const fmt = (v: number) => formatCurrency(v, input.locale, 2);
  const others = TABS.filter((t) => t !== winner)
    .map((t) => `${LABEL[t]} ${fmt(input.costPerDistance[t])}`)
    .join(', ');
  return {
    tab: winner,
    reason: `${LABEL[winner]} has the lowest cost per ${input.distanceUnit} at ${fmt(
      input.costPerDistance[winner],
    )}/${input.distanceUnit} — vs ${others}.`,
  };
}