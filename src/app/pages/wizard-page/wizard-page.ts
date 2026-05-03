import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScenarioStore } from '../../scenario/scenario.store';
import { defaultScenario } from '../../scenario/scenario.defaults';
import { Button } from '../../shared/atoms/button/button';
import { Toggle } from '../../shared/atoms/toggle/toggle';
import { Icon } from '../../shared/atoms/icon/icon';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { LocaleSelector } from '../../shared/molecules/locale-selector/locale-selector';
import { PowertrainSelector } from '../../shared/molecules/powertrain-selector/powertrain-selector';
import type { Tab } from '../../scenario/scenario.types';

@Component({
  selector: 'app-wizard-page',
  imports: [Button, Toggle, Icon, SliderControl, LocaleSelector, PowertrainSelector],
  template: `
    <main class="min-h-[100dvh] flex flex-col items-center px-6 py-10 relative">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_70%_50%_at_50%_-5%,rgba(79,142,247,0.07)_0%,transparent_70%)]"
      ></div>

      <article class="relative w-full max-w-[680px] flex flex-col gap-5">
        <header class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <app-icon name="logo" [size]="20" />
            <span class="font-ui text-[1rem] font-bold tracking-[0.03em] text-tx"
              >WhatsMyVehicleCost</span
            >
          </div>
          <button
            type="button"
            (click)="startOver()"
            class="font-ui text-[0.65rem] tracking-[0.12em] uppercase text-tx-dim hover:text-tx-muted transition-colors duration-150 flex items-center gap-1"
          >
            <app-icon name="reset" [size]="13" />
            Start over
          </button>
        </header>

        <section class="bg-surface border border-border rounded-[14px] p-6 sm:p-8">
          <div
            class="font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase text-accent mb-2"
          >
            Setup · 7 questions
          </div>
          <h1
            class="font-ui text-[1.6rem] sm:text-[1.9rem] font-medium tracking-[-0.02em] text-tx leading-[1.1] mb-2"
          >
            Tell us about the car.
          </h1>
          <p class="font-ui text-[0.85rem] text-tx-muted leading-[1.6] max-w-[520px]">
            Select where you plan to buy, and what kind of drivetrain will be in the car. Drag the sliders to your real numbers — we
            recommend a tab and you can override.
          </p>

          <div class="flex flex-wrap items-center gap-3 mt-6">
            <div class="flex items-center gap-2">
              <span class="font-ui text-[0.62rem] tracking-[0.13em] uppercase text-tx-dim"
                >Locale</span
              >
              <app-locale-selector />
            </div>
            <div class="flex items-center gap-2">
              <span class="font-ui text-[0.62rem] tracking-[0.13em] uppercase text-tx-dim"
                >Powertrain</span
              >
              <app-powertrain-selector />
            </div>
          </div>
        </section>

        <section class="bg-surface border border-border rounded-[14px] p-6 sm:p-8">
          <ol class="flex flex-col gap-1 list-none">
            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                01 · Keep duration
              </div>
              <app-slider-control
                label="How long do you plan to keep the car?"
                tip="Your full ownership horizon — sets the chart x-axis and the tab recommendation."
                [min]="1"
                [max]="10"
                [step]="1"
                minLabel="1 yr"
                maxLabel="10 yr"
                suffix=" yr"
                [value]="store.keepDuration()"
                (valueChange)="store.keepDuration.set($event)"
              />
            </li>

            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                02 · Annual mileage
              </div>
              <app-slider-control
                label="How much will you drive each year?"
                tip="Drives fuel cost and the lease overage risk."
                [min]="2000"
                [max]="40000"
                [step]="500"
                [minLabel]="distanceLabel(2000)"
                [maxLabel]="distanceLabel(40000)"
                [suffix]="' ' + distanceUnit()"
                [value]="store.annualMileage()"
                (valueChange)="store.annualMileage.set($event)"
              />
            </li>

            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                03 · Purchase price
              </div>
              <app-slider-control
                label="What does the car cost?"
                tip="Negotiated purchase price — the basis for cap cost, depreciation and category."
                [min]="5000"
                [max]="150000"
                [step]="500"
                [minLabel]="moneyLabel(5000)"
                [maxLabel]="moneyLabel(150000)"
                [prefix]="currencyPrefix()"
                [suffix]="currencySuffix()"
                [value]="store.purchasePrice()"
                (valueChange)="store.purchasePrice.set($event)"
              />
            </li>

            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                04 · Residual value
              </div>
              <app-slider-control
                label="What will the car be worth at the end?"
                tip="Used for the lease residual and the depreciation curve. Defaults to ~50% of purchase price; lower it for high-mileage or beat-up cars. Capped at the purchase price."
                [min]="0"
                [max]="residualMax()"
                [step]="500"
                [minLabel]="moneyLabel(0)"
                [maxLabel]="moneyLabel(residualMax())"
                [prefix]="currencyPrefix()"
                [suffix]="currencySuffix()"
                [value]="store.residualValue()"
                (valueChange)="store.residualValue.set($event)"
              />
            </li>

            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                05 · Down payment / cash on hand
              </div>
              <app-slider-control
                label="How much cash can you put toward this?"
                tip="At ≥ 80% of purchase price we'll recommend Cash. Otherwise drives cap-cost reduction or the loan principal. Capped at the purchase price."
                [min]="0"
                [max]="downPaymentMax()"
                [step]="500"
                [minLabel]="moneyLabel(0)"
                [maxLabel]="moneyLabel(downPaymentMax())"
                [prefix]="currencyPrefix()"
                [suffix]="currencySuffix()"
                [value]="store.leaseDownPayment()"
                (valueChange)="setBothDownPayments($event)"
              />
            </li>

            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                06 · What's your spare cash doing?
              </div>
              <div class="flex flex-col gap-2 pt-1">
                <p class="font-ui text-[0.78rem] text-tx-muted leading-snug max-w-[520px]">
                  If you didn't put cash into this car, where would it sit? Sets the
                  opportunity-cost rate used in the running-costs comparison across tabs.
                </p>
                <app-toggle
                  [options]="investmentStyleOptions"
                  [value]="investmentStyle()"
                  (valueChange)="setInvestmentStyle($event)"
                  ariaLabel="Investment style"
                />
                <span class="font-mono text-[0.62rem] text-tx-dim">
                  Currently {{ (store.opportunityCostRate() * 100).toFixed(1) }}% / yr — adjust
                  freely on any tab.
                </span>
              </div>
            </li>

            <li class="wizard-question">
              <div class="font-ui text-[0.62rem] tracking-[0.14em] uppercase text-tx-dim mb-1">
                07 · Vehicle age
              </div>
              <app-slider-control
                label="How old is the car?"
                tip="0 means new. For used cars we back-derive the original MSRP from age + purchase price."
                [min]="0"
                [max]="10"
                [step]="1"
                minLabel="0 yr"
                maxLabel="10 yr"
                suffix=" yr"
                [value]="store.vehicleAge()"
                (valueChange)="store.vehicleAge.set($event)"
              />
            </li>
          </ol>
        </section>

        <section
          class="bg-surface border border-accent/30 rounded-[14px] p-6 sm:p-8 relative overflow-hidden"
        >
          <div
            aria-hidden="true"
            class="absolute -top-16 -right-16 w-56 h-56 [background:radial-gradient(circle,rgba(79,142,247,0.07)_0%,transparent_60%)]"
          ></div>

          <div class="relative">
            <div
              class="font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase text-accent mb-2"
            >
              Recommendation
            </div>
            <div class="flex items-center gap-2 mb-3">
              <span
                class="font-ui text-[1.6rem] font-medium text-tx tracking-[-0.02em] capitalize"
                >{{ store.recommendedTab().tab }}</span
              >
              <span
                class="font-mono text-[0.6rem] tracking-[0.1em] uppercase rounded-full bg-accent/15 text-accent px-[8px] py-[2px]"
                >Recommended</span
              >
            </div>
            <p class="font-ui text-[0.82rem] text-tx-muted leading-[1.55] max-w-[520px]">
              {{ store.recommendedTab().reason }}
            </p>

            <div class="flex flex-wrap gap-2 mt-6">
              @for (t of tabs; track t) {
                <app-button
                  [variant]="t === store.recommendedTab().tab ? 'primary' : 'secondary'"
                  size="md"
                  (click)="goToTab(t)"
                >
                  Start with {{ t }}
                </app-button>
              }
            </div>
          </div>
        </section>
      </article>
    </main>
  `,
  styles: [
    `
      .wizard-question {
        padding-top: 8px;
      }
      .wizard-question + .wizard-question {
        border-top: 1px solid var(--color-border);
        margin-top: 8px;
        padding-top: 18px;
      }
    `,
  ],
})
export class WizardPage {
  protected readonly store = inject(ScenarioStore);
  private readonly router = inject(Router);

