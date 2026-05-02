import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { LeaseEndSection } from '../../shared/molecules/lease-end-section/lease-end-section';
import { fuelCostOverYears } from '../../scenario/calculations/fuel';

@Component({
  selector: 'app-lease-tab',
  imports: [SliderControl, SliderGroup, LeaseEndSection],
  template: `
    <div class="flex flex-col gap-[14px]">
      <div
        class="hero-card border border-[rgba(79,142,247,0.18)] rounded-2xl px-[34px] pt-[24px] pb-[22px] relative overflow-hidden [background:linear-gradient(140deg,#0c1a30_0%,#08101f_100%)]"
      >
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-y-5 sm:gap-x-6 mb-[14px] relative z-[1]">
          <div class="flex flex-col gap-[6px]">
            <div
              class="font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase text-tx-dim"
            >
              Initial down payment
            </div>
            <div class="flex items-baseline gap-[4px]">
              <span class="font-mono text-[1.1rem] font-medium text-tx-muted leading-none">{{
                currencySymbol()
              }}</span>
              <span
                class="font-mono text-[2rem] font-medium text-tx leading-none tracking-[-0.02em]"
                >{{ downPaymentDisplay() }}</span
              >
            </div>
          </div>

          <div class="flex flex-col gap-[6px] sm:border-l sm:border-r sm:border-[rgba(79,142,247,0.18)] sm:px-6">
            <div
              class="font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase text-accent"
            >
              Monthly lease payment
            </div>
            <div class="flex items-baseline gap-[4px]">
              <span class="font-mono text-[1.1rem] font-medium text-tx-muted leading-none">{{
                currencySymbol()
              }}</span>
              <span
                class="font-mono text-[2rem] font-medium text-tx leading-none tracking-[-0.02em]"
                >{{ monthlyDisplay() }}</span
              >
            </div>
          </div>

          <div class="flex flex-col gap-[6px]">
            <div
              class="font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase text-tx-dim"
            >
              Monthly running costs
            </div>
            <div class="flex items-baseline gap-[4px]">
              <span class="font-mono text-[1.1rem] font-medium text-tx-muted leading-none">{{
                currencySymbol()
              }}</span>
              <span
                class="font-mono text-[2rem] font-medium text-tx leading-none tracking-[-0.02em]"
                >{{ runningCostsDisplay() }}</span
              >
            </div>
          </div>
        </div>
        <div
          class="font-ui text-[0.65rem] text-tx-dim tracking-[0.07em] uppercase relative z-[1] flex flex-wrap gap-x-3"
        >
          <span>{{ store.leaseTerm() }}-month lease</span>
          <span>·</span>
          <span>{{ leaseRateLabel() }} {{ rateDisplay() }}</span>
          <span>·</span>
          <span>{{ category() }} category</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-[14px] items-start">
        <app-slider-group title="Lease financing">
          <app-slider-control
            label="APR"
            tip="The annual percentage rate (Effektiver Jahreszins in EU). Internally we convert to a money factor. US contracts charge interest on the average of cap + residual; EU contracts charge interest on the financed amount only — same APR, different finance-fee math."
            [min]="0"
            [max]="20"
            [step]="0.05"
            minLabel="0%"
            maxLabel="20%"
            suffix="%"
            [fractionDigits]="2"
            [value]="store.leaseApr()"
            (valueChange)="store.leaseApr.set($event)"
          />
          <app-slider-control
            label="Lease term"
            tip="How long the lease runs. Common terms are 24, 36, 48, or 60 months."
            [min]="12"
            [max]="84"
            [step]="1"
            minLabel="12 mo"
            maxLabel="84 mo"
            suffix=" mo"
            [value]="store.leaseTerm()"
            (valueChange)="store.leaseTerm.set($event)"
          />
          <app-slider-control
            label="Opportunity cost rate"
            tip="What you'd earn per year if you invested the down payment instead of parking it in the lease. Adds downPayment × rate ÷ 12 to the monthly running costs above."
            [min]="0"
            [max]="15"
            [step]="0.25"
            minLabel="0%"
            maxLabel="15%"
            suffix="%"
            [fractionDigits]="2"
            [value]="store.opportunityCostRate() * 100"
            (valueChange)="store.opportunityCostRate.set($event / 100)"
          />
        </app-slider-group>

        <app-lease-end-section />
      </div>
    </div>
  `,
})
export class LeaseTab {
  protected readonly store = inject(ScenarioStore);

  protected readonly currencySymbol = computed(() => this.store.localeConfig().currencySymbol);
  protected readonly leaseRateLabel = computed(() => this.store.localeConfig().leaseRateLabel);
  protected readonly rateDisplay = computed(() => {
    const apr = this.store.leaseApr();
    if (this.store.locale() === 'EU') return (apr / 24).toFixed(3);
    return (apr / 2400).toFixed(5);
  });
  protected readonly monthlyDisplay = computed(() =>
    this.store.leasePaymentDetails().monthlyPayment.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  protected readonly downPaymentDisplay = computed(() =>
    this.store.downPayment().toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }),
  );
  protected readonly runningCostsDisplay = computed(() => {
    const annualFuel = fuelCostOverYears({
      efficiency: this.store.fuelEfficiency(),
      fuelPrice: this.store.fuelPrice(),
      annualMileage: this.store.annualMileage(),
      years: 1,
      powertrain: this.store.powertrain(),
      locale: this.store.locale(),
    });
    const annualOpportunity = this.store.downPayment() * this.store.opportunityCostRate();
    const monthly =
      (this.store.insurance() + this.store.maintenance() + annualFuel + annualOpportunity) / 12;
    return monthly.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  });
  protected readonly category = computed(() => {
    const c = this.store.vehicleCategory();
    return c.charAt(0).toUpperCase() + c.slice(1);
  });
}