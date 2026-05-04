import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Toggle, ToggleOption } from '../../atoms/toggle/toggle';

const ON_OFF: readonly ToggleOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

const CHARGER: readonly ToggleOption[] = [
  { value: 'off', label: 'Public only' },
  { value: 'on', label: 'Installed' },
];

/**
 * EV-only context block: home charger + solar. Solar requires a charger;
 * the toggle is visually disabled in that case (and `setHomeChargerInstalled`
 * already clears solar when the charger goes off, so the booleans stay
 * coherent on the store side too).
 *
 * Self-renders nothing when `powertrain !== 'EV'`.
 */
@Component({
  selector: 'app-ev-setup',
  imports: [Toggle],
  template: `
    @if (visible()) {
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <span class="font-ui text-[0.62rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            Home charger
          </span>
          <app-toggle
            ariaLabel="Home charger installed"
            [options]="chargerOptions"
            [value]="chargerValue()"
            (valueChange)="store.setHomeChargerInstalled($event === 'on')"
          />
        </div>

        <div class="flex flex-col gap-1" [class.opacity-50]="!solarEnabled()">
          <span class="font-ui text-[0.62rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
            Solar
            @if (!solarEnabled()) {
              <span class="ml-1 text-tx-muted lowercase tracking-normal">
                (needs home charger)
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
      </div>
    }
  `,
})
export class EvSetup {
  protected readonly store = inject(ScenarioStore);
  protected readonly chargerOptions = CHARGER;
  protected readonly solarOptions = ON_OFF;

  protected readonly visible = computed(() => this.store.powertrain() === 'EV');
  protected readonly solarEnabled = computed(() => this.store.homeChargerInstalled());
  protected readonly chargerValue = computed(() =>
    this.store.homeChargerInstalled() ? 'on' : 'off',
  );
  protected readonly solarValue = computed(() => (this.store.solar() ? 'on' : 'off'));

  protected onSolarChange(value: string): void {
    if (!this.solarEnabled()) return; // tooltip says it's gated
    this.store.solar.set(value === 'on');
  }
}