import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { maintenanceAt } from '../../../scenario/calculations/maintenance';
import { formatCurrency } from '../../../scenario/locale.config';
import { InfoBadge } from '../../info-badge/info-badge';

/**
 * Mode-aware read-only display of maintenance, replacing the slider that
 * lived here pre-Phase A. Per plan §Controls — Maintenance:
 *  - cash / finance: "$X/yr (year 1) → $Y/yr (year N)"
 *  - lease renew:   "$X/yr (resets each cycle)"
 *  - lease buyout:  "flat during lease → $X/yr (year 1 owned)"
 *
 * The figures come from the same `maintenanceAt(base, k, age)` curve the
 * chart uses, so the display row and the chart maintenance band always agree.
 */
@Component({
  selector: 'app-maintenance-display',
  imports: [InfoBadge],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-1 font-ui text-[0.62rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
        Maintenance
        <app-info-badge
          tip="Auto-calculated from MSRP × locale baseline × category multiplier, with a linear age curve. Lease-renew resets the curve every cycle (new car each time)."
        />
      </div>
      <div class="font-mono text-[0.78rem] text-tx tracking-[-0.01em]">
        {{ copy() }}
      </div>
    </div>
  `,
})
export class MaintenanceDisplay {
  protected readonly store = inject(ScenarioStore);

  protected readonly copy = computed(() => {
    const tab = this.store.activeTab();
    const base = this.store.maintenance();
    const k = this.store.maintenanceK();
    const keep = this.store.keepDuration();
    const startAge = this.store.vehicleAge();
    const locale = this.store.locale();

    const fmt = (v: number) => formatCurrency(v, locale, 0);

    if (tab === 'lease') {
      const choice = this.store.leaseEndChoice();
      if (choice === 'handBack') {
        // renew lease — resets every cycle
        return `${fmt(base)} / yr (resets each cycle)`;
      }
      // buy out — flat during lease, then climbs in owned tail
      const termYears = this.store.leaseTerm() / 12;
      const ownedYears = Math.max(keep - termYears, 0);
      if (ownedYears <= 0) return `${fmt(base)} / yr (flat during lease)`;
      const ownedYr1 = maintenanceAt(base, k, 0.5); // mid of year 1 of ownership
      return `flat during lease → ${fmt(ownedYr1)} / yr (year 1 owned)`;
    }

    // cash / finance — single car owned across keep, starts at vehicleAge
    const yr1 = maintenanceAt(base, k, startAge + 0.5);
    const yrN = maintenanceAt(base, k, startAge + Math.max(keep - 0.5, 0.5));
    return `${fmt(yr1)} / yr (year 1) → ${fmt(yrN)} / yr (year ${Math.round(keep)})`;
  });
}