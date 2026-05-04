import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { SliderControl } from '../../slider-control/slider-control';
import { SliderGroup } from '../slider-group/slider-group';
import { EvSetup } from '../ev-setup/ev-setup';
import { MaintenanceDisplay } from '../maintenance-display/maintenance-display';

/**
 * Global controls block — what every mode shares. Splits into a basic block
 * (always visible) and an advanced block (gated on `store.basicMode()`).
 *
 *   Basic:    purchase price, down payment (active tab), annual mileage,
 *             keep duration, vehicle age, opportunity-cost rate.
 *   Advanced: residual value override, insurance override, fuel efficiency,
 *             fuel price, EV setup (home charger + solar), maintenance
 *             display row.
 *
 * The split tracks plan §Controls. Maintenance is read-only here — see
 * `app-maintenance-display`. EV setup self-hides for non-EV.
 */
@Component({
  selector: 'app-global-controls',
  imports: [SliderControl, SliderGroup, EvSetup, MaintenanceDisplay],
  template: `
    <div class="flex flex-col gap-[14px]">
      <app-slider-group title="Vehicle context" [caption]="contextCaption()">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <app-slider-control
            label="Purchase price"
            tip="What you'll actually pay (or its negotiated cap cost in a lease). Drives every downstream cost layer."
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
          @if (store.activeTab() !== 'cash') {
            <app-slider-control
              [label]="downPaymentLabel()"
              tip="Cash put down on the active tab's deal. Lease and Finance track this separately so you can compare e.g. $5k down on a lease vs. $0 on a loan. Capped at the purchase price."
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
            tip="How far you drive each year. Drives fuel cost and (combined with keep-duration) lease overage risk."
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
          <app-slider-control
            label="Opportunity cost rate"
            tip="Annual return you'd otherwise earn on the capital tied up in the car. Charged on each tab's down payment (or full price for cash)."
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
        </div>
      </app-slider-group>

      @if (!store.basicMode()) {
        <app-slider-group title="Advanced">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <app-slider-control
              label="Residual value"
              tip="Auto-derived from the depreciation curve at vehicleAge + keepDuration. Override with the residual percentage from your lease contract for an apples-to-apples lease comparison."
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
            <app-slider-control
              label="Insurance / yr"
              tip="Annual full-coverage insurance. Defaults to purchase price × 2% (US) or 1.5% (EU), tuned by category. Override with your quote."
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
        </app-slider-group>
      }
    </div>
  `,
})
export class GlobalControls {
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

  protected readonly downPaymentMax = computed(() =>
    Math.min(80000, this.store.purchasePrice()),
  );
  protected readonly residualMax = computed(() =>
    Math.min(100000, this.store.purchasePrice()),
  );
  protected readonly downPaymentLabel = computed(() =>
    this.store.activeTab() === 'lease' ? 'Down payment (lease)' : 'Down payment (loan)',
  );

  protected readonly contextCaption = computed(() => {
    const msrp = Math.round(this.store.msrp());
    const cfg = this.store.localeConfig();
    const formatted = msrp.toLocaleString();
    const moneyMsrp = cfg.currencyAfter
      ? `${formatted} ${cfg.currencySymbol}`
      : `${cfg.currencySymbol}${formatted}`;
    const cat = this.store.vehicleCategory();
    return `MSRP ${moneyMsrp} · ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
  });

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
  protected readonly fuelPriceMaxLabel = computed(() => {
    const cfg = this.store.localeConfig();
    const v = this.fuelPriceMax().toFixed(2);
    return cfg.currencyAfter ? `${v} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${v}`;
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