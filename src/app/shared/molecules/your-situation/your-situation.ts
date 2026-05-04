import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle, ToggleOption } from '../../atoms/toggle/toggle';
import { SliderGroup } from '../slider-group/slider-group';
import type { ChargerStatus } from '../../../scenario/scenario.types';

const OPP_COST_OPTIONS: readonly ToggleOption[] = [
  { value: 'savings', label: 'Savings · 1%' },
  { value: 'investing', label: 'Investing · 6%' },
];
const OPP_COST_RATE: Record<string, number> = {
  savings: 0.01,
  investing: 0.06,
};

const CHARGER_OPTIONS: readonly ToggleOption[] = [
  { value: 'none', label: 'None' },
  { value: 'installed', label: 'Installed' },
  { value: 'buying', label: 'Buying' },
];

const SOLAR_OPTIONS: readonly ToggleOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

/**
 * "Your situation" — personal/financial context that applies across all
 * financing methods.
 *
 *   - Opp-cost preference: 2-toggle (Savings 1% / Investing 6%). Sets
 *     `store.opportunityCostRate`. The two presets cover the common
 *     mental models without forcing the user to nail down a number.
 *   - Home charger plan: 3-option toggle (None / Installed / Buying).
 *     EV-only — the row hides for ICE.
 *   - Solar: on/off. Disabled when charger is None.
 *
 * Section is always visible; on ICE only the opp-cost toggle renders.
 */
@Component({
  selector: 'app-your-situation',
  imports: [Toggle, SliderGroup],
  template: `
    <app-slider-group title="Your situation">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            Opportunity cost
          </span>
          <span class="font-ui text-[0.78rem] text-tx-muted leading-snug">
            What would you do with the money instead? We charge this rate on
            each financing method's down payment (or full price for cash).
          </span>
          <app-toggle
            ariaLabel="Opportunity cost rate preference"
            [options]="oppCostOptions"
            [value]="oppCostValue()"
            (valueChange)="onOppCostChange($event)"
          />
        </div>

        @if (showEvControls()) {
          <div class="flex flex-col gap-1">
            <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
              Home charger
            </span>
            <span class="font-ui text-[0.78rem] text-tx-muted leading-snug">
              "Buying" adds the install cost to TCO; "Installed" is treated
              as a sunk cost and isn't counted.
            </span>
            <app-toggle
              ariaLabel="Home charger plan"
              [options]="chargerOptions"
              [value]="store.chargerStatus()"
              (valueChange)="onChargerChange($event)"
            />
          </div>

          <div class="flex flex-col gap-1" [class.opacity-50]="!solarEnabled()">
            <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
              Solar
              @if (!solarEnabled()) {
                <span class="ml-1 text-tx-muted lowercase tracking-normal">
                  (only relevant with a home charger)
                </span>
              }
            </span>
            <app-toggle
              ariaLabel="Home solar charging"
              [options]="solarOptions"
              [value]="solarValue()"
              (valueChange)="onSolarChange($event)"
            />
          </div>
        }
      </div>
    </app-slider-group>
  `,
})
export class YourSituation {
  protected readonly store = inject(ScenarioStore);
  protected readonly oppCostOptions = OPP_COST_OPTIONS;
  protected readonly chargerOptions = CHARGER_OPTIONS;
  protected readonly solarOptions = SOLAR_OPTIONS;

  protected readonly showEvControls = computed(() => this.store.powertrain() === 'EV');
  protected readonly solarEnabled = computed(() => this.store.chargerStatus() !== 'none');

  /**
   * Map the current numeric rate to one of the two presets. Anything < 3%
   * snaps to "savings"; ≥ 3% snaps to "investing". Covers the case where a
   * pre-existing URL or future custom rate doesn't match exactly.
   */
  protected readonly oppCostValue = computed(() =>
    this.store.opportunityCostRate() < 0.03 ? 'savings' : 'investing',
  );
  protected readonly solarValue = computed(() => (this.store.solar() ? 'on' : 'off'));

  protected onOppCostChange(value: string): void {
    const rate = OPP_COST_RATE[value];
    if (rate !== undefined) this.store.opportunityCostRate.set(rate);
  }

  protected onChargerChange(value: string): void {
    this.store.setChargerStatus(value as ChargerStatus);
  }

  protected onSolarChange(value: string): void {
    if (!this.solarEnabled()) return;
    this.store.solar.set(value === 'on');
  }
}