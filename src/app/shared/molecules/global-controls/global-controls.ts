import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { SliderControl } from '../../slider-control/slider-control';
import { SliderGroup } from '../slider-group/slider-group';
import { Disclosure } from '../disclosure/disclosure';
import { MaintenanceDisplay } from '../maintenance-display/maintenance-display';
import { ConflictPill } from '../conflict-pill/conflict-pill';
import { MoneyPipe } from '../../pipes/money.pipe';

/**
 * Vehicle context — truly global inputs (same value across all financing
 * methods): annual mileage, keep duration, vehicle age. The "+ Show
 * overrides" disclosure adds the power-user knobs: residual, insurance,
 * fuel efficiency, fuel price, maintenance display row.
 *
 * Down payment moved to the per-mode field components (mode-specific value).
 * Opportunity-cost rate moved to `<app-your-situation>` (one-rate-fits-all
 * preference). EV setup also moved to `<app-your-situation>`.
 */
@Component({
  selector: 'app-global-controls',
  imports: [SliderControl, SliderGroup, Disclosure, MaintenanceDisplay, ConflictPill, MoneyPipe],
  template: `
    <app-slider-group title="Vehicle" [caption]="contextCaption()">
      <div class="grid grid-cols-1 gap-x-6 gap-y-1">
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
          label="Keep duration"
          tip="How many years you plan to keep the car. Sets the chart horizon and the recommended financing method."
          [min]="1"
          [max]="15"
          [step]="1"
          minLabel="1 yr"
          maxLabel="15 yr"
          suffix=" yr"
          [value]="store.keepDuration()"
          (valueChange)="store.keepDuration.set($event)"
        />
      </div>

      <app-disclosure label="+ Advanced">
        <div class="grid grid-cols-1 gap-x-6 gap-y-3">
          <div id="slider-residualValue">
            <app-slider-control
              label="Residual value"
              tip="Auto-derived from the depreciation curve at vehicleAge + keepDuration. Override with the residual percentage from your lease contract for an apples-to-apples lease comparison."
              [min]="0"
              [max]="residualMax()"
              [step]="500"
              [minLabel]="0 | money:'compact'"
              [maxLabel]="residualMax() | money:'compact'"
              [prefix]="store.currencyPrefix()"
              [suffix]="store.currencySuffix()"
              [value]="store.residualValue()"
              (valueChange)="store.setResidualValue($event)"
              [isAuto]="store.residualValueOverride() === null"
              (reset)="store.applyResidualValue()"
            />
            @if (store.conflictByKey().get('residualValue'); as c) {
              <app-conflict-pill
                [visible]="true"
                [label]="c.label"
                [proposedValue]="c.proposedValue"
                [currentValue]="c.currentValue"
                [reason]="c.reason"
                (apply)="c.apply()"
                (keep)="c.keep()"
              />
            }
          </div>
          <div id="slider-insurance">
            <app-slider-control
              label="Insurance / yr"
              tip="Annual full-coverage insurance. Defaults to purchase price × 2% (US) or 1.5% (EU), tuned by category. Override with your quote."
              [min]="0"
              [max]="6000"
              [step]="25"
              [minLabel]="0 | money:'compact'"
              [maxLabel]="6000 | money:'compact'"
              [prefix]="store.currencyPrefix()"
              [suffix]="store.currencySuffix()"
              [value]="store.insurance()"
              (valueChange)="store.insuranceOverride.set($event)"
              [isAuto]="store.insuranceOverride() === null"
              (reset)="store.applyInsurance()"
            />
            @if (store.conflictByKey().get('insurance'); as c) {
              <app-conflict-pill
                [visible]="true"
                [label]="c.label"
                [proposedValue]="c.proposedValue"
                [currentValue]="c.currentValue"
                [reason]="c.reason"
                (apply)="c.apply()"
                (keep)="c.keep()"
              />
            }
          </div>
          <div id="slider-fuelEfficiency">
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
              (valueChange)="store.fuelEfficiencyOverride.set($event)"
              [isAuto]="store.fuelEfficiencyOverride() === null"
              (reset)="store.applyFuelEfficiency()"
            />
            @if (store.conflictByKey().get('fuelEfficiency'); as c) {
              <app-conflict-pill
                [visible]="true"
                [label]="c.label"
                [proposedValue]="c.proposedValue"
                [currentValue]="c.currentValue"
                [reason]="c.reason"
                (apply)="c.apply()"
                (keep)="c.keep()"
              />
            }
          </div>
          <div id="slider-fuelPrice">
            <app-slider-control
              [label]="fuelPriceLabel()"
              tip="Per-unit price for fuel or electricity at your locale's typical rate."
              [min]="0"
              [max]="fuelPriceMax()"
              [step]="0.01"
              [fractionDigits]="2"
              [minLabel]="0 | money:2"
              [maxLabel]="fuelPriceMax() | money:2"
              [prefix]="fuelPriceSymbol()"
              [suffix]="fuelPriceSuffix()"
              [value]="store.fuelPrice()"
              (valueChange)="store.fuelPriceOverride.set($event)"
              [isAuto]="store.fuelPriceOverride() === null"
              (reset)="store.applyFuelPrice()"
            />
            @if (store.conflictByKey().get('fuelPrice'); as c) {
              <app-conflict-pill
                [visible]="true"
                [label]="c.label"
                [proposedValue]="c.proposedValue"
                [currentValue]="c.currentValue"
                [reason]="c.reason"
                (apply)="c.apply()"
                (keep)="c.keep()"
              />
            }
          </div>
          <app-maintenance-display />
        </div>
      </app-disclosure>
    </app-slider-group>
  `,
})
export class GlobalControls {
  protected readonly store = inject(ScenarioStore);

  protected readonly distanceSuffix = computed(
    () => ' ' + this.store.localeConfig().distanceUnit,
  );

  protected readonly residualMax = computed(() =>
    Math.min(100000, this.store.purchasePrice()),
  );

  protected readonly contextCaption = computed(() => {
    const cfg = this.store.localeConfig();
    const formatted = Math.round(this.store.msrp()).toLocaleString();
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

  protected distance(value: number): string {
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return `${k} ${this.store.localeConfig().distanceUnit}`;
  }
}
