import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { SliderControl } from '../../slider-control/slider-control';
import { SliderGroup } from '../slider-group/slider-group';
import { Disclosure } from '../disclosure/disclosure';
import { MaintenanceDisplay } from '../maintenance-display/maintenance-display';
import { MaintenanceCurveEditor } from '../maintenance-curve-editor/maintenance-curve-editor';
import { ConflictPill } from '../conflict-pill/conflict-pill';
import { DepreciationCurveEditor } from '../depreciation-curve-editor/depreciation-curve-editor';
import { MoneyPipe } from '../../pipes/money.pipe';

/**
 * Vehicle context — truly global inputs (same value across all financing
 * methods): annual mileage, keep duration, vehicle age. The "+ Show
 * overrides" disclosure adds the power-user knobs: residual, insurance,
 * fuel efficiency, fuel price, maintenance display row.
 */
@Component({
  selector: 'app-global-controls',
  imports: [
    SliderControl,
    SliderGroup,
    Disclosure,
    MaintenanceDisplay,
    MaintenanceCurveEditor,
    ConflictPill,
    DepreciationCurveEditor,
    MoneyPipe,
    TranslocoPipe,
  ],
  template: `
    <app-slider-group [title]="'globals.groupTitle' | transloco" [caption]="contextCaption()">
      <div class="grid grid-cols-1 gap-x-6 gap-y-1">
        <app-slider-control
          [label]="'globals.annualMileage.label' | transloco"
          [tip]="'globals.annualMileage.tip' | transloco"
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
          [label]="'globals.vehicleAge.label' | transloco"
          [tip]="'globals.vehicleAge.tip' | transloco"
          [min]="0"
          [max]="10"
          [step]="1"
          [minLabel]="'units.years' | transloco: { count: 0 }"
          [maxLabel]="'units.years' | transloco: { count: 10 }"
          [suffix]="' ' + ('units.yearsAbbr' | transloco)"
          [value]="store.vehicleAge()"
          (valueChange)="store.vehicleAge.set($event)"
        />
        <app-slider-control
          [label]="'globals.keepDuration.label' | transloco"
          [tip]="'globals.keepDuration.tip' | transloco"
          [min]="1"
          [max]="15"
          [step]="1"
          [minLabel]="'units.years' | transloco: { count: 1 }"
          [maxLabel]="'units.years' | transloco: { count: 15 }"
          [suffix]="' ' + ('units.yearsAbbr' | transloco)"
          [value]="store.keepDuration()"
          (valueChange)="store.keepDuration.set($event)"
        />
      </div>

      <app-disclosure [label]="'globals.advancedDisclosure' | transloco">
        <div class="grid grid-cols-1 gap-x-6 gap-y-3">
          <div id="slider-residualValue">
            <div class="flex justify-end mb-1">
              <app-depreciation-curve-editor />
            </div>
            <app-slider-control
              [label]="'globals.residualValue.label' | transloco"
              [tip]="'globals.residualValue.tip' | transloco"
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
              [label]="'globals.insurance.label' | transloco"
              [tip]="'globals.insurance.tip' | transloco"
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
              [tip]="'globals.fuelEfficiency.tip' | transloco"
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
              [tip]="'globals.fuelPrice.tip' | transloco"
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
          <div class="flex justify-end mb-1">
            <app-maintenance-curve-editor />
          </div>
          <app-maintenance-display />
        </div>
      </app-disclosure>
    </app-slider-group>
  `,
})
export class GlobalControls {
  protected readonly store = inject(ScenarioStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly distanceSuffix = computed(
    () => ' ' + this.store.regionConfig().distanceUnit,
  );

  protected readonly residualMax = computed(() =>
    Math.min(100000, this.store.purchasePrice()),
  );

  protected readonly contextCaption = computed(() => {
    const lang = this.store.language();
    const cfg = this.store.regionConfig();
    const formatted = Math.round(this.store.msrp()).toLocaleString(this.store.bcp47());
    const moneyMsrp = cfg.currencyAfter
      ? `${formatted} ${cfg.currencySymbol}`
      : `${cfg.currencySymbol}${formatted}`;
    const category = this.transloco.translate(
      `globals.category.${this.store.vehicleCategory()}`,
      {},
      lang,
    );
    return this.transloco.translate('globals.caption', { msrp: moneyMsrp, category }, lang);
  });

  protected readonly fuelEfficiencyUnit = computed(() => {
    const cfg = this.store.regionConfig();
    return this.store.powertrain() === 'EV' ? cfg.evEfficiencyUnit : cfg.iceEfficiencyUnit;
  });
  protected readonly fuelEfficiencyLabel = computed(() =>
    this.transloco.translate(
      this.store.powertrain() === 'EV'
        ? 'globals.evEfficiency.label'
        : 'globals.fuelEfficiency.label',
      {},
      this.store.language(),
    ),
  );
  protected readonly fuelEfficiencyMin = computed(() => 1);
  protected readonly fuelEfficiencyMax = computed(() => {
    if (this.store.powertrain() === 'EV') return this.store.region() === 'US' ? 6 : 30;
    return this.store.region() === 'US' ? 80 : 15;
  });
  protected readonly fuelEfficiencyMinLabel = computed(() => `1 ${this.fuelEfficiencyUnit()}`);
  protected readonly fuelEfficiencyMaxLabel = computed(
    () => `${this.fuelEfficiencyMax()} ${this.fuelEfficiencyUnit()}`,
  );

  protected readonly fuelPriceLabel = computed(() =>
    this.transloco.translate(
      this.store.powertrain() === 'EV'
        ? 'globals.electricityPrice.label'
        : 'globals.fuelPrice.label',
      {},
      this.store.language(),
    ),
  );
  protected readonly fuelPriceSymbol = computed(() => this.store.regionConfig().currencySymbol);
  protected readonly fuelPriceSuffix = computed(() => {
    if (this.store.powertrain() === 'EV') return ' /kWh';
    return this.store.region() === 'US' ? ' /gal' : ' /L';
  });
  protected readonly fuelPriceMax = computed(() => {
    if (this.store.powertrain() === 'EV') return 1;
    return this.store.region() === 'US' ? 8 : 3;
  });

  protected distance(value: number): string {
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return `${k} ${this.store.regionConfig().distanceUnit}`;
  }
}
