import { Component } from '@angular/core';
import { Icon } from '../../shared/atoms/icon/icon';

@Component({
  selector: 'app-cash-tab',
  imports: [Icon],
  template: `
    <div class="flex flex-col items-center justify-center gap-[14px] py-[110px]">
      <app-icon name="card" [size]="44" [strokeWidth]="1.2" ariaLabel="Card" />
      <div class="font-ui text-[1.5rem] font-medium text-tx-muted tracking-[0.02em]">
        Cash Purchase Calculator
      </div>
      <div class="font-ui text-[0.65rem] tracking-[0.12em] uppercase text-tx-dim">
        Coming in phase 6
      </div>
    </div>
  `,
})
export class CashTab {}