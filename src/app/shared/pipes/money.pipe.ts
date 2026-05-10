import { Pipe, PipeTransform, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { formatCompactCurrency, formatCurrency } from '../../scenario/region.config';

// {{ 32000 | money }}            → "$32,000"
// {{ 0.42 | money:2 }}           → "$0.42"
// {{ 32500 | money:'compact' }}  → "$32.5k"
// Impure: output depends on `store.region()`, which can flip without the
// input changing.
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly store = inject(ScenarioStore);

  transform(value: number | null | undefined, mode: number | 'compact' = 0): string {
    if (value == null || !Number.isFinite(value)) return '';
    const ctx = this.store.formatContext();
    if (mode === 'compact') return formatCompactCurrency(value, ctx, 2);
    return formatCurrency(value, ctx, mode);
  }
}
