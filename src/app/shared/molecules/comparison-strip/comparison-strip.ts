import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  model,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Tab } from '../../../scenario/scenario.types';
import { ModeCard } from '../mode-card/mode-card';

export interface ModeCardData {
  mode: Tab;
  label: string;
  total: string;
  totalFull: string;
  totalTip: string;
  monthly: string;
  monthlyFull: string;
  monthlyTip: string;
  perDistance: string;
  perDistanceTip: string;
  delta: string | null;
  conflictCount: number;
}

const MODES: readonly Tab[] = ['lease', 'finance', 'cash'];

@Component({
  selector: 'app-comparison-strip',
  imports: [ModeCard, TranslocoPipe],
  template: `
    <div #stripEl>
      <div
        role="tablist"
        [attr.aria-label]="'comparison.tablist' | transloco"
        class="grid grid-cols-3 gap-[6px] sm:gap-[10px]"
        (keydown)="onKeydown($event)"
      >
        @for (card of orderedCards(); track card.mode) {
          <app-mode-card
            [mode]="card.mode"
            [label]="card.label"
            [active]="card.mode === active()"
            [recommended]="card.mode === recommended()"
            [total]="card.total"
            [totalFull]="card.totalFull"
            [monthly]="card.monthly"
            [monthlyFull]="card.monthlyFull"
            [perDistance]="card.perDistance"
            [distanceUnit]="distanceUnit()"
            [delta]="card.delta"
            [conflictCount]="card.conflictCount"
            [totalTip]="card.totalTip"
            [monthlyTip]="card.monthlyTip"
            [perDistanceTip]="card.perDistanceTip"
            [tabId]="tabId(card.mode)"
            [panelId]="panelId(card.mode)"
            (select)="onSelect($event)"
          />
        }
      </div>

      @if (recommendationReason()) {
        <p
          class="recommendation-reason font-ui text-[0.78rem] text-tx-muted leading-[1.55] mt-3 text-center px-2"
          role="status"
          aria-live="polite"
        >
          {{ recommendationReason() }}
        </p>
      }
    </div>
  `,
})
export class ComparisonStrip {
  readonly cards = input.required<readonly ModeCardData[]>();
  readonly active = model.required<Tab>();
  readonly recommended = input<Tab | null>(null);
  readonly distanceUnit = input.required<string>();
  readonly recommendationReason = input<string>('');

  @ViewChild('stripEl', { static: true }) stripEl?: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Visual order is always lease → finance → cash regardless of which is
  // recommended — consistency matters more than ranking here.
  protected readonly orderedCards = computed(() => {
    const byMode = new Map(this.cards().map((c) => [c.mode, c]));
    return MODES.map((m) => byMode.get(m)).filter((c): c is ModeCardData => !!c);
  });

  protected tabId(mode: Tab): string {
    return `modetab-${mode}`;
  }
  protected panelId(mode: Tab): string {
    return `modepanel-${mode}`;
  }

  protected onSelect(mode: Tab): void {
    this.active.set(mode);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const order = this.orderedCards().map((c) => c.mode);
    const current = order.indexOf(this.active());
    if (current < 0) return;

    let next = current;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + order.length) % order.length;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % order.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = order.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = order[next];
    this.active.set(target);
    if (this.isBrowser && this.stripEl) {
      const btn = this.stripEl.nativeElement.querySelector<HTMLButtonElement>(
        `#${this.tabId(target)}`,
      );
      btn?.focus();
    }
  }
}