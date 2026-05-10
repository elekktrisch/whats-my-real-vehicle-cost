import { Component, inject, input, output } from '@angular/core';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { Icon } from '../../atoms/icon/icon';
import { LanguageSelector } from '../language-selector/language-selector';

const REPO_URL = 'https://github.com/elekktrisch/whats-my-real-vehicle-cost';

@Component({
  selector: 'app-footer',
  imports: [Icon, LanguageSelector],
  template: `
    <footer class="pt-8 mt-6 border-t border-border">
      <div class="flex flex-wrap items-center justify-center gap-3">
        @if (showActions()) {
          <button type="button" (click)="onReset()" [class]="btnClass">
            <app-icon name="reset" [size]="14" />
            Reset
          </button>
          <button type="button" (click)="share.emit()" [class]="btnClass">
            <app-icon name="share" [size]="14" />
            Share
          </button>
        }
        <a [href]="repoUrl" target="_blank" rel="noopener noreferrer" [class]="btnClass">
          <app-icon name="github" [size]="14" />
          View on GitHub
        </a>
        <app-language-selector />
      </div>

      <p class="font-ui text-[0.72rem] text-tx-dim leading-relaxed text-center max-w-[640px] mx-auto mt-8 px-2">
        Fineprint — this is a side project, vibe-coded on weekends by some
        dude on the internet. The numbers are rough estimates with a stack of
        simplifying assumptions baked in (depreciation curves, regional defaults,
        category multipliers, etc). Useful for a sanity check; not a substitute
        for the actual contract from your dealer, a real insurance quote, your
        own math, or a financial advisor with credentials. Don't sign a
        five-figure deal because a chart on a stranger's website said so.
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
