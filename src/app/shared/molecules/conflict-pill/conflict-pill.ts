import { Component, input, output } from '@angular/core';

/**
 * Inline conflict prompt that sits below a slider whose override disagrees
 * with the auto-derived rule. Compact form: ⚠ <label> <proposedValue>
 * [Apply] [Keep <currentValue>]. Visibility is fully controlled by the
 * parent (the store decides via `*PillVisible` signals, the parent passes
 * the result here).
 */
@Component({
  selector: 'app-conflict-pill',
  template: `
    @if (visible()) {
      <div
        data-testid="conflict-pill"
        role="status"
        aria-live="polite"
        class="flex flex-wrap items-center gap-2 -mt-[14px] mb-[20px] px-2 py-1 rounded-md bg-warning-soft border border-warning/40 text-[0.78rem] text-tx-muted"
      >
        <span aria-hidden="true">⚠</span>
        <span class="font-ui">
          {{ label() }}: <span class="font-mono text-tx">{{ proposedValue() }}</span>
        </span>
        <span class="ml-auto flex items-center gap-1">
          <button
            type="button"
            data-testid="conflict-pill-apply"
            (click)="apply.emit()"
            class="font-ui text-[0.72rem] uppercase tracking-[0.06em] px-2 py-[2px] rounded border border-accent/60 text-accent hover:bg-accent/10 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            Apply
          </button>
          <button
            type="button"
            data-testid="conflict-pill-keep"
            (click)="keep.emit()"
            class="font-ui text-[0.72rem] uppercase tracking-[0.06em] px-2 py-[2px] rounded border border-border hover:border-border-strong text-tx-muted transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            Keep {{ currentValue() }}
          </button>
        </span>
      </div>
    }
  `,
})
export class ConflictPill {
  readonly visible = input.required<boolean>();
  readonly label = input.required<string>();
  readonly proposedValue = input.required<string>();
  readonly currentValue = input.required<string>();
  readonly apply = output<void>();
  readonly keep = output<void>();
}
