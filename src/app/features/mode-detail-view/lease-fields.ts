import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { LeaseEndSection } from '../../shared/molecules/lease-end-section/lease-end-section';
import { ConflictPill } from '../../shared/molecules/conflict-pill/conflict-pill';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-lease-fields',
  imports: [SliderControl, SliderGroup, LeaseEndSection, ConflictPill, MoneyPipe, TranslocoPipe],
  template: `
    <div role="tabpanel" id="modepanel-lease" aria-labelledby="modetab-lease">
      <app-slider-group [title]="'lease.fields.groupTitle' | transloco">
        <div id="slider-leaseApr">
          <app-slider-control
            [label]="'lease.fields.apr.label' | transloco: { region: store.region() }"
            [tip]="'lease.fields.apr.tip' | transloco"
            [min]="0"
            [max]="20"
            [step]="0.05"
            minLabel="0%"
            maxLabel="20%"
            suffix="%"
            [fractionDigits]="2"
            [value]="store.leaseApr()"
            (valueChange)="store.leaseAprOverride.set($event)"
            [isAuto]="store.leaseAprOverride() === null"
            (reset)="store.applyLeaseApr()"
          />
          @if (store.conflictByKey().get('leaseApr'); as c) {
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
        <app-slider-control
          [label]="'lease.fields.term.label' | transloco"
          [tip]="'lease.fields.term.tip' | transloco"
          [min]="12"
          [max]="84"
          [step]="1"
          [minLabel]="'units.months' | transloco: { count: 12 }"
          [maxLabel]="'units.months' | transloco: { count: 84 }"
          [suffix]="' ' + ('units.monthsAbbr' | transloco)"
          [value]="store.leaseTerm()"
          (valueChange)="store.leaseTerm.set($event)"
        />
        <app-slider-control
          [label]="'lease.fields.downPayment.label' | transloco"
          [tip]="'lease.fields.downPayment.tip' | transloco"
          [min]="0"
          [max]="downPaymentMax()"
          [step]="500"
          [minLabel]="0 | money:'compact'"
          [maxLabel]="downPaymentMax() | money:'compact'"
          [prefix]="store.currencyPrefix()"
          [suffix]="store.currencySuffix()"
          [value]="store.leaseDownPayment()"
          (valueChange)="store.leaseDownPayment.set($event)"
        />

        <app-lease-end-section />
      </app-slider-group>
    </div>
  `,
})
export class LeaseFields {
  protected readonly store = inject(ScenarioStore);

  protected readonly downPaymentMax = computed(() =>
    Math.min(80000, this.store.purchasePrice()),
  );
}
