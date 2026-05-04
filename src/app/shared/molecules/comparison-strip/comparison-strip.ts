import {
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  model,
  signal,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Tab } from '../../../scenario/scenario.types';
import { ModeCard } from '../mode-card/mode-card';

/** Single mode's data feeding one card. The strip stays presentational —
 * the container builds these from the store's three breakdowns. */
export interface ModeCardData {
  mode: Tab;
  label: string;
  total: string;
  monthly: string;
  perDistance: string;
  delta: string | null;
  sparklinePoints: readonly number[];
}

const MODES: readonly Tab[] = ['lease', 'finance', 'cash'];

const SHRINK_THRESHOLD_DESKTOP = 250;
const SHRINK_THRESHOLD_MOBILE = 120;
const MOBILE_BREAKPOINT_PX = 600;

/**
 * Sticky strip of three mode-cards. Strip alone sticks; the surrounding
 * header scrolls away. A 24px gradient fade sits at the strip's bottom so
 * content scrolling underneath doesn't "knife edge" against the strip.
 *
 * F2 shrink: past ~250px scroll desktop / ~120px mobile, the strip switches
 * the cards to compact (drops Total + sparkline; keeps Monthly + per-distance).
 *
 * Tablist semantics: roving tabindex, arrow keys move focus between cards,
 * Enter/Space activates (the underlying button click already handles this).
 */
@Component({
  selector: 'app-comparison-strip',
  imports: [ModeCard],
  template: `
    <div
      #stripEl
      class="sticky top-0 z-20 bg-surface/95 backdrop-blur-[2px] pt-3 pb-[28px]"
      [attr.data-compact]="compact()"
    >
      <div
        role="tablist"
        aria-label="Financing modes"
        class="grid grid-cols-3 gap-[10px]"
        (keydown)="onKeydown($event)"
      >
        @for (card of orderedCards(); track card.mode) {
          <app-mode-card
            [mode]="card.mode"
            [label]="card.label"
            [active]="card.mode === active()"
            [recommended]="card.mode === recommended()"
            [total]="card.total"
            [monthly]="card.monthly"
            [perDistance]="card.perDistance"
            [distanceUnit]="distanceUnit()"
            [delta]="card.delta"
            [sparklinePoints]="card.sparklinePoints"
            [sparklineYMax]="sparklineYMax()"
            [compact]="compact()"
            [tabId]="tabId(card.mode)"
            [panelId]="panelId(card.mode)"
            (select)="onSelect($event)"
          />
        }
      </div>

      <!-- Gradient fade band — fades surface to transparent so scrolling
           content disappears under the strip rather than ending abruptly. -->
      <div
        class="pointer-events-none absolute left-0 right-0 bottom-0 h-[24px]"
        style="background: linear-gradient(to bottom, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 70%, transparent) 70%, transparent 100%);"
        aria-hidden="true"
      ></div>
    </div>
  `,
})
export class ComparisonStrip {
  readonly cards = input.required<readonly ModeCardData[]>();
  readonly active = model.required<Tab>();
  readonly recommended = input<Tab | null>(null);
  readonly sparklineYMax = input.required<number>();
  readonly distanceUnit = input.required<string>();

  @ViewChild('stripEl', { static: true }) stripEl?: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // F2 shrink — driven by window scroll position.
  private readonly scrollY = signal(0);
  protected readonly compact = computed(() => {
    if (!this.isBrowser) return false;
    const threshold =
      typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
        ? SHRINK_THRESHOLD_MOBILE
        : SHRINK_THRESHOLD_DESKTOP;
    return this.scrollY() > threshold;
  });

  /** Stable visual order is always lease → finance → cash regardless of
   * which is recommended. Consistency matters more than ranking here. */
  protected readonly orderedCards = computed(() => {
    const byMode = new Map(this.cards().map((c) => [c.mode, c]));
    return MODES.map((m) => byMode.get(m)).filter((c): c is ModeCardData => !!c);
  });

  protected tabId(mode: Tab): string {
    return `modetab-${mode}`;
  }
  protected panelId(mode: Tab): string {
    return `modepanel-${mode}`;
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    this.scrollY.set(window.scrollY);
  }

  protected onSelect(mode: Tab): void {
    this.active.set(mode);
  }

  /** Roving-tabindex arrow-key handling. Left/Right move focus; Home/End
   * jump to first/last. Enter/Space activate via the button click. */
  protected onKeydown(event: KeyboardEvent): void {
    const order = this.orderedCards().map((c) => c.mode);
    const current = order.indexOf(this.active());
    if (current < 0) return;

    let next = current;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + order.length) % order.length;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % order.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = order.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = order[next];
    this.active.set(target);
    if (this.isBrowser && this.stripEl) {
      const btn = this.stripEl.nativeElement.querySelector<HTMLButtonElement>(
        `#${this.tabId(target)}`,
      );
      btn?.focus();
    }
  }
}