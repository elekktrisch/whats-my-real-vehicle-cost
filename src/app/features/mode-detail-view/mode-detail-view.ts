import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { TcoChartDesktop } from '../chart/tco-chart-desktop/tco-chart-desktop';
import { GlobalControls } from '../../shared/molecules/global-controls/global-controls';
import { LeaseFields } from './lease-fields';
import { FinanceFields } from './finance-fields';
import { CashFields } from './cash-fields';

/**
 * R2 container — everything below the comparison strip. Reads
 * `store.activeTab()`, mounts the matching per-mode field component, and
 * lays out (per plan §Below the strip):
 *
 *   chart  →  mode-specific sliders  →  global controls block.
 *
 * Mode-specific fields are gated via `@switch` so only one DOM tree is
 * mounted at a time; each one carries `role="tabpanel"` semantics. The
 * global block (vehicle context + advanced when not in basic mode) lives
 * here because every mode shares it equally.
 */
@Component({
  selector: 'app-mode-detail-view',
  imports: [TcoChartDesktop, GlobalControls, LeaseFields, FinanceFields, CashFields],
  template: `
    <div class="flex flex-col gap-5">
      <app-tco-chart-desktop [breakdown]="activeBreakdown()" />

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