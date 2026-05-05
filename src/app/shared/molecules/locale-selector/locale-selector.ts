import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import type { Locale } from '../../../scenario/scenario.types';

// Inline SVG flags (not emoji — Windows renders flag emoji as letter pairs).
@Component({
  selector: 'app-locale-selector',
  template: `
    <div
      class="inline-flex items-center gap-0 p-[3px] rounded-[8px] bg-elevated border border-border"
      role="radiogroup"
      aria-label="Locale"
    >
      <button
        type="button"
        role="radio"
        aria-label="United States locale"
        [attr.aria-checked]="store.locale() === 'US'"
        (click)="set('US')"
        [class]="optionClass(store.locale() === 'US')"
      >
        <svg viewBox="0 0 30 20" class="w-[20px] h-[14px] rounded-[2px] shrink-0 sm:w-[18px] sm:h-[12px]">
          <rect width="30" height="20" fill="#ffffff" />
          <g fill="#b22234">
            <rect y="0" width="30" height="1.54" />
            <rect y="3.08" width="30" height="1.54" />
            <rect y="6.15" width="30" height="1.54" />
            <rect y="9.23" width="30" height="1.54" />
            <rect y="12.31" width="30" height="1.54" />
            <rect y="15.38" width="30" height="1.54" />
            <rect y="18.46" width="30" height="1.54" />
          </g>
          <rect width="12" height="10.77" fill="#3c3b6e" />
        </svg>
        <span class="ml-[6px] font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase">US</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-label="European Union locale"
        [attr.aria-checked]="store.locale() === 'EU'"
        (click)="set('EU')"
        [class]="optionClass(store.locale() === 'EU')"
      >
        <svg viewBox="0 0 30 20" class="w-[20px] h-[14px] rounded-[2px] shrink-0 sm:w-[18px] sm:h-[12px]">
          <rect width="30" height="20" fill="#003399" />
          <g fill="#ffcc00" transform="translate(15 10)">
            @for (s of euStars; track $index) {
              <circle r="0.85" [attr.cx]="s.x" [attr.cy]="s.y" />
            }
          </g>
        </svg>
        <span class="ml-[6px] font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase">EU</span>
      </button>
    </div>
  `,
})
export class LocaleSelector {
  protected readonly store = inject(ScenarioStore);

  // 12 stars in a circle of radius 5, 30° apart.
  protected readonly euStars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    return { x: +(5 * Math.cos(angle)).toFixed(3), y: +(5 * Math.sin(angle)).toFixed(3) };
  });

  protected optionClass(active: boolean): string {
    return [
      'inline-flex items-center justify-center px-2 sm:px-3 h-7 rounded-[6px]',
      'transition-[background-color,color] duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
      active
        ? 'bg-surface text-tx shadow-[0_0_0_1px_var(--color-border-strong)]'
        : 'opacity-60 hover:opacity-100 sm:opacity-100 text-tx-muted sm:hover:text-tx',
    ].join(' ');
  }

  protected set(v: Locale): void {
    this.store.setLocale(v);
  }
}