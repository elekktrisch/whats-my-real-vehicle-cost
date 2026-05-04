import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { SliderControl } from '../../slider-control/slider-control';
import { EvSetup } from '../ev-setup/ev-setup';
import { MaintenanceDisplay } from '../maintenance-display/maintenance-display';
import { formatCurrency } from '../../../scenario/locale.config';

@Component({
  selector: 'app-running-costs-bar',
  imports: [SliderControl, EvSetup, MaintenanceDisplay],
  template: `
    <section
      class="bg-surface border border-border rounded-[14px] p-[22px] flex flex-col gap-[18px]"
    >
      <header class="flex items-center justify-between gap-3 flex-wrap">
        <div class="font-ui text-[0.62rem] font-medium tracking-[0.15em] uppercase text-tx-dim">
          Running costs
        </div>
        <div class="font-mono text-[0.62rem] tracking-[0.05em] text-tx-muted">
          ≈ {{ totalAnnual() }} / yr before financing
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <app-slider-control
          label="Insurance / yr"
          tip="Annual full-coverage insurance. Defaults to purchase price × 2% (US) or 1.5% (EU), tuned by vehicle category. Override if you have a quote."
          [min]="0"
          [max]="6000"
          [step]="25"
          minLabel="$0"
          maxLabel="$6k"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.insurance()"
          (valueChange)="store.setOverride('insurance', $event)"
        />
        <app-slider-control
          [label]="fuelEfficiencyLabel()"
          tip="Vehicle efficiency. ICE uses mpg (US) or L/100km (EU). EV uses mi/kWh (US) or kWh/100km (EU)."
          [min]="fuelEfficiencyMin()"
          [max]="fuelEfficiencyMax()"
          [step]="0.1"
          [fractionDigits]="1"
          [minLabel]="fuelEfficiencyMinLabel()"
          [maxLabel]="fuelEfficiencyMaxLabel()"
          [suffix]="' ' + fuelEfficiencyUnit()"
          [value]="store.fuelEfficiency()"
          (valueChange)="store.setOverride('fuelEfficiency', $event)"
        />
        <app-slider-control
          [label]="fuelPriceLabel()"
          tip="Per-unit price for fuel or electricity at your locale's typical rate."
          [min]="0"
          [max]="fuelPriceMax()"
          [step]="0.01"
          [fractionDigits]="2"
          minLabel="$0"
          [maxLabel]="fuelPriceMaxLabel()"
          [prefix]="fuelPriceSymbol()"
          [suffix]="fuelPriceSuffix()"
          [value]="store.fuelPrice()"
          (valueChange)="store.setOverride('fuelPrice', $event)"
        />
        <app-maintenance-display />
        <app-ev-setup />
      </div>
    </section>
  `,
})
export class RunningCostsBar {
  protected readonly store = inject(ScenarioStore);

  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );

  protected readonly fuelEfficiencyUnit = computed(() => {
    const cfg = this.store.localeConfig();
    return this.store.powertrain() === 'EV' ? cfg.evEfficiencyUnit : cfg.iceEfficiencyUnit;
  });
  protected readonly fuelEfficiencyLabel = computed(() =>
    this.store.powertrain() === 'EV' ? 'EV efficiency' : 'Fuel efficiency',
  );
  protected readonly fuelEfficiencyMin = computed(() => 1);
  protected readonly fuelEfficiencyMax = computed(() => {
    if (this.store.powertrain() === 'EV') return this.store.locale() === 'US' ? 6 : 30;
    return this.store.locale() === 'US' ? 80 : 15;
  });
  protected readonly fuelEfficiencyMinLabel = computed(() => `1 ${this.fuelEfficiencyUnit()}`);
  protected readonly fuelEfficiencyMaxLabel = computed(
    () => `${this.fuelEfficiencyMax()} ${this.fuelEfficiencyUnit()}`,
  );

  protected readonly fuelPriceLabel = computed(() =>
    this.store.powertrain() === 'EV' ? 'Electricity price' : 'Fuel price',
  );
  protected readonly fuelPriceSymbol = computed(() => this.store.localeConfig().currencySymbol);
  protected readonly fuelPriceSuffix = computed(() => {
    if (this.store.powertrain() === 'EV') return ' /kWh';
    return this.store.locale() === 'US' ? ' /gal' : ' /L';
  });
  protected readonly fuelPriceMax = computed(() => {
    if (this.store.powertrain() === 'EV') return 1;
    return this.store.locale() === 'US' ? 8 : 3;
  });
  protected readonly fuelPriceMaxLabel = computed(() =>
    formatCurrency(this.fuelPriceMax(), this.store.locale(), 2),
  );

  protected readonly totalAnnual = computed(() => {
    const annual =
      this.store.insurance() +
      this.store.maintenance() +
      this.estimatedFuelAnnual();
    return formatCurrency(annual, this.store.locale(), 0);
  });

  private estimatedFuelAnnual(): number {
    const eff = this.store.fuelEfficiency();
    const price = this.store.fuelPrice();
    const miles = this.store.annualMileage();
    if (eff <= 0) return 0;
    if (this.store.locale() === 'US' && this.store.powertrain() === 'ICE') {
      return (miles / eff) * price;
    }
    if (this.store.locale() === 'US' && this.store.powertrain() === 'EV') {
      return (miles / eff) * price;
    }
    if (this.store.locale() === 'EU' && this.store.powertrain() === 'ICE') {
      return (miles / 100) * eff * price;
    }
    return (miles / 100) * eff * price;
  }
}
