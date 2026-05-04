import { Component } from '@angular/core';

/**
 * Cash has no per-mode controls — purchase price + opportunity-cost rate
 * (set in "Your situation") cover everything. Render a small note inside
 * a tabpanel so the screen-reader/tab semantics stay consistent.
 */
@Component({
  selector: 'app-cash-fields',
  template: `
    <div role="tabpanel" id="modepanel-cash" aria-labelledby="modetab-cash">
      <p class="font-mono text-[0.78rem] text-tx-muted leading-snug">
        Cash buys outright — no APR, no term, no down payment. Use the
        purchase price in the header and the opportunity-cost preference in
        "Your situation" below to tune cash TCO.
      </p>
    </div>
  `,
})
export class CashFields {}