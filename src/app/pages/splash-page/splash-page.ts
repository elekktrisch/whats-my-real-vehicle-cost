import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScenarioStore } from '../../scenario/scenario.store';
import { Button } from '../../shared/atoms/button/button';
import { Icon } from '../../shared/atoms/icon/icon';

@Component({
  selector: 'app-splash-page',
  imports: [Button, Icon],
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
          The monthly payment
          <span class="block text-tx-muted/60">is not the cost.</span>
        </h1>

        <p
          class="relative mt-6 font-ui text-[0.92rem] text-tx-muted leading-[1.65] max-w-[460px] mx-auto"
        >
          Six questions, one chart. See what a car really costs you over the years —
          financing, depreciation, fuel, insurance and maintenance, side by side across
          lease, finance and cash.
        </p>

        <div class="relative mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <app-button size="lg" (click)="getStarted()">Get started</app-button>
          <span
            class="font-ui text-[0.6rem] tracking-[0.16em] uppercase text-tx-dim sm:ml-2"
            >~60 seconds · {{ localeLabel() }}</span
          >
        </div>
      </article>
    </main>
  `,
})
export class SplashPage {
  private readonly router = inject(Router);
  private readonly store = inject(ScenarioStore);

  protected readonly localeLabel = computed(() =>
    this.store.locale() === 'US' ? 'US defaults' : 'EU defaults',
  );

  constructor() {
    effect(() => {
      if (this.store.hasHydrated()) {
        this.router.navigate(['/', this.store.activeTab()], { replaceUrl: true });
      }
    });
  }

  protected getStarted(): void {
    this.router.navigate(['/wizard']);
  }
}