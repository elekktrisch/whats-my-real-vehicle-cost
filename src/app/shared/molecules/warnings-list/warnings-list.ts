import { Component, input } from '@angular/core';
import type { ActiveConflict } from '../../../scenario/conflicts';

/**
 * Top-of-page list of active rule conflicts. Sits inside the sticky region
 * below the comparison-strip; renders one row per conflict with the verbose
 * reason copy, current/proposed values, and Apply/Keep buttons. Clicking
 * the lever name scrolls the page to that slider.
 */
@Component({
  selector: 'app-warnings-list',
  template: `
    @if (conflicts().length > 0) {
      <ul
        data-testid="warnings-list"
        role="list"
        class="flex flex-col gap-2 mt-3 mb-2 px-3 py-2 rounded-md bg-warning-soft border border-warning/40"
      >
        @for (c of conflicts(); track c.key) {
          <li
            data-testid="warnings-list-row"
            class="flex flex-wrap items-start gap-x-3 gap-y-1"
          >
            <span aria-hidden="true" class="text-warning text-[0.95rem] mt-px">⚠</span>
            <div class="flex-1 min-w-0">
              <a
                [href]="'#' + c.sliderAnchor"
                class="font-ui text-[0.82rem] font-medium text-tx hover:text-accent transition-colors duration-150"
              >
                {{ c.label }}
              </a>
              <span class="font-ui text-[0.78rem] text-tx-muted ml-2">
                rule says <span class="font-mono text-tx">{{ c.proposedValue }}</span>
                · you have <span class="font-mono text-tx-muted">{{ c.currentValue }}</span>
              </span>
              <p class="font-ui text-[0.74rem] text-tx-dim leading-snug mt-[2px]">
                {{ c.reason }}
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-testid="warnings-list-apply"
                (click)="c.apply()"
                class="font-ui text-[0.72rem] uppercase tracking-[0.06em] px-2 py-[2px] rounded border border-accent/60 text-accent hover:bg-accent/10 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
              >
                Apply
              </button>
              <button
                type="button"
                data-testid="warnings-list-keep"
                (click)="c.keep()"
                class="font-ui text-[0.72rem] uppercase tracking-[0.06em] px-2 py-[2px] rounded border border-border hover:border-border-strong text-tx-muted transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
              >
                Keep mine
              </button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class WarningsList {
  readonly conflicts = input.required<readonly ActiveConflict[]>();
}
