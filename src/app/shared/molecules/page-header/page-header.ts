import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { NumberInput } from '../../atoms/number-input/number-input';
import { LocaleSelector } from '../locale-selector/locale-selector';
import { PowertrainSelector } from '../powertrain-selector/powertrain-selector';

@Component({
  selector: 'app-page-header',
  imports: [NumberInput, LocaleSelector, PowertrainSelector],
  template: `
    <header class="page-header pt-7 pb-[18px] border-b border-border bg-bg">
      <div class="flex flex-row items-center justify-between gap-3">
        <label class="header-input flex flex-row items-center gap-3 min-w-0">
          <span class="hidden sm:inline font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            Negotiated price
          </span>
          <app-number-input
            [(value)]="store.purchasePrice"
            [min]="5000"
            [max]="150000"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            ariaLabel="Negotiated price"
            size="lg"
          />
        </label>
        <div class="flex items-center gap-3">
          <app-locale-selector />
          <app-powertrain-selector />
        </div>
      </div>
    </header>
  `,
})
export class PageHeader {
  protected readonly store = inject(ScenarioStore);
}
