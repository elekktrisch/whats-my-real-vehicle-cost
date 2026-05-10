import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle, ToggleOption } from '../../atoms/toggle/toggle';
import { SliderControl } from '../../slider-control/slider-control';
import { Disclosure } from '../disclosure/disclosure';
import { ConflictPill } from '../conflict-pill/conflict-pill';
import { DepreciationCurveEditor } from '../depreciation-curve-editor/depreciation-curve-editor';
import { MoneyPipe } from '../../pipes/money.pipe';
import type { LeaseEndChoice } from '../../../scenario/scenario.types';

@Component({
  selector: 'app-lease-end-section',
  imports: [
    Toggle,
    SliderControl,
    Disclosure,
    ConflictPill,
    DepreciationCurveEditor,
    MoneyPipe,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col gap-3 mt-2 pt-3 border-t border-border" id="slider-leaseEndChoice">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim flex items-center gap-2">
          {{ 'leaseEnd.label' | transloco }}
          @if (store.leaseEndChoiceOverride() === null) {
            <span
              class="font-ui text-[0.65rem] uppercase tracking-[0.08em] text-tx-dim border border-border rounded px-[4px] py-px"
            >
              {{ 'common.auto' | transloco }}
            </span>
          } @else {
            <button
              type="button"
              (click)="store.applyLeaseEndChoice()"
              class="font-ui text-[0.7rem] text-tx-dim hover:text-accent transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 rounded px-[2px]"
              [title]="'common.resetToAuto' | transloco"
            >
              ↻ {{ 'common.reset' | transloco }}
            </button>
          }
        </span>
        <app-toggle
          [options]="choices()"
          [value]="choice()"
          (valueChange)="onChoice($event)"
          [ariaLabel]="'leaseEnd.aria' | transloco"
        />
      </div>
      @if (store.conflictByKey().get('leaseEndChoice'); as c) {
        <app-conflict-pill
          [visible]="true"
          [label]="c.label"
          [proposedValue]="c.proposedValue"
          [currentValue]="c.currentValue"
          [reason]="c.reason"
          (apply)="c.apply()"
          (keep)="c.keep()"
        />
      }

      @if (choice() === 'handBack') {
        <p class="font-ui text-[0.78rem] text-tx-muted leading-snug">
          {{ 'leaseEnd.handBackDesc' | transloco }}
        </p>
      } @else {
        <p class="font-ui text-[0.78rem] text-tx-muted leading-snug"
          [innerHTML]="'leaseEnd.buyOutDesc' | transloco: { residual: residualHtml() }"
        ></p>
      }

      <app-disclosure [label]="'common.advanced' | transloco">
        <div id="slider-leaseEndResidual">
          <div class="flex justify-end mb-1">
            <app-depreciation-curve-editor />
          </div>
          <app-slider-control
            [label]="'leaseEnd.residual.label' | transloco"
            [tip]="'leaseEnd.residual.tip' | transloco"
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
              [reason]="c.reason"
              (apply)="c.apply()"
              (keep)="c.keep()"
            />
          }
        </div>
        @if (choice() === 'handBack') {
          <app-slider-control
            [label]="'leaseEnd.dispositionFee.label' | transloco"
            [tip]="'leaseEnd.dispositionFee.tip' | transloco"
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
            [label]="'leaseEnd.excessWear.label' | transloco"
            [tip]="'leaseEnd.excessWear.tip' | transloco"
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
            [label]="'leaseEnd.mileageOverage.label' | transloco: { unit: distanceUnit() }"
            [tip]="'leaseEnd.mileageOverage.tip' | transloco"
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
            [label]="'leaseEnd.buyoutFee.label' | transloco"
            [tip]="'leaseEnd.buyoutFee.tip' | transloco"
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
            [label]="'leaseEnd.earlyTermination.label' | transloco"
            [tip]="'leaseEnd.earlyTermination.tip' | transloco"
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
              [reason]="c.reason"
              (apply)="c.apply()"
              (keep)="c.keep()"
            />
          }
          @if (!earlyTerminationApplies()) {
            <div class="font-ui text-[0.75rem] text-tx-dim -mt-3 leading-snug">
              {{
                'leaseEnd.earlyTermination.notApplicable'
                  | transloco: { keep: store.keepDuration(), term: store.leaseTerm() }
              }}
            </div>
          }
        </div>
      </app-disclosure>
    </div>
  `,
})
export class LeaseEndSection {
  protected readonly store = inject(ScenarioStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly choices = computed<readonly ToggleOption[]>(() => {
    const lang = this.store.language();
    return [
      {
        value: 'handBack',
        label: this.transloco.translate('leaseEnd.choice.handBack', {}, lang),
      },
      { value: 'buyOut', label: this.transloco.translate('leaseEnd.choice.buyOut', {}, lang) },
    ];
  });

  protected readonly choice = this.store.leaseEndChoice;

  protected readonly earlyTerminationApplies = computed(
    () => this.store.keepDuration() * 12 < this.store.leaseTerm(),
  );

  protected readonly leaseEndResidualMax = computed(() =>
    Math.min(100000, this.store.purchasePrice()),
  );

  protected readonly distanceUnit = computed(() => this.store.regionConfig().distanceUnit);
  protected readonly mileageOverageSuffix = computed(() => {
    const cfg = this.store.regionConfig();
    const cur = this.store.currencyDisplay();
    const unit = ` /${cfg.distanceUnit}`;
    return cur.after ? `${unit} ${cur.symbol}` : unit;
  });

  // Pre-formatted residual span (HTML, monospace) for the buyOut blurb.
  // Built outside the catalog because the styling is locale-independent.
  protected readonly residualHtml = computed(() => {
    const cur = this.store.currencyDisplay();
    const value = Math.round(this.store.residualValue()).toLocaleString(this.store.bcp47());
    const formatted = cur.after
      ? `${value} ${cur.symbol}`
      : `${cur.symbol}${value}`;
    return `<span class="font-mono text-tx">${formatted}</span>`;
  });

  protected onChoice(v: string): void {
    this.store.setLeaseEndChoice(v as LeaseEndChoice);
  }
}