  protected readonly investmentStyleOptions = [
    { value: 'savings', label: 'Sits in savings (1%)' },
    { value: 'investing', label: 'Goes to investments (6%)' },
  ] as const;
  /** Threshold for "is the user currently in investing mode?" — anything above
   * 3% lands closer to investment territory than to a savings account. */
  protected readonly investmentStyle = computed(() =>
    this.store.opportunityCostRate() >= 0.03 ? 'investing' : 'savings',
  );
  protected readonly tabs: readonly Tab[] = ['lease', 'finance', 'cash'];

  protected readonly distanceUnit = computed(() => this.store.localeConfig().distanceUnit);

  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );

  protected readonly downPaymentMax = computed(() => Math.min(80000, this.store.purchasePrice()));
  protected readonly residualMax = computed(() => Math.min(100000, this.store.purchasePrice()));

  protected setInvestmentStyle(style: string): void {
    this.store.opportunityCostRate.set(style === 'investing' ? 0.06 : 0.01);
  }

  protected setBothDownPayments(value: number): void {
    // Wizard captures one "cash on hand" number; mirror it into both per-tab
    // signals so the user sees the same starting value if they switch tabs.
    this.store.leaseDownPayment.set(value);
    this.store.financeDownPayment.set(value);
  }

  protected moneyLabel(v: number): string {
    const cfg = this.store.localeConfig();
    const k = v >= 1000 ? `${v / 1000}k` : String(v);
    return cfg.currencyAfter ? `${k} ${cfg.currencySymbol}` : `${cfg.currencySymbol}${k}`;
  }

  protected distanceLabel(v: number): string {
    const k = v >= 1000 ? `${v / 1000}k` : String(v);
    return `${k} ${this.distanceUnit()}`;
  }

  protected goToTab(tab: Tab): void {
    this.store.activeTab.set(tab);
    this.router.navigate(['/', tab]);
  }

  protected startOver(): void {
    this.store.applySnapshot(defaultScenario());
  }
}
