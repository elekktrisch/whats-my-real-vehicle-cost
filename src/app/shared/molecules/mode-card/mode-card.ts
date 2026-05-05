import { Component, computed, input, output } from '@angular/core';
import type { Tab } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-mode-card',
  template: `
    <button
      type="button"
      role="tab"
      [id]="tabId()"
      [attr.aria-controls]="panelId()"
      [attr.aria-selected]="active()"
      [attr.tabindex]="active() ? 0 : -1"
      (click)="select.emit(mode())"
      [class]="cardClass()"
    >
      <header class="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <span class="font-ui text-[0.75rem] font-semibold tracking-[0.06em] uppercase min-w-24">
          {{ label() }}
        </span>
        @if (recommended()) {
          <span
            class="shrink-0 min-w-24 text-center rounded-full bg-accent/15 text-accent text-[0.75rem] tracking-[0.1em] uppercase px-[7px] py-[1px] font-ui font-medium"
            aria-label="Recommended"
          >
            Best
          </span>
        } @else {
          @if (delta(); as d) {
            <span
              class="shrink min-w-24 font-mono text-[0.75rem] text-accent/80 tracking-[-0.01em] md:text-right text-left"
            >
              {{ d }}
            </span>
          }
        }
      </header>

      <div class="mode-card-total flex items-baseline justify-between flex-wrap gap-1 sm:gap-2">
        <span [class]="rowLabelClass">Total</span>
        <span class="font-mono text-[0.78rem] sm:text-[0.85rem] text-tx tracking-[-0.02em]">
          {{ total() }}
        </span>
      </div>

      <div class="flex items-baseline justify-between flex-wrap gap-1 sm:gap-2 mt-[6px]">
        <span [class]="rowLabelClass">Monthly</span>
        <span class="font-mono text-[0.85rem] sm:text-[0.95rem] font-medium text-tx tracking-[-0.02em]">
          {{ monthly() }}
        </span>
      </div>

      <div class="flex items-baseline justify-between flex-wrap gap-2 mt-[4px]">
        <span [class]="rowLabelClass">Per {{ distanceUnit() }}</span>
        <span class="font-mono text-[0.78rem] text-tx-muted tracking-[-0.02em]">
          {{ perDistance() }}
        </span>
      </div>
    </button>
  `,
})
export class ModeCard {
  readonly mode = input.required<Tab>();
  readonly label = input.required<string>();
  readonly active = input.required<boolean>();
  readonly recommended = input.required<boolean>();
  readonly total = input.required<string>();
  readonly monthly = input.required<string>();
  readonly perDistance = input.required<string>();
  readonly distanceUnit = input.required<string>();
  readonly delta = input<string | null>(null);
  readonly compact = input(false);
  readonly tabId = input.required<string>();
  readonly panelId = input.required<string>();

  readonly select = output<Tab>();

  protected readonly rowLabelClass =
    'font-ui text-[0.75rem] text-tx-dim tracking-normal sm:tracking-[0.1em] normal-case sm:uppercase';

  protected readonly cardClass = computed(() => {
    // min-w-0 lets the grid cell shrink below intrinsic content width — without
    // it long delta strings would push the strip past the viewport.
    const base = [
      'block w-full min-w-0 text-left rounded-[12px] transition-[box-shadow,background-color] duration-200',
      'p-[10px] sm:p-[14px]',
      'border cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
    ];
    if (this.active()) {
      // mode-card-shine-active paints the accent rim, which acts as the
      // border — drop the utility border color to avoid a double outline.
      base.push('mode-card-shine-active border-transparent');
    } else {
      base.push('mode-card-shine border-border hover:border-border-strong text-tx-muted');
    }
    return base.join(' ');
  });
}
