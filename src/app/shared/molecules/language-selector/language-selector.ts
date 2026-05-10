import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import type { Language } from '../../../scenario/scenario.types';

// Inline SVG flags. EN flag is region-aware: US flag in US region (en-US),
// UK flag in EU region (en-GB) — matches bcp47ForContext mapping.
@Component({
  selector: 'app-language-selector',
  imports: [TranslocoPipe],
  template: `
    <div
      class="inline-flex items-center gap-0 p-[3px] rounded-[8px] bg-elevated border border-border"
      role="radiogroup"
      [attr.aria-label]="'languageSelector.aria' | transloco"
    >
      <button
        type="button"
        role="radio"
        [attr.aria-label]="'languageSelector.EN' | transloco"
        [attr.aria-checked]="store.language() === 'en'"
        (click)="set('en')"
        [class]="optionClass(store.language() === 'en')"
      >
        @if (store.region() === 'US') {
          <svg viewBox="0 0 30 20" class="w-[18px] h-[12px] rounded-[2px] shrink-0">
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
        } @else {
          <svg viewBox="0 0 60 30" class="w-[18px] h-[12px] rounded-[2px] shrink-0">
            <rect width="60" height="30" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" stroke-width="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" stroke-width="2" />
            <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" stroke-width="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6" />
          </svg>
        }
        <span class="ml-[6px] font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase">EN</span>
      </button>
      <button
        type="button"
        role="radio"
        [attr.aria-label]="'languageSelector.DE' | transloco"
        [attr.aria-checked]="store.language() === 'de'"
        (click)="set('de')"
        [class]="optionClass(store.language() === 'de')"
      >
        <svg viewBox="0 0 30 20" class="w-[18px] h-[12px] rounded-[2px] shrink-0">
          <rect width="30" height="20" fill="#000000" />
          <rect y="6.67" width="30" height="6.67" fill="#dd0000" />
          <rect y="13.33" width="30" height="6.67" fill="#ffcc00" />
        </svg>
        <span class="ml-[6px] font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase">DE</span>
      </button>
    </div>
  `,
})
export class LanguageSelector {
  protected readonly store = inject(ScenarioStore);

  protected optionClass(active: boolean): string {
    return [
      'inline-flex items-center justify-center px-3 h-[30px] rounded-[6px]',
      'transition-[background-color,color] duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
      active
        ? 'bg-surface text-tx shadow-[0_0_0_1px_var(--color-border-strong)]'
        : 'text-tx-muted hover:text-tx',
    ].join(' ');
  }

  protected set(v: Language): void {
    this.store.setLanguage(v);
  }
}
