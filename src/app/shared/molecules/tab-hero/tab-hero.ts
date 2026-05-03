import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { financePayment } from '../../../scenario/calculations/financing';
import { fuelCostOverYears } from '../../../scenario/calculations/fuel';

interface HeroSlot {
  label: string;
  value: string;
  accent?: boolean;
  subtitle?: string;
}

@Component({
  selector: 'app-tab-hero',
  template: `
    <div
      class="hero-card border border-[rgba(79,142,247,0.18)] rounded-2xl px-[34px] pt-[24px] pb-[22px] relative overflow-hidden [background:linear-gradient(140deg,#0c1a30_0%,#08101f_100%)]"
    >
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-y-5 sm:gap-x-6 mb-[14px] relative z-[1]">
        @for (slot of slots(); track slot.label; let i = $index) {
          <div [class]="slotWrapperClass(i)">
            <div [class]="slotLabelClass(slot.accent)">{{ slot.label }}</div>
            <div class="flex items-baseline gap-[4px]">
              <span class="font-mono text-[1.1rem] font-medium text-tx-muted leading-none">{{
                currencySymbol()
              }}</span>
              <span
                class="font-mono text-[2rem] font-medium text-tx leading-none tracking-[-0.02em]"
                >{{ slot.value }}</span
              >
            </div>
            @if (slot.subtitle) {
              <div class="font-ui text-[0.62rem] text-tx-dim leading-snug mt-[2px]">
                {{ slot.subtitle }}
              </div>
            }
          </div>
        }
      </div>
      <div
        class="font-ui text-[0.65rem] text-tx-dim tracking-[0.07em] uppercase relative z-[1] flex flex-wrap gap-x-3"
      >
        @for (chip of caption(); track chip; let last = $last) {
          <span>{{ chip }}</span>
          @if (!last) {
            <span>·</span>
          }
        }
      </div>
    </div>
  `,
})
export class TabHero {
  protected readonly store = inject(ScenarioStore);

  protected readonly currencySymbol = computed(() => this.store.localeConfig().currencySymbol);

  private readonly months = computed(() => Math.max(this.store.keepDuration() * 12, 1));

  private readonly annualFuel = computed(() =>
    fuelCostOverYears({
      efficiency: this.store.fuelEfficiency(),
      fuelPrice: this.store.fuelPrice(),
      annualMileage: this.store.annualMileage(),
      years: 1,
      powertrain: this.store.powertrain(),
      locale: this.store.locale(),
    }),
  );

  /** Cash-tab special case: opportunity cost is on the FULL purchase price. */
  private readonly monthlyOppCost = computed(() => {
    const principal =
      this.store.activeTab() === 'cash'
        ? this.store.purchasePrice()
        : this.store.activeDownPayment();
    return (principal * this.store.opportunityCostRate()) / 12;
  });

  private readonly monthlyVehicleCosts = computed(
    () => (this.store.insurance() + this.store.maintenance() + this.annualFuel()) / 12,
  );
  private readonly monthlyRunningCosts = computed(
    () => this.monthlyVehicleCosts() + this.monthlyOppCost(),
  );

  /** Subtitle for the running-costs slot — splits insurance/maint/fuel from
   * the opportunity-cost share so the user can see what's "real" outflow vs.
   * forgone investment return. */
  private readonly runningCostsSubtitle = computed(() => {
    const sym = this.currencySymbol();
    return `${sym}${this.fmt2(this.monthlyVehicleCosts())} vehicle · ${sym}${this.fmt2(this.monthlyOppCost())} opportunity`;
  });

  private readonly category = computed(() => {
    const c = this.store.vehicleCategory();
    return c.charAt(0).toUpperCase() + c.slice(1);
  });

  protected readonly slots = computed<HeroSlot[]>(() => {
    const tab = this.store.activeTab();
    if (tab === 'lease') {
      return [
        { label: 'Initial down payment', value: this.fmtInt(this.store.leaseDownPayment()) },
        {
          label: 'Monthly lease payment',
          value: this.fmt2(this.store.leasePaymentDetails().monthlyPayment),
          accent: true,
        },
        {
          label: 'Monthly running costs',
          value: this.fmt2(this.monthlyRunningCosts()),
          subtitle: this.runningCostsSubtitle(),
        },
      ];
    }
    if (tab === 'finance') {
      const principal = Math.max(
        this.store.purchasePrice() - this.store.financeDownPayment(),
        0,
      );
      const loanMonths = Math.max(this.store.loanTerm(), 1);
      const monthly = financePayment({
        principal,
        apr: this.store.financeApr(),
        termMonths: this.store.loanTerm(),
      });
      // Each loan payment splits between equity (principal → builds car
      // ownership) and interest (cost of borrowing). Average across the loan.
      const avgEquity = principal / loanMonths;
      const avgInterest = Math.max(monthly - avgEquity, 0);
      const sym = this.currencySymbol();
      return [
        { label: 'Initial down payment', value: this.fmtInt(this.store.financeDownPayment()) },
        {
          label: 'Monthly loan payment',
          value: this.fmt2(monthly),
          accent: true,
          subtitle: `${sym}${this.fmt2(avgEquity)} builds equity · ${sym}${this.fmt2(avgInterest)} interest`,
        },
        {
          label: 'Monthly running costs',
          value: this.fmt2(this.monthlyRunningCosts()),
          subtitle: this.runningCostsSubtitle(),
        },
      ];
    }
    // cash
    const totalDepreciation = Math.max(
      this.store.purchasePrice() - this.store.residualValue(),
      0,
    );
    const monthlyDepreciation = totalDepreciation / this.months();
    return [
      { label: 'Cash outlay', value: this.fmtInt(this.store.purchasePrice()) },
      {
        label: 'Monthly depreciation',
        value: this.fmt2(monthlyDepreciation),
        accent: true,
      },
      { label: 'Monthly running costs', value: this.fmt2(this.monthlyRunningCosts()) },
    ];
  });

  protected readonly caption = computed<string[]>(() => {
    const tab = this.store.activeTab();
    if (tab === 'lease') {
      const apr = this.store.leaseApr();
      const rate =
        this.store.locale() === 'EU' ? (apr / 24).toFixed(3) : (apr / 2400).toFixed(5);
      return [
        `${this.store.leaseTerm()}-month lease`,
        `${this.store.localeConfig().leaseRateLabel} ${rate}`,
        `${this.category()} category`,
      ];
    }
    if (tab === 'finance') {
      return [
        `${this.store.loanTerm()}-month loan`,
        `APR ${this.store.financeApr().toFixed(2)}%`,
        `${this.category()} category`,
      ];
    }
    return [
      `${this.store.keepDuration()}-yr ownership`,
      `Opp. cost ${(this.store.opportunityCostRate() * 100).toFixed(1)}%`,
      `${this.category()} category`,
    ];
  });

  protected slotWrapperClass(index: number): string {
    const middle =
      'sm:border-l sm:border-r sm:border-[rgba(79,142,247,0.18)] sm:px-6';
    return `flex flex-col gap-[6px]${index === 1 ? ' ' + middle : ''}`;
  }

  protected slotLabelClass(accent: boolean | undefined): string {
    const base = 'font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase';
    return `${base} ${accent ? 'text-accent' : 'text-tx-dim'}`;
  }

  private fmtInt(v: number): string {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  private fmt2(v: number): string {
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}