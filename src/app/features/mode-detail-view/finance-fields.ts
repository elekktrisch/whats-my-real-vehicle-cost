import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';

/**
 * Finance-specific controls. Opportunity-cost rate moved to globals (it's
 * cross-mode in the redesign). Down payment lives in the global vehicle
 * context block since the user can edit it for whichever tab is active.
 */
@Component({
  selector: 'app-finance-fields',
  imports: [SliderControl, SliderGroup],
  template: `
    <div class="flex flex-col gap-[14px]" role="tabpanel" id="modepanel-finance" aria-labelledby="modetab-finance">
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
      </app-slider-group>
    </div>
  `,
})
export class FinanceFields {
  protected readonly store = inject(ScenarioStore);
}