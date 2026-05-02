import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import { SliderControl } from '../../slider-control/slider-control';
import type { Locale, Powertrain } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-vehicle-context-bar',
  imports: [Toggle, SliderControl],
  template: `
    <section
      class="bg-surface border border-border rounded-[14px] p-[22px] flex flex-col gap-[18px]"
    >
      <header class="flex items-center justify-between gap-3 flex-wrap">
        <div class="font-ui text-[0.62rem] font-medium tracking-[0.15em] uppercase text-tx-dim">
          Vehicle context
        </div>
        <div class="flex items-center gap-2">
          <app-toggle
            [options]="localeOptions"
            [value]="locale()"
            (valueChange)="setLocale($event)"
            ariaLabel="Locale"
          />
          <app-toggle
            [options]="powertrainOptions"
            [value]="powertrain()"
            (valueChange)="setPowertrain($event)"
            ariaLabel="Powertrain"
          />
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
          tip="What the car is worth at the end of your keep-duration. Sets the lease residual and the depreciation curve."
          [min]="0"
          [max]="100000"
          [step]="500"
          [minLabel]="lo(0)"
          [maxLabel]="lo(100000)"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.residualValue()"
          (valueChange)="store.residualValue.set($event)"
        />
        <app-slider-control
          label="Down payment / cash on hand"
          tip="Cash you'll put down or have available. ≥ 80% of price recommends Cash; smaller amounts adjust lease/finance math."
          [min]="0"
          [max]="80000"
          [step]="500"
          [minLabel]="lo(0)"
          [maxLabel]="lo(80000)"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.downPayment()"
          (valueChange)="store.downPayment.set($event)"
        />
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
          [max]="10"
          [step]="1"
          minLabel="1 yr"
          maxLabel="10 yr"
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

  protected readonly locale = this.store.locale;
  protected readonly powertrain = this.store.powertrain;

  protected readonly localeOptions = [
    { value: 'US', label: 'US' },
    { value: 'EU', label: 'EU' },
  ] as const;

  protected readonly powertrainOptions = [
    { value: 'ICE', label: 'ICE' },
    { value: 'EV', label: 'EV' },
  ] as const;

  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );
  protected readonly distanceSuffix = computed(
    () => ' ' + this.store.localeConfig().distanceUnit,
  );

  protected lo(value: number): string {
    const cfg = this.store.localeConfig();
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return cfg.currencyAfter ? `${k} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${k}`;
  }

  protected distance(value: number): string {
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return `${k} ${this.store.localeConfig().distanceUnit}`;
  }

  protected setLocale(v: string): void {
    this.store.locale.set(v as Locale);
  }
  protected setPowertrain(v: string): void {
    this.store.powertrain.set(v as Powertrain);
  }
}