import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-conflict-pill',
  imports: [TranslocoPipe],
  template: `
    @if (visible()) {
      <div
        data-testid="conflict-pill"
        role="status"
        aria-live="polite"
        class="flex items-start gap-2 -mt-[14px] mb-[20px] px-2 py-[6px] rounded-md bg-warning-soft border border-warning/40 text-[0.78rem] text-tx-muted"
      >
        <span aria-hidden="true" class="mt-px">⚠</span>
        <p class="flex-1 min-w-0 font-ui leading-snug">
          <span class="font-medium text-tx">{{ label() }}:</span>
          {{ 'conflicts.body.recommending' | transloco }}
          <span class="font-mono text-tx">{{ proposedValue() }}</span>
          {{ 'conflicts.body.insteadOf' | transloco }}
          <span class="font-mono text-tx-muted">{{ currentValue() }}</span>
          {{ 'conflicts.body.because' | transloco }} {{ reason() }}
        </p>
        <span class="ml-auto flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="conflict-pill-apply"
            (click)="apply.emit()"
            class="font-ui text-[0.72rem] uppercase tracking-[0.06em] px-2 py-[2px] rounded border border-accent/60 text-accent hover:bg-accent/10 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            {{ 'conflicts.apply' | transloco }}
          </button>
          <button
            type="button"
            data-testid="conflict-pill-keep"
            (click)="keep.emit()"
            class="font-ui text-[0.72rem] uppercase tracking-[0.06em] px-2 py-[2px] rounded border border-border hover:border-border-strong text-tx-muted transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            {{ 'conflicts.keep' | transloco: { value: currentValue() } }}
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
  readonly reason = input.required<string>();
  readonly apply = output<void>();
  readonly keep = output<void>();
}
