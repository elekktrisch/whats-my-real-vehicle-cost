import { Component, ElementRef, HostListener, computed, inject, input } from '@angular/core';

let nextId = 0;

/**
 * A small "?" affordance whose description appears in a hover/focus tooltip.
 *
 * Phase G a11y:
 *   - Real `<button>` (focusable, keyboard-activatable).
 *   - Tooltip surfaces on `:hover`, `:focus-visible`, and `:focus-within`
 *     (the styles.css `.info-badge::after` rule handles all three).
 *   - `Escape` blurs the button so the tooltip dismisses.
 *   - `aria-describedby` links the button to a visually-hidden `<span>` that
 *     mirrors the tooltip text — screen readers read it as the button's
 *     description without needing the visual tooltip to fire.
 *   - Hit area ≥ 24×24 (WCAG 2.5.8); the visual badge stays at 16×16 inside
 *     padding so the design rhythm doesn't shift.
 */
@Component({
  selector: 'app-info-badge',
  template: `
    <button
      type="button"
      class="info-badge inline-flex items-center justify-center min-w-[24px] min-h-[24px] p-[3px] bg-transparent border-0 cursor-help relative align-middle shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      [attr.data-tip]="tip()"
      [attr.aria-describedby]="describedById()"
      aria-label="More information"
    >
      <span
        class="inline-flex items-center justify-center size-[16px] text-[12px] leading-none font-ui rounded-full bg-elevated border border-border-strong text-tx-muted"
      >
        ?
      </span>
      <span class="sr-only" [id]="describedById()">{{ tip() }}</span>
    </button>
  `,
})
export class InfoBadge {
  readonly tip = input.required<string>();

  protected readonly describedById = computed(() => `info-badge-tip-${this.uid}`);
  private readonly uid = ++nextId;
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** Esc dismisses the tooltip by blurring the button. */
  @HostListener('keydown.escape')
  protected onEscape(): void {
    const btn = this.host.nativeElement.querySelector('button') as HTMLButtonElement | null;
    btn?.blur();
  }
}