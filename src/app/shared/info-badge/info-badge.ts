import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-info-badge',
  template: '?',
  styleUrl: './info-badge.scss',
  host: { '[attr.data-tip]': 'tip' },
})
export class InfoBadge {
  @Input({ required: true }) tip!: string;
}