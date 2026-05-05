import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { fuelCostOverYears } from '../../../scenario/calculations/fuel';
import { formatCurrency } from '../../../scenario/locale.config';
import { HeroColumn } from '../../atoms/hero-column/hero-column';
import { cashHeroData, financeHeroData, leaseHeroData, type HeroData } from './hero-summary.data';

@Component({
  selector: 'app-hero-summary',
  imports: [HeroColumn],
  template: `
    <section class="hero-card">
      <div class="hero-grid">
        <app-hero-column
          side="left"
          eyebrow="Out of pocket"
          [value]="data().down"
          [caption]="data().downCaption"
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
          [value]="data().asset"
          [caption]="data().assetCaption"
        />
      </div>

      <div class="hero-monthly flex items-baseline gap-2 flex-wrap mt-1">
        @if (data().termMonths) {
          <span class="hero-num-sub font-mono font-medium text-tx tracking-[-0.02em]">
            {{ data().monthly }} monthly
          </span>
          <span class="hero-caption font-ui text-[0.78rem] text-tx-muted">
            for {{ data().termMonths }} months
          </span>
        } @else {
          <span class="hero-caption font-ui text-[0.78rem] text-tx-muted">
            (no monthly payments)
          </span>
        }
      </div>

      <p class="hero-fineprint font-ui text-[0.72rem] text-tx-dim leading-relaxed">
        Plus ≈ {{ runningCostsAnnual() }} / yr in insurance, maintenance and fuel.
      </p>
    </section>
  `,
})
export class HeroSummary {
  private readonly store = inject(ScenarioStore);

  protected readonly data = computed<HeroData>(() => {
    const tab = this.store.activeTab();
    if (tab === 'lease') return leaseHeroData(this.store);
    if (tab === 'finance') return financeHeroData(this.store);
    return cashHeroData(this.store);
  });

  // Year-1 anchor for the fineprint. Maintenance climbs with age via the
  // curve, but year-1 reads cleanly.
  protected readonly runningCostsAnnual = computed(() => {
    const fuel = fuelCostOverYears({
      efficiency: this.store.fuelEfficiency(),
      fuelPrice: this.store.fuelPrice(),
      annualMileage: this.store.annualMileage(),
      years: 1,
      powertrain: this.store.powertrain(),
      locale: this.store.locale(),
      chargerStatus: this.store.chargerStatus(),
      solar: this.store.solar(),
    });
    const total = this.store.insurance() + this.store.maintenance() + fuel;
    return formatCurrency(total, this.store.locale(), 0);
  });
}
