import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../atoms/icon/icon';
import { LocaleSelector } from '../locale-selector/locale-selector';
import { PowertrainSelector } from '../powertrain-selector/powertrain-selector';

@Component({
  selector: 'app-header-bar',
  imports: [Icon, LocaleSelector, PowertrainSelector],
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
        <app-locale-selector />
        <app-powertrain-selector />

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
  private readonly router = inject(Router);

  protected editAnswers(): void {
    this.router.navigate(['/wizard']);
  }
}