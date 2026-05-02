import { Component, input } from '@angular/core';
import { KpiCard } from '../../kpi-card/kpi-card';

export interface KpiSpec {
  label: string;
  tip: string;
  value: string;
}

@Component({
  selector: 'app-kpi-bar',
  imports: [KpiCard],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
      @for (kpi of kpis(); track kpi.label) {
        <app-kpi-card [label]="kpi.label" [tip]="kpi.tip" [value]="kpi.value" />
      }
    </div>
  `,
})
export class KpiBar {
  readonly kpis = input.required<readonly KpiSpec[]>();
}