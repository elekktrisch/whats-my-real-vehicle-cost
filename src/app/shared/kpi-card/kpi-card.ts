import { Component, Input } from '@angular/core';
import { InfoBadge } from '../info-badge/info-badge';

@Component({
  selector: 'app-kpi-card',
  imports: [InfoBadge],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) tip!: string;
  @Input({ required: true }) value!: string;
}