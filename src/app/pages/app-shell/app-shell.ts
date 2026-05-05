import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SplashPage } from '../splash-page/splash-page';
import { ComparisonPage } from '../comparison-page/comparison-page';

@Component({
  selector: 'app-shell',
  imports: [SplashPage, ComparisonPage],
  template: `
    <a
      href="#main-content"
      class="skip-link sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-[8px] focus:bg-accent focus:text-bg focus:font-ui focus:text-[0.85rem] focus:font-medium focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      Skip to main content
    </a>
    @if (showComparison()) {
      <main id="main-content"><app-comparison-page /></main>
    } @else {
      <main id="main-content"><app-splash-page /></main>
    }
  `,
})
export class AppShell {
  private readonly store = inject(ScenarioStore);
  protected readonly showComparison = computed(() => this.store.hasReturningState());
}