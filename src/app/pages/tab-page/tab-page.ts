import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { TabStrip } from '../../shared/molecules/tab-strip/tab-strip';
import { VehicleContextBar } from '../../shared/molecules/vehicle-context-bar/vehicle-context-bar';
import { KpiBar, KpiSpec } from '../../shared/molecules/kpi-bar/kpi-bar';
import { Icon } from '../../shared/atoms/icon/icon';
import { LeaseTab } from '../../features/lease-tab/lease-tab';
import { FinanceTab } from '../../features/finance-tab/finance-tab';
import { CashTab } from '../../features/cash-tab/cash-tab';
import { TcoChartDesktop } from '../../features/chart/tco-chart-desktop/tco-chart-desktop';
import { formatCurrency } from '../../scenario/locale.config';

@Component({
  selector: 'app-tab-page',
  imports: [
    TabStrip,
    VehicleContextBar,
    KpiBar,
    Icon,
    LeaseTab,
    FinanceTab,
    CashTab,
    TcoChartDesktop,
  ],
  template: `
    <div class="max-w-[1200px] mx-auto px-7 pb-[72px] relative z-[1]">
      <header
        class="flex items-center justify-between pt-7 pb-[22px] border-b border-border mb-5 gap-3 flex-wrap"
      >
        <div class="flex items-center gap-2.5">
          <app-icon name="logo" [size]="22" ariaLabel="WhatsMyVehicleCost" />
          <span
            class="font-ui text-[1.3rem] font-bold tracking-[0.03em] text-tx"
            >WhatsMyVehicleCost</span
          >
        </div>
        <span
          class="font-ui text-[0.65rem] tracking-[0.12em] uppercase text-tx-dim"
          >Total cost of ownership · {{ recommendedLabel() }}</span
        >
      </header>

      <div class="flex flex-col gap-5">
        <app-vehicle-context-bar />

        <app-tab-strip
          [active]="store.activeTab()"
          (activeChange)="store.activeTab.set($event)"
          [recommended]="store.recommendedTab().tab"
        />

        <app-kpi-bar [kpis]="kpis()" />

        @switch (store.activeTab()) {
          @case ('lease') {
            <app-lease-tab />
          }
          @case ('finance') {
            <app-finance-tab />
          }
          @case ('cash') {
            <app-cash-tab />
          }
        }

        @if (store.activeTab() === 'lease') {
          <app-tco-chart-desktop [breakdown]="store.leaseBreakdown()" />
        }
      </div>
    </div>
  `,
})
export class TabPage {
  protected readonly store = inject(ScenarioStore);

  protected readonly recommendedLabel = computed(() => {
    const tab = this.store.recommendedTab().tab;
    return tab.charAt(0).toUpperCase() + tab.slice(1) + ' recommended';
  });

  protected readonly kpis = computed<KpiSpec[]>(() => {
    const tab = this.store.activeTab();
    const breakdown =
      tab === 'lease'
        ? this.store.leaseBreakdown()
        : tab === 'finance'
          ? this.store.financeBreakdown()
          : this.store.cashBreakdown();
    const months = Math.max(Math.round(this.store.keepDuration() * 12), 1);
    const total = breakdown.total;
    const monthly = total / months;
    const distance = this.store.annualMileage() * this.store.keepDuration();
    const perDistance = distance > 0 ? total / distance : 0;
    const locale = this.store.locale();
    const distanceUnit = this.store.localeConfig().distanceUnit;
    const years = this.store.keepDuration();
    return [
      {
        label: `Total cost over ${years} yr`,
        tip: 'Headline TCO. The full cost layered across financing, fuel, insurance and maintenance.',
        value: formatCurrency(total, locale, 0),
      },
      {
        label: 'Effective / month',
        tip: 'TCO ÷ months. The cross-tab apples-to-apples comparison — what this car really costs you per month.',
        value: formatCurrency(monthly, locale, 0),
      },
      {
        label: `Cost per ${distanceUnit}`,
        tip: 'TCO ÷ total distance. Often more useful than per-month for high-mileage drivers.',
        value: formatCurrency(perDistance, locale, 2),
      },
    ];
  });
}