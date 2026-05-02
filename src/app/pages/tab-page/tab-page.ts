import { Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScenarioStore } from '../../scenario/scenario.store';
import { TabStrip } from '../../shared/molecules/tab-strip/tab-strip';
import { HeaderBar } from '../../shared/molecules/header-bar/header-bar';
import { VehicleContextBar } from '../../shared/molecules/vehicle-context-bar/vehicle-context-bar';
import { RunningCostsBar } from '../../shared/molecules/running-costs-bar/running-costs-bar';
import { KpiBar, KpiSpec } from '../../shared/molecules/kpi-bar/kpi-bar';
import { LeaseTab } from '../../features/lease-tab/lease-tab';
import { FinanceTab } from '../../features/finance-tab/finance-tab';
import { CashTab } from '../../features/cash-tab/cash-tab';
import { TcoChartDesktop } from '../../features/chart/tco-chart-desktop/tco-chart-desktop';
import { formatCurrency } from '../../scenario/locale.config';
import type { Tab } from '../../scenario/scenario.types';

@Component({
  selector: 'app-tab-page',
  imports: [
    HeaderBar,
    TabStrip,
    VehicleContextBar,
    RunningCostsBar,
    KpiBar,
    LeaseTab,
    FinanceTab,
    CashTab,
    TcoChartDesktop,
  ],
  template: `
    <div class="max-w-[1200px] mx-auto px-7 pb-[72px] relative z-[1]">
      <app-header-bar />

      <div class="flex flex-col gap-5 mt-5">
        <app-vehicle-context-bar />
        <app-running-costs-bar />

        <app-tab-strip
          [active]="store.activeTab()"
          (activeChange)="onTabChange($event)"
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  constructor() {
    effect(() => {
      const tab = this.routeData()['tab'] as Tab | undefined;
      if (tab && tab !== this.store.activeTab()) {
        this.store.activeTab.set(tab);
      }
    });
  }

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

  protected onTabChange(tab: Tab): void {
    this.router.navigate(['/', tab]);
  }
}