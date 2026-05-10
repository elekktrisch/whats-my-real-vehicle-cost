import { Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import type { Powertrain } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-powertrain-selector',
  imports: [Toggle],
  template: `
    <app-toggle
      [options]="options()"
      [value]="store.powertrain()"
      (valueChange)="set($event)"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
export class PowertrainSelector {
  protected readonly store = inject(ScenarioStore);
  private readonly transloco = inject(TranslocoService);

  // Re-runs on language change (TranslocoService.langChanges$ flips activeLang
  // which propagates through the signal world via reRenderOnLangChange).
  protected readonly options = computed(() => {
    const lang = this.store.language();
    return [
      { value: 'ICE', label: this.transloco.translate('powertrain.ICE', {}, lang) },
      { value: 'EV', label: this.transloco.translate('powertrain.EV', {}, lang) },
    ];
  });

  protected readonly ariaLabel = computed(() =>
    this.transloco.translate('powertrain.aria', {}, this.store.language()),
  );

  protected set(v: string): void {
    this.store.setPowertrain(v as Powertrain);
  }
}