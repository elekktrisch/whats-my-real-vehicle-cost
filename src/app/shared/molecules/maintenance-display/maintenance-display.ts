import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { maintenanceAt } from '../../../scenario/calculations/maintenance';
import { formatCurrency } from '../../../scenario/region.config';
import { InfoBadge } from '../../info-badge/info-badge';

@Component({
  selector: 'app-maintenance-display',
  imports: [InfoBadge],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-1 font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
        Maintenance
        <app-info-badge
          tip="Auto-calculated from MSRP × baseline rate × category multiplier × mileage factor, modulated by the maintenance curve over age. Lease-renew resets the curve every cycle (new car each time)."
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
    const ctx = this.store.maintenanceContext();
    const keep = this.store.keepDuration();
    const startAge = this.store.vehicleAge();
    const region = this.store.region();

    const fmt = (v: number) => formatCurrency(v, region, 0);
    const yr0 = maintenanceAt(ctx, 0);

    if (tab === 'lease') {
      const choice = this.store.leaseEndChoice();
      if (choice === 'handBack') {
        return `${fmt(yr0)} / yr (resets each cycle)`;
      }
      const termYears = this.store.leaseTerm() / 12;
      const ownedYears = Math.max(keep - termYears, 0);
      if (ownedYears <= 0) return `${fmt(yr0)} / yr (flat during lease)`;
      const ownedYr1 = maintenanceAt(ctx, 0.5);
      return `flat during lease → ${fmt(ownedYr1)} / yr (year 1 owned)`;
    }

    const yr1 = maintenanceAt(ctx, startAge + 0.5);
    const yrN = maintenanceAt(ctx, startAge + Math.max(keep - 0.5, 0.5));
    return `${fmt(yr1)} / yr (year 1) → ${fmt(yrN)} / yr (year ${Math.round(keep)})`;
  });
}
