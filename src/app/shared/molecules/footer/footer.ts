import { Component, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Icon } from '../../atoms/icon/icon';
import { LanguageSelector } from '../language-selector/language-selector';
import { RegionSelector } from '../region-selector/region-selector';

const REPO_URL = 'https://github.com/elekktrisch/whats-my-real-vehicle-cost';

@Component({
  selector: 'app-footer',
  imports: [Icon, LanguageSelector, RegionSelector, TranslocoPipe],
  template: `
    <footer class="pt-8 mt-6 border-t border-border">
      <div
        class="flex flex-col sm:flex-row sm:justify-between items-center gap-4 sm:gap-6"
      >
        <div class="flex flex-wrap items-center justify-center gap-3">
          @if (showActions()) {
            <button type="button" (click)="onReset()" [class]="btnClass">
              <app-icon name="reset" [size]="14" />
              {{ 'nav.reset' | transloco }}
            </button>
            <button type="button" (click)="share.emit()" [class]="btnClass">
              <app-icon name="share" [size]="14" />
              {{ 'nav.share' | transloco }}
            </button>
          }
          <a [href]="repoUrl" target="_blank" rel="noopener noreferrer" [class]="btnClass">
            <app-icon name="github" [size]="14" />
            {{ 'nav.github' | transloco }}
          </a>
        </div>
        <div class="flex items-center gap-3">
          <app-region-selector />
          <app-language-selector />
        </div>
      </div>

      <p class="font-ui text-[0.72rem] text-tx-dim leading-relaxed text-center max-w-[640px] mx-auto mt-8 px-2">
        {{ 'footer.fineprint' | transloco }}
      </p>
    </footer>
  `,
})
export class Footer {
  readonly showActions = input<boolean>(false);
  readonly share = output<void>();

  protected readonly store = inject(ScenarioStore);
  protected readonly repoUrl = REPO_URL;

  protected readonly btnClass =
    'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 no-underline';

  protected onReset(): void {
    this.store.reset();
  }
}
