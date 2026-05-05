import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { NumberInput } from '../../atoms/number-input/number-input';
import { LocaleSelector } from '../locale-selector/locale-selector';
import { PowertrainSelector } from '../powertrain-selector/powertrain-selector';

/**
 * Topmost row on the comparison page: negotiated price + locale + powertrain.
 * Two-row layout on mobile (price row, then selectors row); single row on
 * sm+. The eyebrow over the price input is hidden below sm so the row fits.
 */
@Component({
  selector: 'app-page-header',
  imports: [NumberInput, LocaleSelector, PowertrainSelector],
  template: `
    <header class="pt-7 pb-[18px] border-b border-border">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <label class="header-input flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
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
        <div class="flex items-center gap-3 justify-between sm:justify-end">
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
