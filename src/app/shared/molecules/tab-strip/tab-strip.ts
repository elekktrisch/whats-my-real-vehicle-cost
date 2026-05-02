import { Component, computed, input, model } from '@angular/core';
import type { Tab } from '../../../scenario/scenario.types';

interface TabSpec {
  value: Tab;
  label: string;
}

const TABS: TabSpec[] = [
  { value: 'lease', label: 'Lease' },
  { value: 'finance', label: 'Finance' },
  { value: 'cash', label: 'Cash' },
];

@Component({
  selector: 'app-tab-strip',
  template: `
    <nav class="flex border-b border-border" role="tablist">
      @for (t of tabs; track t.value) {
        <button
          type="button"
          role="tab"
          class="mode-btn relative flex items-center gap-[7px] px-[22px] py-[14px] border-none bg-transparent cursor-pointer font-ui text-[0.8rem] font-medium tracking-[0.06em] uppercase text-tx-muted transition-colors duration-200 hover:text-tx focus-visible:outline-none focus-visible:text-tx"
          [class.active]="t.value === active()"
          [attr.aria-selected]="t.value === active()"
          (click)="onSelect(t.value)"
        >
          <span class="mode-dot w-[5px] h-[5px] rounded-full bg-tx-dim shrink-0"></span>
          {{ t.label }}
          @if (t.value === recommended() && t.value !== active()) {
            <span
              class="ml-1 rounded-full bg-accent/15 text-accent text-[0.55rem] tracking-[0.1em] uppercase px-[6px] py-[1px]"
              aria-label="Recommended"
              >Rec</span
            >
          }
        </button>
      }
    </nav>
  `,
})
export class TabStrip {
  readonly active = model.required<Tab>();
  readonly recommended = input<Tab | null>(null);

  protected readonly tabs = TABS;

  protected onSelect(value: Tab): void {
    this.active.set(value);
  }
}