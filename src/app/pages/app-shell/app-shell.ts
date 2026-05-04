import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SplashPage } from '../splash-page/splash-page';
import { ComparisonPage } from '../comparison-page/comparison-page';

/**
 * Single `/` route landing component. Decides splash vs comparison based on
 * `hasReturningState`:
 *
 *   - cold start with no `?s=...` and no engagement → SplashPage
 *   - URL carries `?s=...` (returning user) → ComparisonPage
 *   - clicked Get Started → store.engage() flips the flag → ComparisonPage
 *
 * Splash never lives at a separate route — once the user crosses it, we
 * rerender comparison in place. Plan §Routes (D1).
 */
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