import { Component, Input } from '@angular/core';
import { InfoBadge } from '../info-badge/info-badge';

@Component({
  selector: 'app-kpi-card',
  imports: [InfoBadge],
  templateUrl: './kpi-card.html',
  host: {
    class:
      'block bg-surface border border-border rounded-[10px] py-[14px] px-4 transition-colors duration-[180ms] hover:border-border-strong',
  },
})
export class KpiCard {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) tip!: string;
  @Input({ required: true }) value!: string;
}