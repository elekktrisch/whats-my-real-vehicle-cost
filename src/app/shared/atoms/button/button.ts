import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-bg border border-accent hover:brightness-110 active:brightness-95 disabled:bg-elevated disabled:text-tx-dim disabled:border-border',
  secondary:
    'bg-transparent text-tx border border-border-strong hover:border-accent hover:text-accent disabled:text-tx-dim disabled:border-border',
  ghost:
    'bg-transparent text-tx-muted border border-transparent hover:text-tx hover:bg-elevated disabled:text-tx-dim',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.75rem] tracking-[0.06em]',
  md: 'h-10 px-4 text-[0.8rem] tracking-[0.05em]',
  lg: 'h-12 px-6 text-[0.86rem] tracking-[0.04em]',
};

const BASE =
  'inline-flex items-center justify-center gap-[6px] rounded-[8px] font-ui font-medium uppercase ' +
  'transition-[background-color,color,border-color,filter] duration-150 cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ' +
  'disabled:cursor-not-allowed';

@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [class]="classes()"
    >
      <ng-content />
    </button>
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly fullWidth = input(false);
  readonly ariaLabel = input('');

  protected readonly classes = computed(() =>
    [BASE, VARIANTS[this.variant()], SIZES[this.size()], this.fullWidth() ? 'w-full' : '']
      .filter(Boolean)
      .join(' '),
  );
}