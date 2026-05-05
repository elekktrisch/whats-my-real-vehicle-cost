import { Component, computed, input, output } from '@angular/core';
import type { Tab } from '../../../scenario/scenario.types';

/**
 * One mode's card on the comparison strip — also a tablist member. The card
 * is the *only* tab control: clicking it focuses the mode below the strip.
 *
 * Layout: each row is label-left / value-right, baseline-aligned.
 *
 * Compact mode (driven by parent's F2 shrink behavior past ~250px scroll):
 * drops the Total row. On mobile additionally drops the Per-distance row
 * (per plan §H mobile-tuned F2 — shrunk row = monthly + delta only).
 *
 * Mobile typography: row labels drop the uppercase + wide tracking on
 * narrow viewports so the label + value pair fits in ~110px-wide cards
 * without overflow.
 */
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

      @if (!compact()) {
        <div class="flex items-baseline justify-between flex-wrap gap-1 sm:gap-2 mt-[10px]">
          <span [class]="rowLabelClass">Total</span>
          <span class="font-mono text-[0.78rem] sm:text-[0.85rem] text-tx tracking-[-0.02em]">
            {{ total() }}
          </span>
        </div>
      }

      <div class="flex items-baseline justify-between flex-wrap gap-1 sm:gap-2 mt-[6px]">
        <span [class]="rowLabelClass">Monthly</span>
        <span class="font-mono text-[0.85rem] sm:text-[0.95rem] font-medium text-tx tracking-[-0.02em]">
          {{ monthly() }}
        </span>
      </div>

      <div [class]="perDistanceRowClass">
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
  /** Pre-formatted delta vs. recommended (e.g. "+$0.12 / mi"). null for the
   * recommended card itself. */
  readonly delta = input<string | null>(null);
  /** Compact / shrunk mode (parent decides when via scroll). */
  readonly compact = input(false);
  /** Tab ID this button uses (for the corresponding panel's aria-labelledby). */
  readonly tabId = input.required<string>();
  /** ID of the tabpanel this tab controls. */
  readonly panelId = input.required<string>();

  readonly select = output<Tab>();

  /** Row labels — sentence case + normal tracking on narrow viewports so the
   * label + value pair fits in ~110px-wide cards; uppercase eyebrow style
   * returns at sm+ for the desktop look. */
  protected readonly rowLabelClass =
    'font-ui text-[0.75rem] text-tx-dim tracking-normal sm:tracking-[0.1em] normal-case sm:uppercase';

  protected readonly cardClass = computed(() => {
    const base = [
      // `min-w-0` lets the grid cell shrink below its intrinsic content width
      // (grid items default to `min-width: auto`, which would push the strip
      // wider than the viewport when content like a long delta string would
      // otherwise refuse to wrap).
      'block w-full min-w-0 text-left rounded-[12px] transition-[box-shadow,background-color] duration-200',
      // Tighter padding on narrow viewports — on a 360px screen each card
      // is ~110px wide; padding has to give the numbers some space.
      'p-[10px] sm:p-[14px]',
      'border cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
    ];
    if (this.active()) {
      // `mode-card-shine-active` paints both the gradient and the accent
      // rim/glow; the rim acts as the border, so we drop the utility
      // border color to avoid a double outline.
      base.push('mode-card-shine-active border-transparent');
    } else {
      base.push('mode-card-shine border-border hover:border-border-strong text-tx-muted');
    }
    if (this.compact()) base.push('p-[8px] sm:p-[10px]');
    return base.join(' ');
  });

  /** Per-distance row stays visible at every breakpoint, even when compact —
   * cost-per-distance is the cross-mode apples-to-apples figure on the
   * strip, valuable in the shrunk header just as much as in the full one. */
  protected readonly perDistanceRowClass =
    'flex items-baseline justify-between flex-wrap gap-2 mt-[4px]';
}
