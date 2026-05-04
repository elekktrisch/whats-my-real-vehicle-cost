import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import { SliderControl } from '../../slider-control/slider-control';
import type { LeaseEndChoice } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-lease-end-section',
  imports: [Toggle, SliderControl],
  template: `
    <section class="bg-surface border border-border rounded-[14px] py-[22px] px-5">
      <header class="flex items-center justify-between gap-3 mb-5 pb-[14px] border-b border-border">
        <div class="font-ui text-[0.75rem] font-medium tracking-[0.15em] uppercase text-tx-dim">
          End of lease
        </div>
        <app-toggle
          [options]="choices"
          [value]="choice()"
          (valueChange)="onChoice($event)"
          ariaLabel="Lease end choice"
        />
      </header>

      @if (choice() === 'handBack') {
        <p class="font-ui text-[0.75rem] text-tx-muted mb-4 leading-relaxed">
          You switch for a new car at lease-end and sign a new lease for the new car. Disposition
          fee and any wear or mileage overage are paid at every cycle boundary; each new cycle also
          requires a fresh down payment.
        </p>
        <app-slider-control
          label="Disposition fee"
          tip="One-time fee paid when you return the leased car. Typical range 300–500."
          [min]="0"
          [max]="1000"
          [step]="25"
          [minLabel]="money(0)"
          [maxLabel]="money(1000)"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.dispositionFee()"
          (valueChange)="store.setDispositionFee($event)"
        />
        <app-slider-control
          label="Excess wear estimate"
          tip="A rough buffer for end-of-lease wear charges. ~500–1500 typical for a 3-yr lease; 2000+ with kids, pets or city parking."
          [min]="0"
          [max]="3000"
          [step]="50"
          [minLabel]="money(0)"
          [maxLabel]="money(3000)"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.excessWearEstimate()"
          (valueChange)="store.setExcessWearEstimate($event)"
        />
        <app-slider-control
          [label]="'Mileage overage rate (per ' + distanceUnit() + ')'"
          tip="Per-distance charge for going over the lease's mileage cap. Typically 0.15–0.30 per mile / 0.10–0.20 per km."
          [min]="0"
          [max]="1"
          [step]="0.01"
          [fractionDigits]="2"
          [minLabel]="money(0)"
          [maxLabel]="money(1)"
          [prefix]="currencyPrefix()"
          [suffix]="mileageOverageSuffix()"
          [value]="store.mileageOverageRate()"
          (valueChange)="store.setMileageOverageRate($event)"
        />
      } @else {
        <p class="font-ui text-[0.75rem] text-tx-muted mb-4 leading-relaxed">
          You buy the car at lease-end. Buyout price is the residual value (set in vehicle context),
          paid in cash. Costs after the buyout are insurance, maintenance and fuel only.
        </p>
        <div
          class="font-mono text-[0.78rem] text-tx-muted mb-3 px-3 py-[6px] bg-elevated rounded-md inline-block"
        >
          Buyout price ≈ {{ buyoutPrice() }}
        </div>
        <app-slider-control
          label="Buyout fee"
          tip="One-time administrative fee charged on top of the residual value when you exercise the lease buyout. Typical 300–500."
          [min]="0"
          [max]="1000"
          [step]="25"
          [minLabel]="money(0)"
          [maxLabel]="money(1000)"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.buyoutFee()"
          (valueChange)="store.setBuyoutFee($event)"
        />
      }

      <div
        [class.opacity-50]="!earlyTerminationApplies()"
        [class.pointer-events-none]="!earlyTerminationApplies()"
        class="mt-2"
      >
        <app-slider-control
          label="Early termination penalty"
          tip="Total amount the lessor charges when you exit before the lease term ends. Defaults to a depreciation-based approximation of typical lessor tables ((term − keep) / term × total depreciation); override with the exact figure from your contract's early-exit table. Capped at 90% of the financed portion. Applies to both renew-lease and buy-out modes."
          [min]="0"
          [max]="store.earlyTerminationFeeMax()"
          [step]="50"
          [minLabel]="money(0)"
          [maxLabel]="money(store.earlyTerminationFeeMax())"
          [prefix]="currencyPrefix()"
          [suffix]="currencySuffix()"
          [value]="store.earlyTerminationFee()"
          (valueChange)="store.setEarlyTerminationFee($event)"
        />
        @if (!earlyTerminationApplies()) {
          <div class="font-ui text-[0.75rem] text-tx-dim -mt-3 leading-relaxed">
            Not applicable: keep duration ({{ store.keepDuration() }} yr) is at or beyond the lease
            term ({{ store.leaseTerm() }} mo) — no early exit happens.
          </div>
        }
      </div>
    </section>
  `,
})
export class LeaseEndSection {
  protected readonly store = inject(ScenarioStore);

  protected readonly choices = [
    { value: 'handBack', label: 'Renew lease' },
    { value: 'buyOut', label: 'Buy out' },
  ] as const;

  protected readonly choice = this.store.leaseEndChoice;

  protected readonly buyoutPrice = computed(() => {
    const cfg = this.store.localeConfig();
    const v = this.store.residualValue().toLocaleString();
    return cfg.currencyAfter ? `${v} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${v}`;
  });

  protected readonly earlyTerminationApplies = computed(
    () => this.store.keepDuration() * 12 < this.store.leaseTerm(),
  );

  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );
  protected readonly distanceUnit = computed(() => this.store.localeConfig().distanceUnit);
  protected readonly mileageOverageSuffix = computed(() => {
    const cfg = this.store.localeConfig();
    const unit = ` /${cfg.distanceUnit}`;
    return cfg.currencyAfter ? `${unit} ${cfg.currencySymbol}` : unit;
  });

  protected money(value: number): string {
    const cfg = this.store.localeConfig();
    const k = value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(Math.round(value * 100) / 100);
    return cfg.currencyAfter ? `${k} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${k}`;
  }

  protected onChoice(v: string): void {
    this.store.setLeaseEndChoice(v as LeaseEndChoice);
  }
}
