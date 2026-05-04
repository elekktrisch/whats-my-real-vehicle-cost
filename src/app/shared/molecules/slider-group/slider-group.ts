import { Component, input } from '@angular/core';

@Component({
  selector: 'app-slider-group',
  template: `
    <section class="bg-surface border border-border rounded-[14px] py-[22px] px-5">
      <div
        class="font-ui text-[0.75rem] font-medium tracking-[0.15em] uppercase text-tx-dim pb-[14px] mb-5 border-b border-border flex items-center justify-between gap-2"
      >
        <span>{{ title() }}</span>
        @if (caption()) {
          <span class="font-mono text-[0.75rem] text-tx-muted normal-case tracking-normal">{{
            caption()
          }}</span>
        }
      </div>
      <ng-content />
    </section>
  `,
})
export class SliderGroup {
  readonly title = input.required<string>();
  readonly caption = input('');
}