import { Component, input } from '@angular/core';

@Component({
  selector: 'app-hero-column',
  template: `
    <div
      class="flex flex-col gap-1 min-w-0"
      [class.text-right]="side() === 'right'"
      [class.items-end]="side() === 'right'"
    >
      @if (iconSrc()) {
        <img
          class="hero-column-icon"
          [src]="iconSrc()"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          [class.hero-column-icon-dim]="dimIcon()"
        />
      }
      @if (eyebrowMobile(); as mob) {
        <span class="hero-eyebrow hidden sm:block font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
          {{ eyebrow() }}
        </span>
        <span class="hero-eyebrow block sm:hidden font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
          {{ mob }}
        </span>
      } @else {
        <span class="hero-eyebrow font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
          {{ eyebrow() }}
        </span>
      }
      <span class="hero-num font-mono font-medium text-tx tracking-[-0.02em]">
        {{ value() }}
      </span>
      @if (caption(); as cap) {
        @if (captionMobile(); as mob) {
          <span class="hero-caption hidden sm:block font-ui text-[0.78rem] text-tx-muted">{{ cap }}</span>
          <span class="hero-caption block sm:hidden font-ui text-[0.78rem] text-tx-muted">{{ mob }}</span>
        } @else {
          <span class="hero-caption font-ui text-[0.78rem] text-tx-muted">{{ cap }}</span>
        }
      }
    </div>
  `,
})
export class HeroColumn {
  readonly side = input.required<'left' | 'right'>();
  readonly eyebrow = input.required<string>();
  readonly eyebrowMobile = input<string | null>(null);
  readonly value = input.required<string>();
  readonly caption = input<string | null>(null);
  readonly captionMobile = input<string | null>(null);
  readonly iconSrc = input<string | null>(null);
  // Dimmed + desaturated — used for car.png on lease-renew (no asset retained).
  readonly dimIcon = input(false);
}
