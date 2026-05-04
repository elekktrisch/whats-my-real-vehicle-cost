import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { financePayment } from '../../../scenario/calculations/financing';
import { fuelCostOverYears } from '../../../scenario/calculations/fuel';
import { formatCurrency } from '../../../scenario/locale.config';

interface HeroData {
  /** Total non-recurring cash out — across all events: every lease-cycle
   * downpayment, plus the buyout in lease-buyout mode, plus the loan/cash
   * downpayment. So the recipient of this number sees the "lump sums" they
   * have to write checks for over the keep horizon. */
  down: string;
  /** Sub-line under `down` explaining what's in the sum. */
  downCaption: string;
  /** null for cash (no recurring payment). */
  monthly: string | null;
  /** Months the recurring payment runs for. Cash → 0. */
  termMonths: number;
  asset: string;
  assetCaption: string;
}

/**
 * Headline summary above the chart: what the user pays out of pocket and
 * what they have to show for it. Running costs (insurance, maintenance,
 * fuel) live in the fineprint below — they're real but secondary to the
 * "how big a check do I write?" question.
 */
@Component({
  selector: 'app-hero-summary',
  template: `
    <section class="bg-surface border border-border rounded-xl p-4 sm:p-5">
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div class="flex flex-col gap-1">
          <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            Out of pocket
          </span>
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="font-mono text-[1.25rem] sm:text-[1.4rem] font-medium text-tx tracking-[-0.02em]">
              {{ data().down }}
            </span>
            <span class="font-ui text-[0.78rem] text-tx-muted">{{ data().downCaption }}</span>
          </div>
          <div class="flex items-baseline gap-2 flex-wrap mt-1">
            <span class="font-mono text-[1.05rem] font-medium text-tx tracking-[-0.02em]">
              {{ data().monthly }} monthly
            </span>
            <span class="font-ui text-[0.78rem] text-tx-muted">
              @if ( data().termMonths ) {
                for {{ data().termMonths }} months
              } @else {
                (no monthly payments)
              }
            </span>
          </div>
        </div>
        <!-- Money → asset arrow. Horizontal between columns on desktop;
             rotates 90° (downward) when columns stack on mobile. -->
        <div class="flex justify-center text-accent/60 py-1 sm:py-0">
          <svg
            viewBox="0 0 56 56"
            width="44"
            height="44"
            fill="none"
            stroke="currentColor"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="rotate-90 sm:rotate-0"
            aria-hidden="true"
          >
            <path d="M10 28h32 M30 14l14 14-14 14" />
          </svg>
        </div>
        <div class="flex flex-col gap-1 text-right">
          <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            Owned Asset value
          </span>
          <span class="font-mono text-[1.25rem] sm:text-[1.4rem] font-medium text-tx tracking-[-0.02em]">
            {{ data().asset }}
          </span>
          <span class="font-ui text-[0.78rem] text-tx-muted">{{ data().assetCaption }}</span>
        </div>
      </div>
      <p class="font-ui text-[0.72rem] text-tx-dim leading-relaxed mt-4 pt-3 border-t border-border">
        Plus ≈ {{ runningCostsAnnual() }} / yr in insurance, maintenance and fuel.
      </p>
    </section>
  `,
})
export class HeroSummary {
  private readonly store = inject(ScenarioStore);

  protected readonly data = computed<HeroData>(() => {
    const tab = this.store.activeTab();
    const locale = this.store.locale();
    const keep = this.store.keepDuration();
    const fmt = (v: number) => formatCurrency(v, locale, 0);

    if (tab === 'lease') {
      const lease = this.store.leasePaymentDetails();
      const monthly = lease.depreciationFee + lease.financeFee;
      const choice = this.store.leaseEndChoice();
      const term = this.store.leaseTerm();
      const termYears = Math.round(term / 12);
      const keepMonths = Math.max(keep * 12, 1);
      const initialDp = this.store.leaseDownPayment();

      let totalUpfront: number;
      let downCaption: string;
      if (choice === 'buyOut') {
        // 1 cycle (lease, then buy out). Buyout = residual + buyout fee +
        // (early-termination penalty if you exit before the term ends).
        const earlyExit = keepMonths < term ? this.store.earlyTerminationFee() : 0;
        const buyout = this.store.residualValue() + this.store.buyoutFee() + earlyExit;
        totalUpfront = initialDp + buyout;
        downCaption =
          earlyExit > 0
            ? `${fmt(initialDp)} down + ${fmt(buyout)} buyout (incl. early-exit penalty)`
            : `${fmt(initialDp)} down + ${fmt(buyout)} buyout`;
      } else {
        // Renew lease: each cycle is a fresh down payment. ceil(keep/term)
        // covers the partial-final-cycle case (model assumes a shorter
        // last lease, no early-termination there).
        const cycles = Math.max(Math.ceil(keepMonths / term), 1);
        totalUpfront = cycles * initialDp;
        downCaption =
          cycles > 1
            ? `${cycles} × ${fmt(initialDp)} downpayment (one per cycle)`
            : 'initial downpayment';
      }
      return {
        down: fmt(totalUpfront),
        downCaption,
        monthly: fmt(monthly),
        termMonths: term,
        // Asset value is always evaluated at the end of the keep horizon —
        // not the lease term — because keep can extend past the lease via
        // buyout (own the car for `keep − term` more years) or via
        // additional renew cycles. `store.residualValue()` is already at
        // `vehicleAge + keepDuration`, which is what we want.
        asset: choice === 'buyOut' ? fmt(this.store.residualValue()) : `${fmt(0)}`,
        assetCaption:
          choice === 'buyOut'
            ? `after ${keep} years (bought out at year ${termYears})`
            : `after ${keep} years (vehicle returned)`,
      };
    }
    if (tab === 'finance') {
      const principal = Math.max(
        this.store.purchasePrice() - this.store.financeDownPayment(),
        0,
      );
      const monthly = financePayment({
        principal,
        apr: this.store.financeApr(),
        termMonths: this.store.loanTerm(),
      });
      return {
        down: fmt(this.store.financeDownPayment()),
        downCaption: 'initial downpayment',
        monthly: fmt(monthly),
        termMonths: this.store.loanTerm(),
        asset: fmt(this.store.residualValue()),
        assetCaption: `after ${keep} years`,
      };
    }
    // cash
    return {
      down: fmt(this.store.purchasePrice()),
      downCaption: 'full purchase price',
      monthly: fmt(0),
      termMonths: 0,
      asset: fmt(this.store.residualValue()),
      assetCaption: `after ${keep} years`,
    };
  });

  /** Year-1 running-cost rate: insurance + maintenance (year-0 base) +
   * fuel for one year. Representative figure for the fineprint — costs
   * grow with age via the maintenance curve, but the year-1 rate gives
   * a reader-friendly anchor. */
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
