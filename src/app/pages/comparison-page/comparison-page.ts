import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { NumberInput } from '../../shared/atoms/number-input/number-input';
import { LocaleSelector } from '../../shared/molecules/locale-selector/locale-selector';
import { PowertrainSelector } from '../../shared/molecules/powertrain-selector/powertrain-selector';
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
    ComparisonStrip,
    ModeDetailView,
  ],
  template: `
    <div class="max-w-[1200px] mx-auto px-4 sm:px-7 pb-[72px] relative z-[1] overflow-x-clip">
      <!-- Two-row mobile / single-row desktop header.
           Mobile: row 1 = label + price input full-width; row 2 = locale + powertrain.
           Desktop: input on left, label centered, selectors on right (single row). -->
      <header class="pt-7 pb-[18px] border-b border-border">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <label class="header-input flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
              Negotiated price
            </span>
            <app-number-input
              [(value)]="store.purchasePrice"
              [min]="5000"
              [max]="150000"
              [prefix]="currencyPrefix()"
              [suffix]="currencySuffix()"
              ariaLabel="Negotiated price"
              size="lg"
            />
          </label>
          <!-- Mobile: justify-between pushes locale to the far left and
               powertrain to the far right; both at content size, the gap
               between them fills the rest. Row is therefore visually 100%
               wide. Desktop: justify-end groups them on the right. -->
          <div class="flex items-center gap-3 justify-between sm:justify-end">
            <app-locale-selector />
            <app-powertrain-selector />
          </div>
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
          : `+${formatCurrency(deltaPerDistance, locale, 2)}/${distanceUnit}`,
      };
    });
  });
}
