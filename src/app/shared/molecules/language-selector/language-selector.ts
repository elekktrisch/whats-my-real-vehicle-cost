import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import type { Language } from '../../../scenario/scenario.types';

interface LanguageOption {
  readonly code: Language;
  readonly nativeName: string;
}

const OPTIONS: readonly LanguageOption[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'es', nativeName: 'Español' },
] as const;

// Inline SVG flags (not emoji — Windows renders flag emoji as letter pairs).
// EN is region-aware: US flag in US region, UK flag in EU region — matches
// bcp47ForContext. Other flags are language-pinned.
@Component({
  selector: 'app-language-selector',
  imports: [TranslocoPipe],
  template: `
    <div class="relative">
      <button
        type="button"
        [attr.aria-label]="'languageSelector.aria' | transloco"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
        class="inline-flex items-center gap-[6px] h-[36px] px-3 rounded-[8px] bg-elevated border border-border text-tx hover:bg-surface transition-[background-color] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        @switch (store.language()) {
          @case ('en') {
            @if (store.region() === 'US') {
              <svg viewBox="0 0 30 20" [class]="flagClass">
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
              <svg viewBox="0 0 60 30" [class]="flagClass">
                <rect width="60" height="30" fill="#012169" />
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" stroke-width="6" />
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" stroke-width="2" />
                <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" stroke-width="10" />
                <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6" />
              </svg>
            }
          }
          @case ('de') {
            <svg viewBox="0 0 30 20" [class]="flagClass">
              <rect width="30" height="20" fill="#000000" />
              <rect y="6.67" width="30" height="6.67" fill="#dd0000" />
              <rect y="13.33" width="30" height="6.67" fill="#ffcc00" />
            </svg>
          }
          @case ('it') {
            <svg viewBox="0 0 30 20" [class]="flagClass">
              <rect width="10" height="20" fill="#009246" />
              <rect x="10" width="10" height="20" fill="#ffffff" />
              <rect x="20" width="10" height="20" fill="#ce2b37" />
            </svg>
          }
          @case ('fr') {
            <svg viewBox="0 0 30 20" [class]="flagClass">
              <rect width="10" height="20" fill="#0055a4" />
              <rect x="10" width="10" height="20" fill="#ffffff" />
              <rect x="20" width="10" height="20" fill="#ef4135" />
            </svg>
          }
          @case ('es') {
            <svg viewBox="0 0 30 20" [class]="flagClass">
              <rect width="30" height="20" fill="#aa151b" />
              <rect y="5" width="30" height="10" fill="#f1bf00" />
            </svg>
          }
        }
        <span class="font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase">
          {{ store.language() }}
        </span>
        <svg
          viewBox="0 0 12 12"
          class="w-[10px] h-[10px] text-tx-muted shrink-0 transition-transform duration-150"
          [class.rotate-180]="open()"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 4.5 L6 7.5 L9 4.5" />
        </svg>
      </button>

      @if (open()) {
        <ul
          role="listbox"
          [attr.aria-label]="'languageSelector.aria' | transloco"
          class="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[170px] py-1 rounded-[10px] bg-surface border border-border shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          @for (opt of options; track opt.code) {
            <li role="option" [attr.aria-selected]="store.language() === opt.code">
              <button
                type="button"
                (click)="select(opt.code)"
                [class]="itemClass(store.language() === opt.code)"
              >
                @switch (opt.code) {
                  @case ('en') {
                    @if (store.region() === 'US') {
                      <svg viewBox="0 0 30 20" [class]="flagClass">
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
                      <svg viewBox="0 0 60 30" [class]="flagClass">
                        <rect width="60" height="30" fill="#012169" />
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" stroke-width="6" />
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" stroke-width="2" />
                        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" stroke-width="10" />
                        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6" />
                      </svg>
                    }
                  }
                  @case ('de') {
                    <svg viewBox="0 0 30 20" [class]="flagClass">
                      <rect width="30" height="20" fill="#000000" />
                      <rect y="6.67" width="30" height="6.67" fill="#dd0000" />
                      <rect y="13.33" width="30" height="6.67" fill="#ffcc00" />
                    </svg>
                  }
                  @case ('it') {
                    <svg viewBox="0 0 30 20" [class]="flagClass">
                      <rect width="10" height="20" fill="#009246" />
                      <rect x="10" width="10" height="20" fill="#ffffff" />
                      <rect x="20" width="10" height="20" fill="#ce2b37" />
                    </svg>
                  }
                  @case ('fr') {
                    <svg viewBox="0 0 30 20" [class]="flagClass">
                      <rect width="10" height="20" fill="#0055a4" />
                      <rect x="10" width="10" height="20" fill="#ffffff" />
                      <rect x="20" width="10" height="20" fill="#ef4135" />
                    </svg>
                  }
                  @case ('es') {
                    <svg viewBox="0 0 30 20" [class]="flagClass">
                      <rect width="30" height="20" fill="#aa151b" />
                      <rect y="5" width="30" height="10" fill="#f1bf00" />
                    </svg>
                  }
                }
                <span class="font-ui text-[0.82rem] flex-1 text-left">{{ opt.nativeName }}</span>
                @if (store.language() === opt.code) {
                  <svg
                    viewBox="0 0 12 12"
                    class="w-[12px] h-[12px] text-accent shrink-0"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2.5 6.5 L5 9 L9.5 3.5" />
                  </svg>
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class LanguageSelector {
  protected readonly store = inject(ScenarioStore);
  protected readonly options = OPTIONS;
  protected readonly open = signal(false);
  protected readonly flagClass = 'w-[18px] h-[12px] rounded-[2px] shrink-0';

  private readonly host = inject(ElementRef<HTMLElement>);

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected select(code: Language): void {
    this.store.setLanguage(code);
    this.open.set(false);
  }

  protected itemClass(active: boolean): string {
    return [
      'w-full flex items-center gap-[10px] px-3 h-[34px] rounded-[6px]',
      'transition-[background-color,color] duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
      active ? 'text-tx' : 'text-tx-muted hover:text-tx hover:bg-elevated',
    ].join(' ');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const el = this.host.nativeElement as HTMLElement;
    if (!el.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.open.set(false);
  }
}
