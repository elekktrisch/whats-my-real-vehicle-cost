import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import { Icon } from '../../atoms/icon/icon';
import type { Locale, Powertrain } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-header-bar',
  imports: [Toggle, Icon],
  template: `
    <header
      class="flex items-center justify-between gap-3 flex-wrap pt-7 pb-[18px] border-b border-border"
    >
      <div class="flex items-center gap-2.5">
        <app-icon name="logo" [size]="22" ariaLabel="WhatsMyVehicleCost" />
        <span class="font-ui text-[1.2rem] font-bold tracking-[0.03em] text-tx"
          >WhatsMyVehicleCost</span
        >
        <span
          class="hidden sm:inline-block ml-2 font-mono text-[0.62rem] tracking-[0.1em] uppercase text-tx-dim"
          >TCO calculator</span
        >
      </div>

      <div class="flex items-center gap-3">
        <app-toggle
          [options]="localeOptions"
          [value]="store.locale()"
          (valueChange)="setLocale($event)"
          ariaLabel="Locale"
        />
        <app-toggle
          [options]="powertrainOptions"
          [value]="store.powertrain()"
          (valueChange)="setPowertrain($event)"
          ariaLabel="Powertrain"
        />

        <button
          type="button"
          (click)="editAnswers()"
          class="inline-flex items-center gap-[6px] h-8 px-3 rounded-[8px] bg-transparent text-tx-muted border border-border-strong hover:border-accent hover:text-accent font-ui text-[0.7rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <app-icon name="edit" [size]="13" />
          <span class="hidden sm:inline">Edit answers</span>
        </button>
      </div>
    </header>
  `,
})
export class HeaderBar {
  protected readonly store = inject(ScenarioStore);
  private readonly router = inject(Router);

  protected readonly localeOptions = [
    { value: 'US', label: 'US' },
    { value: 'EU', label: 'EU' },
  ] as const;
  protected readonly powertrainOptions = [
    { value: 'ICE', label: 'ICE / Hybrid' },
    { value: 'EV', label: '100% EV' },
  ] as const;

  protected setLocale(v: string): void {
    this.store.setLocale(v as Locale);
  }
  protected setPowertrain(v: string): void {
    this.store.setPowertrain(v as Powertrain);
  }
  protected editAnswers(): void {
    this.router.navigate(['/wizard']);
  }
}
