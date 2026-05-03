import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import type { Locale } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-locale-selector',
  imports: [Toggle],
  template: `
    <app-toggle
      [options]="options"
      [value]="store.locale()"
      (valueChange)="set($event)"
      ariaLabel="Locale"
    />
  `,
})
export class LocaleSelector {
  protected readonly store = inject(ScenarioStore);
  protected readonly options = [
    { value: 'US', label: 'US' },
    { value: 'EU', label: 'EU' },
  ] as const;
  protected set(v: string): void {
    this.store.setLocale(v as Locale);
  }
}
