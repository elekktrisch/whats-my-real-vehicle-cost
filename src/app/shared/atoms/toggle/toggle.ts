import { Component, computed, input, model } from '@angular/core';

export interface ToggleOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-toggle',
  template: `
    <div
      class="inline-flex items-center gap-0 p-[3px] rounded-[8px] bg-elevated border border-border"
      role="radiogroup"
      [attr.aria-label]="ariaLabel() || null"
    >
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="opt.value === value()"
          (click)="value.set(opt.value)"
          [class]="optionClass(opt.value === value())"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
})
export class Toggle {
  readonly options = input.required<readonly ToggleOption[]>();
  readonly value = model.required<string>();
  readonly ariaLabel = input('');

  protected readonly optionClass = (active: boolean) =>
    [
      'px-3 h-7 rounded-[6px] font-ui text-[0.7rem] font-medium tracking-[0.06em] uppercase',
      'transition-[background-color,color] duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
      active
        ? 'bg-surface text-tx shadow-[0_0_0_1px_var(--color-border-strong)]'
        : 'text-tx-muted hover:text-tx',
    ].join(' ');
}