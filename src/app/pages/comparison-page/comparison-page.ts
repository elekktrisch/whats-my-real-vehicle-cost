import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { NumberInput } from '../../shared/atoms/number-input/number-input';
import { LocaleSelector } from '../../shared/molecules/locale-selector/locale-selector';
import { PowertrainSelector } from '../../shared/molecules/powertrain-selector/powertrain-selector';
import { BasicAdvancedToggle } from '../../shared/molecules/basic-advanced-toggle/basic-advanced-toggle';
import {
  ComparisonStrip,
  ModeCardData,
} from '../../shared/molecules/comparison-strip/comparison-strip';
import { ModeDetailView } from '../../features/mode-detail-view/mode-detail-view';
import { formatCurrency } from '../../scenario/locale.config';
import type { CostBreakdown, Tab } from '../../scenario/scenario.types';

const LABEL: Record<Tab, string> = { lease: 'Lease', finance: 'Loan', cash: 'Cash' };

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
    NumberInput,
    LocaleSelector,
    PowertrainSelector,
    BasicAdvancedToggle,
    ComparisonStrip,
    ModeDetailView,
  ],
  template: `
    <div class="max-w-[1200px] mx-auto px-4 sm:px-7 pb-[72px] relative z-[1] overflow-x-clip">
      <header
        class="flex items-center justify-between gap-3 flex-wrap pt-7 pb-[18px] border-b border-border"
      >
        <app-number-input
          [(value)]="store.purchasePrice"
          [min]="5000"
          [max]="150000"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          ariaLabel="Negotiated price"
          size="lg"
        />
        <span
          class="flex-1 min-w-0 text-left font-ui text-lg font-medium tracking-[0.01em] text-tx-muted"
        >
          Negotiated Price
        </span>
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
  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );

  protected readonly recommended = computed(() => this.store.recommendedTab().tab);
  protected readonly recommendationReason = computed(() => this.store.recommendedTab().reason);

  /** Build the three card payloads from the store's per-mode breakdowns. */
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
      // Recommended card shows the Best badge in the top-right; other cards
      // show the per-distance delta in that same corner. Each card has
      // exactly one thing on the right side of the header → equal heights
      // without a "Reference" filler.
      const deltaPerDistance = perDistance - recPerDistance;
      return {
        mode,
        label: LABEL[mode],
        total: formatCurrency(breakdown.total, locale, 0),
        monthly: formatCurrency(monthly, locale, 0),
        perDistance: formatCurrency(perDistance, locale, 2),
        delta: isRecommended
          ? null
          : `+${formatCurrency(deltaPerDistance, locale, 2)} / ${distanceUnit}`,
      };
    });
  });
}
