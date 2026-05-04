import { Component } from '@angular/core';

/**
 * Cash has no mode-specific controls in the redesign — purchase price comes
 * from the global vehicle context, opportunity-cost rate from the global
 * basic block. Render a tabpanel placeholder so screen readers still see the
 * tab/panel relationship; visually it's a thin note.
 */
@Component({
  selector: 'app-cash-fields',
  template: `
    <div role="tabpanel" id="modepanel-cash" aria-labelledby="modetab-cash">
      <p class="font-mono text-[0.72rem] text-tx-muted leading-[1.5]">
        Cash buys outright — no APR, no term. Use the global controls below to
        adjust purchase price, keep duration, and the opportunity-cost rate
        (the return you'd otherwise earn on that capital).
      </p>
    </div>
  `,
})
export class CashFields {}