import { Component, computed, input, output } from '@angular/core';
import type { Tab } from '../../../scenario/scenario.types';
import { Icon } from '../../atoms/icon/icon';

@Component({
  selector: 'app-mode-card',
  imports: [Icon],
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
      <header class="mode-card-header flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        <span class="font-ui text-[0.75rem] font-semibold tracking-[0.06em] uppercase min-w-0 truncate flex items-center gap-1">
          {{ label() }}
          @if (conflictCount() > 0) {
            <span
              data-testid="mode-card-badge"
              [attr.aria-label]="conflictCount() + ' rule conflict' + (conflictCount() === 1 ? '' : 's')"
              class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-warning-soft border border-warning/40 text-warning font-mono text-[0.65rem] font-medium tracking-tight"
              title="This mode has rule conflicts"
            >
              ⚠ {{ conflictCount() }}
            </span>
          }
        </span>
        <span
          class="mode-card-header-total shrink-0 font-mono text-[0.75rem] sm:text-[0.9rem] font-medium text-tx tracking-[-0.02em] whitespace-nowrap"
        >
          <span class="sm:hidden">{{ total() }}</span>
          <span class="hidden sm:inline">{{ totalFull() }}</span>
        </span>
      </header>

      <div class="mode-card-total flex items-baseline justify-between flex-wrap gap-1 sm:gap-2">
        <span [class]="rowLabelClass + ' inline-flex items-center gap-[4px]'">
          Total
          @if (totalTip()) {
            <span
              class="hidden sm:inline-flex items-center justify-center size-[14px] rounded-full bg-elevated border border-border-strong text-tx-dim text-[10px] leading-none cursor-help normal-case tracking-normal"
              [attr.title]="totalTip()"
              (click)="$event.stopPropagation()"
              aria-hidden="true"
            >
              ?
            </span>
          }
        </span>
        <span class="font-mono text-[0.72rem] sm:text-[0.85rem] text-tx tracking-[-0.02em]">
          <span class="sm:hidden">{{ total() }}</span>
          <span class="hidden sm:inline">{{ totalFull() }}</span>
        </span>
      </div>

      <div class="mode-card-monthly flex items-baseline justify-between flex-wrap gap-1 sm:gap-2 mt-[3px] sm:mt-[6px]">
        <span [class]="rowLabelClass + ' inline-flex items-center gap-[4px]'">
          Monthly
          @if (monthlyTip()) {
            <span
              class="hidden sm:inline-flex items-center justify-center size-[14px] rounded-full bg-elevated border border-border-strong text-tx-dim text-[10px] leading-none cursor-help normal-case tracking-normal"
              [attr.title]="monthlyTip()"
              (click)="$event.stopPropagation()"
              aria-hidden="true"
            >
              ?
            </span>
          }
        </span>
        <span class="font-mono text-[0.78rem] sm:text-[0.95rem] font-medium text-tx tracking-[-0.02em]">
          <span class="sm:hidden">{{ monthly() }}</span>
          <span class="hidden sm:inline">{{ monthlyFull() }}</span>
        </span>
      </div>

      <div class="mode-card-per-distance flex items-baseline justify-between flex-wrap gap-2 mt-[2px] sm:mt-[4px]">
        <span [class]="rowLabelClass + ' inline-flex items-center gap-[4px]'">
          Per {{ distanceUnit() }}
          @if (perDistanceTip()) {
            <span
              class="hidden sm:inline-flex items-center justify-center size-[14px] rounded-full bg-elevated border border-border-strong text-tx-dim text-[10px] leading-none cursor-help normal-case tracking-normal"
              [attr.title]="perDistanceTip()"
              (click)="$event.stopPropagation()"
              aria-hidden="true"
            >
              ?
            </span>
          }
        </span>
        <span class="font-mono text-[0.72rem] sm:text-[0.78rem] text-tx-muted tracking-[-0.02em]">
          {{ perDistance() }}
        </span>
      </div>

      @if (recommended() || delta()) {
        <div class="mode-card-bottom-tag flex justify-center mt-[6px] sm:mt-[8px]">
          @if (recommended()) {
            <span
              class="inline-flex items-center gap-[4px] rounded-full bg-accent/15 text-accent text-[0.75rem] tracking-[0.1em] uppercase px-[8px] py-[2px] font-ui font-semibold ring-1 ring-accent/40"
              aria-label="Recommended — best value"
            >
              <app-icon name="star" [size]="11" [filled]="true" [strokeWidth]="0" />
              Best
            </span>
          } @else {
            @if (delta(); as d) {
              <span class="font-mono text-[0.75rem] text-accent/80 tracking-[-0.01em]">
                {{ d }}
              </span>
            }
          }
        </div>
      }
    </button>
  `,
})
export class ModeCard {
  readonly mode = input.required<Tab>();
  readonly label = input.required<string>();
  readonly active = input.required<boolean>();
  readonly recommended = input.required<boolean>();
  readonly total = input.required<string>();
  readonly totalFull = input.required<string>();
  readonly monthly = input.required<string>();
  readonly monthlyFull = input.required<string>();
  readonly perDistance = input.required<string>();
  readonly distanceUnit = input.required<string>();
  readonly delta = input<string | null>(null);
  readonly conflictCount = input<number>(0);
  readonly totalTip = input<string>('');
  readonly monthlyTip = input<string>('');
  readonly perDistanceTip = input<string>('');
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
      'p-[6px] sm:p-[12px]',
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
    if (this.recommended()) {
      base.push('mode-card-recommended');
    }
    return base.join(' ');
  });
}
