import { Component, input } from '@angular/core';

@Component({
  selector: 'app-label',
  template: `
    <label
      [attr.for]="for() || null"
      class="font-ui text-[0.75rem] font-medium tracking-[0.13em] uppercase text-tx-dim"
    >
      <ng-content />
      @if (required()) {
        <span class="text-coral ml-[2px]" aria-hidden="true">*</span>
      }
    </label>
  `,
})
export class Label {
  readonly for = input('');
  readonly required = input(false);
}