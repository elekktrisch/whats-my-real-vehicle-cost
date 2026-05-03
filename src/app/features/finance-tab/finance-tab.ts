import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';

@Component({
  selector: 'app-finance-tab',
  imports: [SliderControl, SliderGroup],
  template: `
    <div class="flex flex-col gap-[14px]">
      <app-slider-group title="Loan financing">
        <app-slider-control
          label="APR"
          tip="Annual percentage rate on the auto loan. Typical new-car rates are 5–8% in 2026."
          [min]="0"
          [max]="20"
          [step]="0.05"
          minLabel="0%"
          maxLabel="20%"
          suffix="%"
          [fractionDigits]="2"
          [value]="store.financeApr()"
          (valueChange)="store.financeApr.set($event)"
        />
        <app-slider-control
          label="Loan term"
          tip="How long you finance the car. Common terms are 36, 48, 60 or 72 months. Longer terms drop the monthly payment but raise total interest."
          [min]="12"
          [max]="84"
          [step]="1"
          minLabel="12 mo"
          maxLabel="84 mo"
          suffix=" mo"
          [value]="store.loanTerm()"
          (valueChange)="store.loanTerm.set($event)"
        />
        <app-slider-control
          label="Opportunity cost rate"
          tip="What you'd earn per year if you invested the down payment instead of putting it into the car. Adds downPayment × rate ÷ 12 to the monthly running costs in the hero card."
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
    </div>
  `,
})
export class FinanceTab {
  protected readonly store = inject(ScenarioStore);
}