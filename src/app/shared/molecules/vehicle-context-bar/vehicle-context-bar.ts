import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { SliderControl } from '../../slider-control/slider-control';

@Component({
  selector: 'app-vehicle-context-bar',
  imports: [SliderControl],
  template: `
    <section
      class="bg-surface border border-border rounded-[14px] p-[22px] flex flex-col gap-[18px]"
    >
      <header class="flex items-center justify-between gap-3 flex-wrap">
        <div class="font-ui text-[0.62rem] font-medium tracking-[0.15em] uppercase text-tx-dim">
          Vehicle context
        </div>
        <div
          class="font-mono text-[0.62rem] tracking-[0.05em] text-tx-muted normal-case"
        >
          MSRP {{ msrpDisplay() }} · {{ category() }}
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <app-slider-control
          label="Purchase price"
          tip="What you'll actually pay for the car (or its negotiated cap cost in a lease). Drives all downstream cost layers."
          [min]="5000"
          [max]="150000"
          [step]="500"
          [minLabel]="lo(5000)"
          [maxLabel]="lo(150000)"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.purchasePrice()"
          (valueChange)="store.purchasePrice.set($event)"
        />
        <app-slider-control
          label="Residual value"
          tip="Auto-derived from the depreciation curve at age + keep-duration; updates whenever those inputs change. Move the slider to override (resale value at end of keep). Note: the lease tab uses this as the contracted lease-end residual — those are different points in time, so for an accurate lease comparison override this to the figure printed in your lease contract (typically expressed as a percentage of MSRP)."
          [min]="0"
          [max]="residualMax()"
          [step]="500"
          [minLabel]="lo(0)"
          [maxLabel]="lo(residualMax())"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.residualValue()"
          (valueChange)="store.setResidualValue($event)"
        />
        @if (store.activeTab() !== 'cash') {
          <app-slider-control
            [label]="downPaymentLabel()"
            tip="Cash you'll put down toward the active tab's deal. Lease and Finance track this separately so you can compare e.g. $5k down on a lease vs. $0 down on a loan. Capped at the purchase price."
            [min]="0"
            [max]="downPaymentMax()"
            [step]="500"
            [minLabel]="lo(0)"
            [maxLabel]="lo(downPaymentMax())"
            [prefix]="currencyPrefix()"
            [suffix]="currencySuffix()"
            [value]="store.activeDownPayment()"
            (valueChange)="store.setActiveDownPayment($event)"
          />
        }
        <app-slider-control
          label="Annual mileage"
          tip="How far you drive each year. Drives fuel cost and (combined with keep-duration) the lease overage risk."
          [min]="2000"
          [max]="40000"
          [step]="500"
          [minLabel]="distance(2000)"
          [maxLabel]="distance(40000)"
          [suffix]="distanceSuffix()"
          [value]="store.annualMileage()"
          (valueChange)="store.annualMileage.set($event)"
        />
        <app-slider-control
          label="Keep duration"
          tip="How many years you plan to keep the car. Sets the chart horizon and tab recommendation."
          [min]="1"
          [max]="15"
          [step]="1"
          minLabel="1 yr"
          maxLabel="15 yr"
          suffix=" yr"
          [value]="store.keepDuration()"
          (valueChange)="store.keepDuration.set($event)"
        />
        <app-slider-control
          label="Vehicle age"
          tip="0 means new. For used cars we back-derive the original MSRP from this and the purchase price."
          [min]="0"
          [max]="10"
          [step]="1"
          minLabel="0 yr"
          maxLabel="10 yr"
          suffix=" yr"
          [value]="store.vehicleAge()"
          (valueChange)="store.vehicleAge.set($event)"
        />
      </div>
    </section>
  `,
})
export class VehicleContextBar {
  protected readonly store = inject(ScenarioStore);

  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );
  protected readonly distanceSuffix = computed(
    () => ' ' + this.store.localeConfig().distanceUnit,
  );

  protected readonly downPaymentMax = computed(() => Math.min(80000, this.store.purchasePrice()));
  protected readonly residualMax = computed(() => Math.min(100000, this.store.purchasePrice()));
  protected readonly downPaymentLabel = computed(() =>
    this.store.activeTab() === 'lease' ? 'Down payment (lease)' : 'Down payment (loan)',
  );

  protected readonly msrpDisplay = computed(() => {
    const msrp = Math.round(this.store.msrp());
    const cfg = this.store.localeConfig();
    const formatted = msrp.toLocaleString();
    return cfg.currencyAfter ? `${formatted} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${formatted}`;
  });

  protected readonly category = computed(() => {
    const c = this.store.vehicleCategory();
    return c.charAt(0).toUpperCase() + c.slice(1);
  });

  protected lo(value: number): string {
    const cfg = this.store.localeConfig();
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return cfg.currencyAfter ? `${k} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${k}`;
  }

  protected distance(value: number): string {
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return `${k} ${this.store.localeConfig().distanceUnit}`;
  }
}