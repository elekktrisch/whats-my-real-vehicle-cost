import type { Tab } from '../scenario.types';

export interface RecommendationInputs {
  costPerDistance: Record<Tab, number>;
}

export interface Recommendation {
  /** Winning tab — the one with the lowest cost-per-distance. */
  tab: Tab;
  /** Cost-per-distance of the winner. */
  winnerCost: number;
  /** Cost-per-distance of the other two tabs, in lease > finance > cash order. */
  others: ReadonlyArray<{ tab: Tab; cost: number }>;
}

const TABS: readonly Tab[] = ['lease', 'finance', 'cash'];

/**
 * Picks the tab with the lowest cost per distance unit. Returns structured
 * data — UI layer formats the sentence via `transloco.translate(...)`.
 */
export function recommendTab(input: RecommendationInputs): Recommendation {
  const winner = TABS.reduce((best, t) =>
    input.costPerDistance[t] < input.costPerDistance[best] ? t : best,
  );
  const others = TABS.filter((t) => t !== winner).map((t) => ({
    tab: t,
    cost: input.costPerDistance[t],
  }));
  return {
    tab: winner,
    winnerCost: input.costPerDistance[winner],
    others,
  };
}
