import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle, ToggleOption } from '../../atoms/toggle/toggle';
import { SliderGroup } from '../slider-group/slider-group';
import type { ChargerStatus } from '../../../scenario/scenario.types';

const OPP_COST_RATE: Record<string, number> = {
  savings: 0.01,
  investing: 0.06,
};

@Component({
  selector: 'app-your-situation',
  imports: [Toggle, SliderGroup, TranslocoPipe],
  template: `
    <app-slider-group [title]="'situation.groupTitle' | transloco">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            {{ 'situation.oppCost.label' | transloco }}
          </span>
          <span class="font-ui text-[0.78rem] text-tx-muted leading-snug">
            {{ 'situation.oppCost.description' | transloco }}
          </span>
          <app-toggle
            [ariaLabel]="'situation.oppCost.label' | transloco"
            [options]="oppCostOptions()"
            [value]="oppCostValue()"
            (valueChange)="onOppCostChange($event)"
          />
        </div>

        @if (showEvControls()) {
          <div class="flex flex-col gap-1">
            <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
              {{ 'situation.charger.label' | transloco }}
            </span>
            <span class="font-ui text-[0.78rem] text-tx-muted leading-snug">
              {{ 'situation.charger.description' | transloco }}
            </span>
            <app-toggle
              [ariaLabel]="'situation.charger.label' | transloco"
              [options]="chargerOptions()"
              [value]="store.chargerStatus()"
              (valueChange)="onChargerChange($event)"
            />
          </div>

          <div class="flex flex-col gap-1" [class.opacity-50]="!solarEnabled()">
            <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
              {{ 'situation.solar.label' | transloco }}
              @if (!solarEnabled()) {
                <span class="ml-1 text-tx-muted lowercase tracking-normal">
                  ({{ 'situation.solar.gating' | transloco }})
                </span>
              }
            </span>
            <span class="font-ui text-[0.78rem] text-tx-muted leading-snug">
              {{ 'situation.solar.description' | transloco }}
            </span>
            <app-toggle
              [ariaLabel]="'situation.solar.label' | transloco"
              [options]="solarOptions()"
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
  private readonly transloco = inject(TranslocoService);

  protected readonly oppCostOptions = computed<readonly ToggleOption[]>(() => {
    const lang = this.store.language();
    return [
      { value: 'savings', label: this.transloco.translate('situation.oppCost.savings', {}, lang) },
      {
        value: 'investing',
        label: this.transloco.translate('situation.oppCost.investing', {}, lang),
      },
    ];
  });
  protected readonly chargerOptions = computed<readonly ToggleOption[]>(() => {
    const lang = this.store.language();
    return [
      { value: 'none', label: this.transloco.translate('situation.charger.none', {}, lang) },
      {
        value: 'installed',
        label: this.transloco.translate('situation.charger.installed', {}, lang),
      },
      { value: 'buying', label: this.transloco.translate('situation.charger.buying', {}, lang) },
    ];
  });
  protected readonly solarOptions = computed<readonly ToggleOption[]>(() => {
    const lang = this.store.language();
    return [
      { value: 'off', label: this.transloco.translate('situation.solar.off', {}, lang) },
      { value: 'on', label: this.transloco.translate('situation.solar.on', {}, lang) },
    ];
  });

  protected readonly showEvControls = computed(() => this.store.powertrain() === 'EV');
  protected readonly solarEnabled = computed(() => this.store.chargerStatus() !== 'none');

  // Snap to a preset: < 3% → savings, ≥ 3% → investing. Handles pre-existing
  // URLs or future custom rates that don't match either preset exactly.
  protected readonly oppCostValue = computed(() =>
    this.store.opportunityCostRate() < 0.03 ? 'savings' : 'investing',
  );
  protected readonly solarValue = computed(() => (this.store.solar() ? 'on' : 'off'));

  private readonly oppCostStash: Record<'savings' | 'investing', number> = {
    savings: OPP_COST_RATE['savings'],
    investing: OPP_COST_RATE['investing'],
  };

  protected onOppCostChange(value: string): void {
    if (value !== 'savings' && value !== 'investing') return;
    const currentRate = this.store.opportunityCostRate();
    const currentSide = currentRate < 0.03 ? 'savings' : 'investing';
    if (value === currentSide) return;
    this.oppCostStash[currentSide] = currentRate;
    this.store.opportunityCostRate.set(this.oppCostStash[value]);
  }

  protected onChargerChange(value: string): void {
    this.store.setChargerStatus(value as ChargerStatus);
  }

  protected onSolarChange(value: string): void {
    if (!this.solarEnabled()) return;
    this.store.solar.set(value === 'on');
  }
}
