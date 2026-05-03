import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';

@Component({
  selector: 'app-cash-tab',
  imports: [SliderControl, SliderGroup],
  template: `
    <div class="flex flex-col gap-[14px]">
      <app-slider-group title="Cash purchase">
        <app-slider-control
          label="Opportunity cost rate"
          tip="What you'd earn per year if you invested the cash instead of buying the car outright. Applied to the FULL purchase price (not just a down payment) since cash purchase ties up all of it."
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
export class CashTab {
  protected readonly store = inject(ScenarioStore);
}