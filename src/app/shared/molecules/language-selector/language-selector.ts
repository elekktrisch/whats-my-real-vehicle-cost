import { Component, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import type { Language } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-language-selector',
  template: `
    <div
      class="inline-flex items-center gap-0 p-[3px] rounded-[8px] bg-elevated border border-border"
      role="radiogroup"
      aria-label="Language"
    >
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="store.language() === 'en'"
        (click)="set('en')"
        [class]="optionClass(store.language() === 'en')"
      >
        EN
      </button>
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="store.language() === 'de'"
        (click)="set('de')"
        [class]="optionClass(store.language() === 'de')"
      >
        DE
      </button>
    </div>
  `,
})
export class LanguageSelector {
  protected readonly store = inject(ScenarioStore);

  protected optionClass(active: boolean): string {
    return [
      'inline-flex items-center justify-center px-3 h-7 rounded-[6px]',
      'font-ui text-[0.72rem] font-medium tracking-[0.08em] uppercase',
      'transition-[background-color,color] duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
      active
        ? 'bg-surface text-tx shadow-[0_0_0_1px_var(--color-border-strong)]'
        : 'opacity-60 hover:opacity-100 sm:opacity-100 text-tx-muted sm:hover:text-tx',
    ].join(' ');
  }

  protected set(v: Language): void {
    this.store.setLanguage(v);
  }
}
