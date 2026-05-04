import { Component, computed, input, output } from '@angular/core';
import type { Tab } from '../../../scenario/scenario.types';
import { TcoSparkline } from '../../atoms/tco-sparkline/tco-sparkline';

/**
 * One mode's card on the comparison strip — also a tablist member. The card
 * is the *only* tab control: clicking it focuses the mode below the strip.
 *
 * Compact mode (driven by parent's F2 shrink behavior past ~250px scroll):
 * drops the Total row and the sparkline; keeps Monthly + Per-distance + delta.
 * Per-distance is the cross-mode apples-to-apples figure, so we keep it even
 * in compact form.
 */
@Component({
  selector: 'app-mode-card',
  imports: [TcoSparkline],
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
      <header class="flex items-center justify-between gap-2">
        <span class="font-ui text-[0.72rem] font-semibold tracking-[0.06em] uppercase">
          {{ label() }}
        </span>
        @if (recommended()) {
          <span
            class="rounded-full bg-accent/15 text-accent text-[0.55rem] tracking-[0.1em] uppercase px-[7px] py-[1px] font-ui font-medium"
            aria-label="Recommended"
          >
            Best
          </span>
        } @else {
          @if (delta(); as d) {
            <span
              class="font-mono text-[0.65rem] text-accent/80 tracking-[-0.01em] whitespace-nowrap"
            >
              {{ d }}
            </span>
          }
        }
      </header>

      @if (!compact()) {
        <div class="flex items-baseline justify-between gap-2 mt-[10px]">
          <span class="font-ui text-[0.6rem] tracking-[0.1em] uppercase text-tx-dim">Total</span>
          <span class="font-mono text-[0.85rem] text-tx tracking-[-0.02em]">{{ total() }}</span>
        </div>
      }

      <div class="flex items-baseline justify-between gap-2 mt-[6px]">
        <span class="font-ui text-[0.6rem] tracking-[0.1em] uppercase text-tx-dim">Monthly</span>
        <span class="font-mono text-[0.95rem] font-medium text-tx tracking-[-0.02em]">
          {{ monthly() }}
        </span>
      </div>

      <div class="flex items-baseline justify-between gap-2 mt-[4px]">
        <span class="font-ui text-[0.6rem] tracking-[0.1em] uppercase text-tx-dim">Per {{ distanceUnit() }}</span>
        <span class="font-mono text-[0.78rem] text-tx-muted tracking-[-0.02em]">
          {{ perDistance() }}
        </span>
      </div>

      @if (!compact() && sparklinePoints().length > 1) {
        <div class="mt-[10px] -mx-[2px]">
          <app-tco-sparkline
            [points]="sparklinePoints()"
            [yMax]="sparklineYMax()"
            [width]="sparklineWidth()"
            [height]="22"
            [accent]="recommended()"
          />
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
  readonly monthly = input.required<string>();
  readonly perDistance = input.required<string>();
  readonly distanceUnit = input.required<string>();
  /** Pre-formatted delta vs. recommended (e.g. "+$32 / mo"). null for the
   * recommended card itself. */
  readonly delta = input<string | null>(null);
  readonly sparklinePoints = input.required<readonly number[]>();
  readonly sparklineYMax = input.required<number>();
  /** Compact / shrunk mode (parent decides when via scroll). */
  readonly compact = input(false);
  /** Used for visual width of the sparkline; the strip lays cards in a flex
   * row, so a slight max here keeps the SVG from over-stretching. */
  readonly sparklineWidth = input(140);
  /** Tab ID this button uses (for the corresponding panel's aria-labelledby). */
  readonly tabId = input.required<string>();
  /** ID of the tabpanel this tab controls. */
  readonly panelId = input.required<string>();

  readonly select = output<Tab>();

  protected readonly cardClass = computed(() => {
    const base = [
      'block w-full text-left rounded-[12px] p-[14px] transition-colors duration-150',
      'border bg-surface cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
    ];
    if (this.active()) {
      base.push('border-accent shadow-[0_0_0_1px_var(--color-accent)/0.4]');
    } else {
      base.push('border-border hover:border-border-strong text-tx-muted');
    }
    if (this.compact()) base.push('p-[10px]');
    return base.join(' ');
  });
}
