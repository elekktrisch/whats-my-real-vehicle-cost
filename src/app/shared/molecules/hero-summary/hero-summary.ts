import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { HeroColumn } from '../../atoms/hero-column/hero-column';
import { Disclosure } from '../disclosure/disclosure';
import { cashHeroData, financeHeroData, leaseHeroData, type HeroData } from './hero-summary.data';

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
          eyebrow="Out of pocket"
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
          eyebrow="Owned Asset value"
          eyebrowMobile="Asset value"
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

  // Closing on every scroll event (not just when [data-scrolled] flips) so
  // the .hero-details wrapper is always shrinking from a known-small height
  // (just the disclosure button) when the compact-state transition fires.
  protected readonly detailsOpen = signal(false);

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (this.detailsOpen()) this.detailsOpen.set(false);
  }

  protected readonly data = computed<HeroData>(() => {
    const tab = this.store.activeTab();
    if (tab === 'lease') return leaseHeroData(this.store);
    if (tab === 'finance') return financeHeroData(this.store);
    return cashHeroData(this.store);
  });
}
