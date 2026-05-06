import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { formatCurrency } from '../../../scenario/locale.config';
import { HeroColumn } from '../../atoms/hero-column/hero-column';
import { Disclosure } from '../disclosure/disclosure';
import { cashHeroData, financeHeroData, leaseHeroData, type HeroData } from './hero-summary.data';

const SCROLL_KEYS = new Set([
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown',
  ' ', // Space — KeyboardEvent.key value
]);

@Component({
  selector: 'app-hero-summary',
  imports: [HeroColumn, Disclosure],
  template: `
    <section class="hero-card">
      <div class="hero-grid">
        <img
          class="hero-column-icon hero-column-icon-left"
          src="money.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <app-hero-column
          side="left"
          eyebrow="Cash"
          [value]="data().outOfPocket"
          [caption]="data().outOfPocketCaption"
          [captionMobile]="data().outOfPocketCaptionMobile"
        />

        <div class="hero-arrow flex justify-center text-accent/60">
          <svg
            viewBox="0 0 56 56"
            fill="none"
            stroke="white"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M10 28h32 M30 14l14 14-14 14" />
          </svg>
        </div>

        <app-hero-column
          side="right"
          eyebrow="Ownership"
          eyebrowMobile="Ownership"
          [value]="data().asset"
          [caption]="data().assetCaption"
          [captionMobile]="data().assetCaptionMobile"
        />
        <img
          class="hero-column-icon hero-column-icon-right"
          [class.hero-column-icon-dim]="!data().retainsAsset"
          src="car.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      </div>

      <p class="hero-footnote font-ui text-[0.72rem] text-tx-dim leading-relaxed text-center">
        Plus ≈ {{ opportunityCostFootnote() }} in opportunity cost. (included
        in the true-cost view, not in the cash-out total)
      </p>

      <div class="hero-details">
        <app-disclosure label="+ Details" [(open)]="detailsOpen">
          <dl class="hero-breakdown">
            @for (item of data().breakdown; track item.label) {
              <div class="breakdown-row">
                <dt class="breakdown-label">
                  {{ item.label }}
                  @if (item.detail) {
                    <span class="breakdown-detail">{{ item.detail }}</span>
                  }
                </dt>
                <dd class="breakdown-amount">{{ item.amount }}</dd>
              </div>
            }
            <div class="breakdown-row breakdown-total">
              <dt class="breakdown-label">Total cash out</dt>
              <dd class="breakdown-amount">{{ data().outOfPocket }}</dd>
            </div>
          </dl>
        </app-disclosure>
      </div>
    </section>
  `,
})
export class HeroSummary {
  private readonly store = inject(ScenarioStore);

  // Close details on direct user-input events that correlate with scroll
  // intent — wheel, touchmove, keyboard scroll keys. NOT on the `scroll`
  // event itself, which also fires for synthetic scrolls (browser scroll-
  // anchoring after the sticky stack collapses, hydration / restored
  // position, programmatic `scrollIntoView`).
  protected readonly detailsOpen = signal(false);

  @HostListener('window:wheel')
  @HostListener('window:touchmove')
  protected onUserScrollInput(): void {
    if (this.detailsOpen()) this.detailsOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (!this.detailsOpen()) return;
    // Skip when the user is typing in an input — Space etc. are character
    // keys there, not scroll commands.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (SCROLL_KEYS.has(e.key)) this.detailsOpen.set(false);
  }

  protected readonly data = computed<HeroData>(() => {
    const tab = this.store.activeTab();
    if (tab === 'lease') return leaseHeroData(this.store);
    if (tab === 'finance') return financeHeroData(this.store);
    return cashHeroData(this.store);
  });

  // Mode-specific opportunity cost over keep — pulled from the active
  // breakdown so the figure matches the chart's opportunity-cost layer.
  // Cash ties up the full purchase price → high; finance/lease tie up
  // only the down payment → much lower; finance with $0 down → zero.
  protected readonly opportunityCostFootnote = computed(() => {
    const tab = this.store.activeTab();
    const breakdown =
      tab === 'lease'
        ? this.store.leaseBreakdown()
        : tab === 'finance'
          ? this.store.financeBreakdown()
          : this.store.cashBreakdown();
    return formatCurrency(breakdown.totals.opportunityCost, this.store.locale(), 0);
  });
}
