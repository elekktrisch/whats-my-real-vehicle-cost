import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { LeaseEndSection } from '../../shared/molecules/lease-end-section/lease-end-section';
import { ConflictPill } from '../../shared/molecules/conflict-pill/conflict-pill';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-lease-fields',
  imports: [SliderControl, SliderGroup, LeaseEndSection, ConflictPill, MoneyPipe],
  template: `
    <div role="tabpanel" id="modepanel-lease" aria-labelledby="modetab-lease">
      <app-slider-group title="Lease financing">
        <div id="slider-leaseApr">
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
          label="Down payment"
          tip="Cash put down on the lease. Stored separately from the loan down payment so you can compare e.g. $5k down on a lease vs. $0 on a loan. Capped at the purchase price."
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
