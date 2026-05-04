import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';

/**
 * Loan-specific controls. Down-payment lives here (mode-specific) per Phase
 * plan §Q10a. Opportunity-cost rate is in the Your-situation section.
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
        <app-slider-control
          label="Down payment"
          tip="Cash put down on the loan. Stored separately from the lease down payment so you can compare e.g. $5k down on a lease vs. $0 on a loan. Capped at the purchase price."
          [min]="0"
          [max]="downPaymentMax()"
          [step]="500"
          [minLabel]="lo(0)"
          [maxLabel]="lo(downPaymentMax())"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
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
  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );
  protected lo(value: number): string {
    const cfg = this.store.localeConfig();
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return cfg.currencyAfter ? `${k} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${k}`;
  }
}