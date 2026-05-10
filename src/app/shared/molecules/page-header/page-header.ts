import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { NumberInput } from '../../atoms/number-input/number-input';
import { RegionSelector } from '../region-selector/region-selector';
import { PowertrainSelector } from '../powertrain-selector/powertrain-selector';

@Component({
  selector: 'app-page-header',
  imports: [NumberInput, RegionSelector, PowertrainSelector, TranslocoPipe],
  template: `
    <header class="page-header border-b border-border">
      <div class="page-header-inner flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        <label class="header-input flex flex-1 flex-row items-center gap-3 min-w-0 sm:mr-32">
          <span class="hidden sm:inline font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim shrink-0">
            {{ 'splash.priceLabel' | transloco }}
          </span>
          <app-number-input
            class="flex-1 min-w-0"
            [(value)]="store.purchasePrice"
            [min]="5000"
            [max]="150000"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [ariaLabel]="'splash.priceLabel' | transloco"
            size="md"
          />
        </label>
        <div class="page-header-toggles flex items-center justify-between gap-3">
          <app-region-selector />
          <app-powertrain-selector />
        </div>
      </div>
    </header>
  `,
})
export class PageHeader {
  protected readonly store = inject(ScenarioStore);
}
