import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../scenario/scenario.store';
import { Button } from '../../shared/atoms/button/button';
import { Icon } from '../../shared/atoms/icon/icon';
import { NumberInput } from '../../shared/atoms/number-input/number-input';
import { PowertrainSelector } from '../../shared/molecules/powertrain-selector/powertrain-selector';
import { Footer } from '../../shared/molecules/footer/footer';

@Component({
  selector: 'app-splash-page',
  imports: [Button, Icon, NumberInput, PowertrainSelector, Footer, TranslocoPipe],
  template: `
    <main class="min-h-[100dvh] flex items-center justify-center px-6 py-12 relative">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_60%_45%_at_50%_30%,rgba(79,142,247,0.10)_0%,transparent_70%)]"
      ></div>

      <article
        class="relative w-full max-w-[640px] bg-surface border border-border rounded-[18px] p-10 sm:p-14 text-center overflow-hidden"
      >
        <div
          aria-hidden="true"
          class="absolute -top-24 -right-24 w-72 h-72 [background:radial-gradient(circle,rgba(79,142,247,0.10)_0%,transparent_60%)]"
        ></div>
        <div
          aria-hidden="true"
          class="absolute -bottom-20 -left-16 w-60 h-60 [background:radial-gradient(circle,rgba(244,132,95,0.05)_0%,transparent_60%)]"
        ></div>

        <div class="relative flex justify-center mb-8">
          <span
            class="inline-flex items-center justify-center size-12 rounded-[14px] bg-elevated border border-border-strong text-accent"
          >
            <app-icon name="logo" [size]="24" />
          </span>
        </div>

        <h1
          class="relative font-ui text-[2rem] sm:text-[2.6rem] font-medium tracking-[-0.02em] text-tx leading-[1.05]"
        >
          {{ 'splash.heroTitle' | transloco }}
          <span class="block text-tx-muted/60">{{ 'splash.heroTitleAccent' | transloco }}</span>
        </h1>

        <p
          class="relative mt-6 font-ui text-[0.92rem] text-tx-muted leading-[1.65] max-w-[460px] mx-auto"
        >
          {{ 'splash.heroSubtitle' | transloco }}
        </p>

        <div class="relative mt-10 flex flex-col items-center gap-2">
          <span class="font-ui text-[0.95rem] font-medium text-tx-muted">
            {{ 'splash.priceLabel' | transloco }}
          </span>
          <app-number-input
            [(value)]="store.purchasePrice"
            [min]="5000"
            [max]="150000"
            [prefix]="store.currencyPrefix()"
            [suffix]="store.currencySuffix()"
            [ariaLabel]="'splash.priceLabel' | transloco"
            size="lg"
          />
        </div>

        <div class="relative mt-5 flex flex-col items-center gap-2">
          <span class="font-ui text-[0.85rem] font-medium text-tx-muted">
            {{ 'splash.powertrainLabel' | transloco }}
          </span>
          <app-powertrain-selector />
        </div>

        <div class="relative mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <app-button size="lg" (click)="getStarted()">{{ 'splash.cta' | transloco }}</app-button>
          <span
            class="font-ui text-[0.75rem] tracking-[0.16em] uppercase text-tx-dim sm:ml-2"
            >{{ 'splash.regionDefaults' | transloco: { region: store.region() } }}</span
          >
        </div>
      </article>

      <div class="absolute bottom-0 inset-x-0 max-w-[1200px] mx-auto px-4 sm:px-7 pb-6">
        <app-footer />
      </div>
    </main>
  `,
})
export class SplashPage {
  protected readonly store = inject(ScenarioStore);

  protected getStarted(): void {
    this.store.engage();
  }
}
