import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { LeaseEndSection } from '../../shared/molecules/lease-end-section/lease-end-section';

@Component({
  selector: 'app-lease-tab',
  imports: [SliderControl, SliderGroup, LeaseEndSection],
  template: `
    <div class="flex flex-col gap-[14px]">
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
}