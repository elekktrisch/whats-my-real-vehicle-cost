import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle } from '../../atoms/toggle/toggle';
import { SliderControl } from '../../slider-control/slider-control';
import { Disclosure } from '../disclosure/disclosure';
import { ConflictPill } from '../conflict-pill/conflict-pill';
import { MoneyPipe } from '../../pipes/money.pipe';
import type { LeaseEndChoice } from '../../../scenario/scenario.types';

/**
 * Lease end-of-term controls. Embedded inside `<app-lease-fields>` (no
 * outer card of its own — the surrounding lease-fields slider-group owns
 * the card chrome).
 *
 *   - HandBack vs BuyOut toggle is always visible (it's a strategic choice,
 *     not an override).
 *   - Mode-specific copy + buyout-price display stay visible.
 *   - The five fee sliders (disposition, excess-wear, mileage-overage,
 *     buyout fee, early-termination) live behind a `<app-disclosure>`
 *     because most users keep the locale defaults.
 */
@Component({
  selector: 'app-lease-end-section',
  imports: [Toggle, SliderControl, Disclosure, ConflictPill, MoneyPipe],
  template: `
    <div class="flex flex-col gap-3 mt-2 pt-3 border-t border-border" id="slider-leaseEndChoice">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim flex items-center gap-2">
          End of lease
          @if (store.leaseEndChoiceOverride() === null) {
            <span
              class="font-ui text-[0.65rem] uppercase tracking-[0.08em] text-tx-dim border border-border rounded px-[4px] py-px"
            >
              auto
            </span>
          } @else {
            <button
              type="button"
              (click)="store.applyLeaseEndChoice()"
              class="font-ui text-[0.7rem] text-tx-dim hover:text-accent transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 rounded px-[2px]"
              title="Reset to auto-derived choice"
            >
              ↻ reset
            </button>
          }
        </span>
        <app-toggle
          [options]="choices"
          [value]="choice()"
          (valueChange)="onChoice($event)"
          ariaLabel="Lease end choice"
        />
      </div>
      @if (store.conflictByKey().get('leaseEndChoice'); as c) {
        <app-conflict-pill
          [visible]="true"
          [label]="c.label"
          [proposedValue]="c.proposedValue"
          [currentValue]="c.currentValue"
          (apply)="c.apply()"
          (keep)="c.keep()"
        />
      }

      @if (choice() === 'handBack') {
        <p class="font-ui text-[0.78rem] text-tx-muted leading-snug">
          You switch for a new car at lease-end and sign a new lease.
          Disposition fee + wear/mileage overage are paid at every cycle
          boundary; each new cycle also requires a fresh down payment.
        </p>
      } @else {
        <p class="font-ui text-[0.78rem] text-tx-muted leading-snug">
          You buy the car at lease-end. Buyout price ≈
          <span class="font-mono text-tx">{{ store.residualValue() | money }}</span> (residual
          value), paid in cash. Costs after the buyout are insurance,
          maintenance and fuel only.
        </p>
      }

      <app-disclosure label="+ Advanced">
        <div id="slider-leaseEndResidual">
          <app-slider-control
            label="Residual at lease end"
            tip="Contractual residual value at the end of the lease term. Drives the monthly lease payment formula (depreciates from cap cost down to this number over the term). Auto-derived from the depreciation curve at vehicleAge + leaseTerm; override with the figure from your contract."
            [min]="0"
            [max]="leaseEndResidualMax()"
            [step]="500"
            [minLabel]="0 | money:'compact'"
            [maxLabel]="leaseEndResidualMax() | money:'compact'"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [value]="store.leaseEndResidual()"
            (valueChange)="store.leaseEndResidualOverride.set($event)"
            [isAuto]="store.leaseEndResidualOverride() === null"
            (reset)="store.applyLeaseEndResidual()"
          />
          @if (store.conflictByKey().get('leaseEndResidual'); as c) {
            <app-conflict-pill
              [visible]="true"
              [label]="c.label"
              [proposedValue]="c.proposedValue"
              [currentValue]="c.currentValue"
              (apply)="c.apply()"
              (keep)="c.keep()"
            />
          }
        </div>
        @if (choice() === 'handBack') {
          <app-slider-control
            label="Disposition fee"
            tip="One-time fee paid when you return the leased car. Typical range 300–500."
            [min]="0"
            [max]="1000"
            [step]="25"
            [minLabel]="0 | money:'compact'"
            [maxLabel]="1000 | money:'compact'"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [value]="store.dispositionFee()"
            (valueChange)="store.dispositionFeeOverride.set($event)"
          />
          <app-slider-control
            label="Excess wear estimate"
            tip="A rough buffer for end-of-lease wear charges. ~500–1500 typical for a 3-yr lease; 2000+ with kids, pets or city parking."
            [min]="0"
            [max]="3000"
            [step]="50"
            [minLabel]="0 | money:'compact'"
            [maxLabel]="3000 | money:'compact'"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [value]="store.excessWearEstimate()"
            (valueChange)="store.excessWearOverride.set($event)"
          />
          <app-slider-control
            [label]="'Mileage overage rate (per ' + distanceUnit() + ')'"
            tip="Per-distance charge for going over the lease's mileage cap. Typically 0.15–0.30 per mile / 0.10–0.20 per km."
            [min]="0"
            [max]="1"
            [step]="0.01"
            [fractionDigits]="2"
            [minLabel]="0 | money:2"
            [maxLabel]="1 | money:2"
            [prefix]="store.currencyPrefix()"
            [suffix]="mileageOverageSuffix()"
            [value]="store.mileageOverageRate()"
            (valueChange)="store.mileageOverageRateOverride.set($event)"
          />
        } @else {
          <app-slider-control
            label="Buyout fee"
            tip="One-time administrative fee charged on top of the residual value when you exercise the lease buyout. Typical 300–500."
            [min]="0"
            [max]="1000"
            [step]="25"
            [minLabel]="0 | money:'compact'"
            [maxLabel]="1000 | money:'compact'"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [value]="store.buyoutFee()"
            (valueChange)="store.buyoutFeeOverride.set($event)"
          />
        }
        <div
          id="slider-earlyTerminationFee"
          [class.opacity-50]="!earlyTerminationApplies()"
          [class.pointer-events-none]="!earlyTerminationApplies()"
        >
          <app-slider-control
            label="Early termination penalty"
            tip="Total amount the lessor charges when you exit before the lease term ends. Defaults to a depreciation-based approximation of typical lessor tables ((term − keep) / term × total depreciation); override with the exact figure from your contract's early-exit table. Capped at 90% of the financed portion. Applies to both renew-lease and buy-out modes."
            [min]="0"
            [max]="store.earlyTerminationFeeMax()"
            [step]="50"
            [minLabel]="0 | money:'compact'"
            [maxLabel]="store.earlyTerminationFeeMax() | money:'compact'"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [value]="store.earlyTerminationFee()"
            (valueChange)="store.earlyTerminationFeeOverride.set($event)"
            [isAuto]="store.earlyTerminationFeeOverride() === null"
            (reset)="store.applyEarlyTerminationFee()"
          />
          @if (store.conflictByKey().get('earlyTerminationFee'); as c) {
            <app-conflict-pill
              [visible]="true"
              [label]="c.label"
              [proposedValue]="c.proposedValue"
              [currentValue]="c.currentValue"
              (apply)="c.apply()"
              (keep)="c.keep()"
            />
          }
          @if (!earlyTerminationApplies()) {
            <div class="font-ui text-[0.75rem] text-tx-dim -mt-3 leading-snug">
              Not applicable: keep duration ({{ store.keepDuration() }} yr) is at
              or beyond the lease term ({{ store.leaseTerm() }} mo) — no early
              exit happens.
            </div>
          }
        </div>
      </app-disclosure>
    </div>
  `,
})
export class LeaseEndSection {
  protected readonly store = inject(ScenarioStore);

  protected readonly choices = [
    { value: 'handBack', label: 'Renew lease' },
    { value: 'buyOut', label: 'Buy out' },
  ] as const;

  protected readonly choice = this.store.leaseEndChoice;

  protected readonly earlyTerminationApplies = computed(
    () => this.store.keepDuration() * 12 < this.store.leaseTerm(),
  );

  protected readonly leaseEndResidualMax = computed(() =>
    Math.min(100000, this.store.purchasePrice()),
  );

  protected readonly distanceUnit = computed(() => this.store.localeConfig().distanceUnit);
  protected readonly mileageOverageSuffix = computed(() => {
    const cfg = this.store.localeConfig();
    const unit = ` /${cfg.distanceUnit}`;
    return cfg.currencyAfter ? `${unit} ${cfg.currencySymbol}` : unit;
  });

  protected onChoice(v: string): void {
    this.store.setLeaseEndChoice(v as LeaseEndChoice);
  }
}
