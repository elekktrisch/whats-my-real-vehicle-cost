import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { maintenanceAt } from '../../../scenario/calculations/maintenance';
import { formatCurrency } from '../../../scenario/region.config';
import { InfoBadge } from '../../info-badge/info-badge';

@Component({
  selector: 'app-maintenance-display',
  imports: [InfoBadge, TranslocoPipe],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-1 font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
        {{ 'maintenance.label' | transloco }}
        <app-info-badge [tip]="'maintenance.tip' | transloco" />
      </div>
      <div class="font-mono text-[0.78rem] text-tx tracking-[-0.01em]">
        {{ copy() }}
      </div>
    </div>
  `,
})
export class MaintenanceDisplay {
  protected readonly store = inject(ScenarioStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly copy = computed(() => {
    const tab = this.store.activeTab();
    const ctx = this.store.maintenanceContext();
    const keep = this.store.keepDuration();
    const startAge = this.store.vehicleAge();
    const fmtCtx = this.store.formatContext();
    const lang = this.store.language();
    const t = (k: string, p?: Record<string, unknown>) => this.transloco.translate(k, p, lang);

    const fmt = (v: number) => formatCurrency(v, fmtCtx, 0);
    const yr0 = maintenanceAt(ctx, 0);

    if (tab === 'lease') {
      const choice = this.store.leaseEndChoice();
      if (choice === 'handBack') {
        return t('maintenance.display.resetsEachCycle', { perYear: fmt(yr0) });
      }
      const termYears = this.store.leaseTerm() / 12;
      const ownedYears = Math.max(keep - termYears, 0);
      if (ownedYears <= 0)
        return t('maintenance.display.flatDuringLease', { perYear: fmt(yr0) });
      const ownedYr1 = maintenanceAt(ctx, 0.5);
      return t('maintenance.display.flatThenOwned', { perYear: fmt(ownedYr1) });
    }

    const yr1 = maintenanceAt(ctx, startAge + 0.5);
    const yrN = maintenanceAt(ctx, startAge + Math.max(keep - 0.5, 0.5));
    return t('maintenance.display.range', {
      yr1: fmt(yr1),
      yrN: fmt(yrN),
      year: Math.round(keep),
    });
  });
}
