import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  model,
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
}

const MODES: readonly Tab[] = ['lease', 'finance', 'cash'];

/**
 * Sticky strip of three mode-cards. Strip alone sticks; the surrounding
 * header scrolls away. The strip's own background is a vertical gradient
 * from the body bg to transparent over the last 24px, so content
 * scrolling underneath disappears smoothly instead of knife-edging.
 *
 * The recommendation explanation slots inside the sticky block (between the
 * cards and the fade band) so it stays visible alongside the cards.
 *
 * F2 shrink: past ~250px scroll desktop / ~120px mobile, the strip switches
 * the cards to compact (drops Total + sparkline; keeps Monthly + per-distance).
 *
 * Tablist semantics: roving tabindex, arrow keys move focus between cards,
 * Enter/Space activates (the underlying button click already handles this).
 *
 * Anti-flicker: solid (not blurred) background, `will-change: transform` to
 * force the strip into its own compositor layer — chart.js canvas behind
 * the strip can otherwise cause sub-pixel repaint flicker on scroll.
 */
@Component({
  selector: 'app-comparison-strip',
  imports: [ModeCard],
  template: `
    <div #stripEl [attr.data-compact]="compact()">
      <div
        role="tablist"
        aria-label="Financing modes"
        class="grid grid-cols-3 gap-[6px] sm:gap-[10px]"
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
            [compact]="compact()"
            [tabId]="tabId(card.mode)"
            [panelId]="panelId(card.mode)"
            (select)="onSelect($event)"
          />
        }
      </div>

      @if (recommendationReason()) {
        <p
          class="font-ui text-[0.78rem] text-tx-muted leading-[1.55] mt-3 text-center px-2"
          role="status"
          aria-live="polite"
        >
          {{ recommendationReason() }}
        </p>
      }
    </div>
  `,
})
export class ComparisonStrip {
  readonly cards = input.required<readonly ModeCardData[]>();
  readonly active = model.required<Tab>();
  readonly recommended = input<Tab | null>(null);
  readonly distanceUnit = input.required<string>();
  /** One-line locale-aware explanation rendered under the cards inside the
   * sticky block so it stays visible alongside the strip. */
  readonly recommendationReason = input<string>('');
  /** F2 shrink — driven by the parent's scroll detection. The strip itself
   * no longer owns the sticky wrapper or the scroll listener; the page
   * coordinates one signal for both the strip and the hero-summary that
   * sits next to it in the sticky region. */
  readonly compact = input(false);

  @ViewChild('stripEl', { static: true }) stripEl?: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

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