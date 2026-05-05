import { Pipe, PipeTransform, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { formatCurrency } from '../../scenario/locale.config';

// {{ 32000 | money }}            → "$32,000"
// {{ 0.42 | money:2 }}           → "$0.42"
// {{ 32500 | money:'compact' }}  → "$32.5k"
// Impure: output depends on `store.locale()`, which can flip without the
// input changing.
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly store = inject(ScenarioStore);

  transform(value: number | null | undefined, mode: number | 'compact' = 0): string {
    if (value == null || !Number.isFinite(value)) return '';
    if (mode === 'compact') {
      const cfg = this.store.localeConfig();
      const abs = Math.abs(value);
      const k =
        abs >= 1000
          ? `${Math.round(abs / 100) / 10}k`
          : String(Math.round(abs * 100) / 100);
      const sign = value < 0 ? '-' : '';
      return cfg.currencyAfter
        ? `${sign}${k} ${cfg.currencySymbol}`
        : `${sign}${cfg.currencySymbol}${k}`;
    }
    return formatCurrency(value, this.store.locale(), mode);
  }
}
