import { Component, input } from '@angular/core';

@Component({
  selector: 'app-info-badge',
  template: '?',
  host: {
    '[attr.data-tip]': 'tip()',
    class:
      'info-badge inline-flex items-center justify-center size-[13px] text-[9px] font-ui rounded-full bg-elevated border border-border-strong text-tx-muted cursor-help relative align-middle shrink-0',
  },
})
export class InfoBadge {
  readonly tip = input.required<string>();
}