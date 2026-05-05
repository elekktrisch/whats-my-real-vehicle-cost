import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { TcoChart } from '../chart/tco-chart/tco-chart';
import { GlobalControls } from '../../shared/molecules/global-controls/global-controls';
import { YourSituation } from '../../shared/molecules/your-situation/your-situation';
import { LeaseFields } from './lease-fields';
import { FinanceFields } from './finance-fields';
import { CashFields } from './cash-fields';

@Component({
  selector: 'app-mode-detail-view',
  imports: [
    TcoChart,
    GlobalControls,
    YourSituation,
    LeaseFields,
    FinanceFields,
    CashFields,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <button
        type="button"
        (click)="scrollToLevers()"
        aria-label="Scroll past the chart to the controls"
        class="self-center flex flex-col items-center justify-center py-2 text-accent/60 hover:text-accent transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-[8px]"
      >
        <svg
          viewBox="0 0 56 56"
          width="56"
          height="56"
          fill="none"
          stroke="currentColor"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="scroll-hint-arrow"
          aria-hidden="true"
        >
          <path d="M28 8v36 M14 32l14 14 14-14" />
        </svg>
        <span class="font-ui text-[0.72rem] tracking-[0.18em] uppercase text-tx-dim mt-1">
          Tweak the levers
        </span>
      </button>

      <app-tco-chart [breakdown]="activeBreakdown()" />

      <!-- scroll-mt keeps the click-to-scroll target from tucking under the sticky region. -->
      <div id="mode-fields-section" class="scroll-mt-[260px] sm:scroll-mt-[300px]">
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
      </div>

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

  protected scrollToLevers(): void {
    if (typeof document === 'undefined') return;
    document
      .getElementById('mode-fields-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}