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
    @if (showComparison()) {
      <app-comparison-page />
    } @else {
      <app-splash-page />
    }
  `,
})
export class AppShell {
  private readonly store = inject(ScenarioStore);
  protected readonly showComparison = computed(() => this.store.hasReturningState());
}