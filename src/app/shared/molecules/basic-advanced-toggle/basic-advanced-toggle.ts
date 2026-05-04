import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle, ToggleOption } from '../../atoms/toggle/toggle';

const OPTIONS: readonly ToggleOption[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'advanced', label: 'Advanced' },
];

/**
 * Header-mounted toggle that drives the global `basicMode` signal. Advanced
 * tier reveals the extra controls block (insurance override, lease-end fees,
 * EV setup details, fuel efficiency overrides, etc).
 */
@Component({
  selector: 'app-basic-advanced-toggle',
  imports: [Toggle],
  template: `
    <app-toggle
      ariaLabel="View detail level"
      [options]="options"
      [value]="value()"
      (valueChange)="onChange($event)"
    />
  `,
})
export class BasicAdvancedToggle {
  protected readonly store = inject(ScenarioStore);
  protected readonly options = OPTIONS;
  protected readonly value = computed(() => (this.store.basicMode() ? 'basic' : 'advanced'));

  protected onChange(value: string): void {
    this.store.basicMode.set(value === 'basic');
  }
}