import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import type { Powertrain } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-powertrain-selector',
  imports: [Toggle],
  template: `
    <app-toggle
      [options]="options"
      [value]="store.powertrain()"
      (valueChange)="set($event)"
      ariaLabel="Powertrain"
    />
  `,
})
export class PowertrainSelector {
  protected readonly store = inject(ScenarioStore);
  protected readonly options = [
    { value: 'ICE', label: '🔥 ICE / Hybrid' },
    { value: 'EV', label: '⚡ 100% EV' },
  ] as const;
  protected set(v: string): void {
    this.store.setPowertrain(v as Powertrain);
  }
}