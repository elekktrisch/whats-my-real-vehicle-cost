import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { LeaseEndSection } from '../../shared/molecules/lease-end-section/lease-end-section';

/**
 * Lease-specific controls — the Mode block when active mode is 'lease'.
 * Includes APR + term + down payment, then HandBack/BuyOut + lease-end
 * fees disclosure (per Phase plan §Q4=B).
 */
@Component({
  selector: 'app-lease-fields',
  imports: [SliderControl, SliderGroup, LeaseEndSection],
  template: `
    <div role="tabpanel" id="modepanel-lease" aria-labelledby="modetab-lease">
      <app-slider-group title="Lease financing">
        <app-slider-control
          label="APR"
          tip="The annual percentage rate (Effektiver Jahreszins in EU). Internally we convert to a money factor. US contracts charge interest on the average of cap + residual; EU contracts charge interest on the financed amount only — same APR, different finance-fee math."
          [min]="0"
          [max]="20"
          [step]="0.05"
          minLabel="0%"
          maxLabel="20%"
          suffix="%"
          [fractionDigits]="2"
          [value]="store.leaseApr()"
          (valueChange)="store.leaseApr.set($event)"
        />
        <app-slider-control
          label="Lease term"
          tip="How long the lease runs. Common terms are 24, 36, 48, or 60 months."
          [min]="12"
          [max]="84"
          [step]="1"
          minLabel="12 mo"
          maxLabel="84 mo"
          suffix=" mo"
          [value]="store.leaseTerm()"
          (valueChange)="store.leaseTerm.set($event)"
        />
        <app-slider-control
          label="Down payment"
          tip="Cash put down on the lease. Stored separately from the loan down payment so you can compare e.g. $5k down on a lease vs. $0 on a loan. Capped at the purchase price."
          [min]="0"
          [max]="downPaymentMax()"
          [step]="500"
          [minLabel]="lo(0)"
          [maxLabel]="lo(downPaymentMax())"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.leaseDownPayment()"
          (valueChange)="store.leaseDownPayment.set($event)"
        />

        <app-lease-end-section />
      </app-slider-group>
    </div>
  `,
})
export class LeaseFields {
  protected readonly store = inject(ScenarioStore);

  protected readonly downPaymentMax = computed(() =>
    Math.min(80000, this.store.purchasePrice()),
  );
  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );
  protected lo(value: number): string {
    const cfg = this.store.localeConfig();
    const k = value >= 1000 ? `${value / 1000}k` : String(value);
    return cfg.currencyAfter ? `${k} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${k}`;
  }
}