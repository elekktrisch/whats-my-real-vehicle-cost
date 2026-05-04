import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { TcoChart } from '../chart/tco-chart/tco-chart';
import { GlobalControls } from '../../shared/molecules/global-controls/global-controls';
import { HeroSummary } from '../../shared/molecules/hero-summary/hero-summary';
import { YourSituation } from '../../shared/molecules/your-situation/your-situation';
import { LeaseFields } from './lease-fields';
import { FinanceFields } from './finance-fields';
import { CashFields } from './cash-fields';

/**
 * Everything below the comparison strip. Lays out (per Phase plan §Q3=B
 * + §Q9d):
 *
 *   chart  →  mode-fields  →  Vehicle  →  Your situation
 *
 * Per-mode fields carry `role="tabpanel"` semantics (one mounted at a time
 * via `@switch`). Vehicle owns the always-global inputs (mileage, keep,
 * age + override disclosure). Your situation owns personal preferences
 * (opp-cost preset + EV charger + solar).
 */
@Component({
  selector: 'app-mode-detail-view',
  imports: [
    TcoChart,
    HeroSummary,
    GlobalControls,
    YourSituation,
    LeaseFields,
    FinanceFields,
    CashFields,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <app-hero-summary />
      <app-tco-chart [breakdown]="activeBreakdown()" />

      @switch (store.activeTab()) {
        @case ('lease') {
          <app-lease-fields />
        }
        @case ('finance') {
          <app-finance-fields />
        }
        @case ('cash') {
          <app-cash-fields />
        }
      }

      <app-global-controls />
      <app-your-situation />
    </div>
  `,
})
export class ModeDetailView {
  protected readonly store = inject(ScenarioStore);

  protected readonly activeBreakdown = computed(() => {
    const tab = this.store.activeTab();
    if (tab === 'lease') return this.store.leaseBreakdown();
    if (tab === 'finance') return this.store.financeBreakdown();
    return this.store.cashBreakdown();
  });
}