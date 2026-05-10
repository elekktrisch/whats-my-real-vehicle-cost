import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-cash-fields',
  imports: [TranslocoPipe],
  template: `
    <div role="tabpanel" id="modepanel-cash" aria-labelledby="modetab-cash">
      <p class="font-mono text-[0.78rem] text-tx-muted leading-snug">
        {{ 'cash.fields.intro' | transloco }}
      </p>
    </div>
  `,
})
export class CashFields {}
