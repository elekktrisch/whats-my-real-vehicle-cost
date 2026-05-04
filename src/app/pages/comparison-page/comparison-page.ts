import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { Icon } from '../../shared/atoms/icon/icon';
import { LocaleSelector } from '../../shared/molecules/locale-selector/locale-selector';
import { PowertrainSelector } from '../../shared/molecules/powertrain-selector/powertrain-selector';
import { BasicAdvancedToggle } from '../../shared/molecules/basic-advanced-toggle/basic-advanced-toggle';
import {
  ComparisonStrip,
  ModeCardData,
} from '../../shared/molecules/comparison-strip/comparison-strip';
import { ModeDetailView } from '../../features/mode-detail-view/mode-detail-view';
import { formatCurrency } from '../../scenario/locale.config';
import type {
  CostBreakdown,
  CostCategory,
  MonthlyTcoPoint,
  Tab,
} from '../../scenario/scenario.types';

const COST_KEYS: readonly CostCategory[] = [
  'depreciationOrLease',
  'financing',
  'fuel',
  'insurance',
  'maintenance',
  'leaseEnd',
];
const LABEL: Record<Tab, string> = { lease: 'Lease', finance: 'Finance', cash: 'Cash' };

/** Pure: cumulative TCO per month for the sparkline. */
function cumulativeTotals(series: readonly MonthlyTcoPoint[]): number[] {
  const out = new Array<number>(series.length);
  for (let i = 0; i < series.length; i++) {
    let sum = 0;
    for (const k of COST_KEYS) sum += series[i][k];
    out[i] = sum;
  }
  return out;
}

/**
 * The new comparison-first shell. Layout per plan §Page shape (order O1):
 *
 *   header  →  comparison-strip (sticky)  →  recommendation line
 *           →  mode-detail-view (chart  →  mode fields  →  globals)
 *
 * Header (logo + locale + powertrain + basic/advanced toggle) intentionally
 * scrolls away — only the strip stays sticky. Phase E will swap routes so
 * `/` lands here (currently still routed via `/lease | /finance | /cash`).
 */
@Component({
  selector: 'app-comparison-page',
  imports: [
    Icon,
    LocaleSelector,
    PowertrainSelector,
    BasicAdvancedToggle,
    ComparisonStrip,
    ModeDetailView,
  ],
  template: `
    <div class="max-w-[1200px] mx-auto px-7 pb-[72px] relative z-[1]">
      <header
        class="flex items-center justify-between gap-3 flex-wrap pt-7 pb-[18px] border-b border-border"
      >
        <div class="flex items-center gap-2.5">
          <app-icon name="logo" [size]="22" ariaLabel="WhatsMyVehicleCost" />
          <span class="font-ui text-[1.2rem] font-bold tracking-[0.03em] text-tx">
            WhatsMyVehicleCost
          </span>
          <span
            class="hidden sm:inline-block ml-2 font-mono text-[0.62rem] tracking-[0.1em] uppercase text-tx-dim"
          >
            TCO calculator
          </span>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <app-locale-selector />
          <app-powertrain-selector />
          <app-basic-advanced-toggle />
        </div>
      </header>

      <app-comparison-strip
        [cards]="cards()"
        [active]="store.activeTab()"
        (activeChange)="store.activeTab.set($event)"
        [recommended]="recommended()"
        [sparklineYMax]="sparklineYMax()"
        [distanceUnit]="distanceUnit()"
        [recommendationReason]="recommendationReason()"
      />

      <app-mode-detail-view />
    </div>
  `,
})
export class ComparisonPage {
  protected readonly store = inject(ScenarioStore);

  protected readonly distanceUnit = computed(() => this.store.localeConfig().distanceUnit);

  protected readonly recommended = computed(() => this.store.recommendedTab().tab);
  protected readonly recommendationReason = computed(() => this.store.recommendedTab().reason);

  protected readonly sparklineYMax = computed(() => this.store.sparklineYMax());

  /**
   * Build the three card payloads. Each one's sparkline series is the
   * cumulative TCO per month sampled at every month — the same shape the
   * chart would draw if it summed all bands. Sharing `sparklineYMax` across
   * all three keeps the recommended card's line literally the lowest.
   */
  protected readonly cards = computed<readonly ModeCardData[]>(() => {
    const locale = this.store.locale();
    const distanceUnit = this.distanceUnit();
    const months = Math.max(Math.round(this.store.keepDuration() * 12), 1);
    const distance = this.store.annualMileage() * this.store.keepDuration();
    const rec = this.recommended();

    const entries: { mode: Tab; breakdown: CostBreakdown }[] = [
      { mode: 'lease', breakdown: this.store.leaseBreakdown() },
      { mode: 'finance', breakdown: this.store.financeBreakdown() },
      { mode: 'cash', breakdown: this.store.cashBreakdown() },
    ];
    const perDistanceByMode = new Map(
      entries.map(
        (e) => [e.mode, distance > 0 ? e.breakdown.total / distance : 0] as const,
      ),
    );
    const recPerDistance = perDistanceByMode.get(rec) ?? 0;

    return entries.map(({ mode, breakdown }) => {
      const monthly = breakdown.total / months;
      const perDistance = perDistanceByMode.get(mode) ?? 0;
      const isRecommended = mode === rec;
      // Recommended card shows "Reference" in the same slot so the three
      // cards stay the same height. Other cards show the per-distance delta
      // — cost-per-distance is the cross-mode apples-to-apples figure here.
      const deltaPerDistance = perDistance - recPerDistance;
      return {
        mode,
        label: LABEL[mode],
        total: formatCurrency(breakdown.total, locale, 0),
        monthly: formatCurrency(monthly, locale, 0),
        perDistance: formatCurrency(perDistance, locale, 2),
        delta: isRecommended
          ? 'Reference'
          : `+${formatCurrency(deltaPerDistance, locale, 2)} / ${distanceUnit}`,
        sparklinePoints: cumulativeTotals(breakdown.series),
      };
    });
  });
}