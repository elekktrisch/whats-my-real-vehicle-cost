import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-finance-fields',
  imports: [SliderControl, SliderGroup, MoneyPipe, TranslocoPipe],
  template: `
    <div class="flex flex-col gap-[14px]" role="tabpanel" id="modepanel-finance" aria-labelledby="modetab-finance">
      <app-slider-group [title]="'finance.fields.groupTitle' | transloco">
        <app-slider-control
          [label]="'finance.fields.apr.label' | transloco"
          [tip]="'finance.fields.apr.tip' | transloco"
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
          [label]="'finance.fields.term.label' | transloco"
          [tip]="'finance.fields.term.tip' | transloco"
          [min]="12"
          [max]="84"
          [step]="1"
          [minLabel]="'units.months' | transloco: { count: 12 }"
          [maxLabel]="'units.months' | transloco: { count: 84 }"
          [suffix]="' ' + ('units.monthsAbbr' | transloco)"
          [value]="store.loanTerm()"
          (valueChange)="store.loanTerm.set($event)"
        />
        <app-slider-control
          [label]="'finance.fields.downPayment.label' | transloco"
          [tip]="'finance.fields.downPayment.tip' | transloco"
          [min]="0"
          [max]="downPaymentMax()"
          [step]="500"
          [minLabel]="0 | money:'compact'"
          [maxLabel]="downPaymentMax() | money:'compact'"
          [prefix]="store.currencyPrefix()"
          [suffix]="store.currencySuffix()"
          [value]="store.financeDownPayment()"
          (valueChange)="store.financeDownPayment.set($event)"
        />
      </app-slider-group>
    </div>
  `,
})
export class FinanceFields {
  protected readonly store = inject(ScenarioStore);

  protected readonly downPaymentMax = computed(() =>
    Math.min(80000, this.store.purchasePrice()),
  );
}
