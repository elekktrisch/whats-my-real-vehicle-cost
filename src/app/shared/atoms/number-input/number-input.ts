import { Component, computed, input, model, signal } from '@angular/core';

export type NumberInputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-number-input',
  template: `
    <div [class]="wrapperClass()">
      @if (prefix()) {
        <span class="text-tx-muted/80 select-none">{{ prefix() }}</span>
      }
      <input
        type="text"
        inputmode="decimal"
        [value]="display()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.size]="display().length || 1"
        (focus)="focused.set(true)"
        (blur)="onBlur($event)"
        (input)="onInput($event)"
        [class]="inputClass()"
      />
      @if (suffix()) {
        <span class="text-tx-muted/80 select-none">{{ suffix() }}</span>
      }
    </div>
  `,
})
export class NumberInput {
  readonly value = model.required<number>();
  readonly min = input<number>();
  readonly max = input<number>();
  readonly prefix = input('');
  readonly suffix = input('');
  readonly fractionDigits = input(0);
  readonly ariaLabel = input('');
  readonly compact = input(false);
  readonly size = input<NumberInputSize>('md');

  protected readonly focused = signal(false);

  /** Center the digits inside `lg` inputs (wrapper is `justify-center`,
   * prefix/suffix are asymmetric — `text-right` on the input would skew the
   * visible cluster). Other sizes keep right-alignment. */
  protected readonly inputClass = computed(() => {
    const align = this.size() === 'lg' ? 'text-center' : 'text-right';
    return `num-input bg-transparent border-none outline-none ${align} text-tx font-mono tracking-[-0.01em] caret-accent min-w-0`;
  });

  protected readonly wrapperClass = computed(() => {
    const size = this.size();
    const sizeClasses =
      size === 'lg'
        // `lg` is the hero variant in the comparison-page header. When the
        // wrapper is stretched to 100% width on mobile, `justify-center`
        // centers the prefix + input + suffix group inside the wider box.
        ? 'text-[1.1rem] sm:text-[1.33rem] tracking-[-0.01em] px-[12px] py-[6px] justify-center'
        : size === 'sm'
          ? 'text-[0.78rem] px-[8px] py-[4px]'
          : `text-[0.88rem] ${this.compact() ? 'px-[8px] py-[4px]' : 'px-[10px] py-[7px]'}`;
    return [
      'inline-flex items-baseline gap-[2px] font-mono font-medium text-tx',
      'rounded-md bg-elevated border border-border transition-colors duration-150',
      'focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]',
      sizeClasses,
    ].join(' ');
  });

  protected readonly display = computed(() => {
    const v = this.value();
    const fd = this.fractionDigits();
    if (this.focused()) return Number.isFinite(v) ? String(v) : '';
    return v.toLocaleString(undefined, {
      minimumFractionDigits: fd,
      maximumFractionDigits: fd,
    });
  });

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = parseFloat(raw.replace(/[^\d.\-]/g, ''));
    if (Number.isFinite(parsed)) this.value.set(parsed);
  }

  protected onBlur(event: Event): void {
    this.focused.set(false);
    let v = this.value();
    if (!Number.isFinite(v)) v = this.min() ?? 0;
    const lo = this.min();
    const hi = this.max();
    if (lo !== undefined && v < lo) v = lo;
    if (hi !== undefined && v > hi) v = hi;
    this.value.set(v);
    (event.target as HTMLInputElement).value = this.display();
  }
}
