import {
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SHARE_PARAM, encodeShareSnapshot } from '../../scenario/scenario.serializer';
import { Icon } from '../../shared/atoms/icon/icon';
import { PageHeader } from '../../shared/molecules/page-header/page-header';
import {
  ComparisonStrip,
  ModeCardData,
} from '../../shared/molecules/comparison-strip/comparison-strip';
import { HeroSummary } from '../../shared/molecules/hero-summary/hero-summary';
import { ModeDetailView } from '../../features/mode-detail-view/mode-detail-view';
import { formatCurrency } from '../../scenario/locale.config';
import type { CostBreakdown, Tab } from '../../scenario/scenario.types';

const LABEL: Record<Tab, string> = { lease: 'Lease', finance: 'Loan', cash: 'Cash' };

const SHRINK_START = 100;
const SHRINK_END = 600;

@Component({
  selector: 'app-comparison-page',
  imports: [Icon, PageHeader, ComparisonStrip, HeroSummary, ModeDetailView],
  template: `
    <div class="max-w-[1200px] mx-auto px-4 sm:px-7 pb-[72px] relative z-[1] overflow-x-clip">
      <app-page-header />

      <div
        class="comparison-strip-bg sticky top-0 z-20 pt-2 pb-[18px] sm:pt-3 sm:pb-[28px]"
        [style.--compact-progress]="progress()"
      >
        <app-comparison-strip
          [cards]="cards()"
          [active]="store.activeTab()"
          (activeChange)="store.activeTab.set($event)"
          [recommended]="recommended()"
          [distanceUnit]="distanceUnit()"
          [recommendationReason]="recommendationReason()"
          [compact]="compact()"
        />
        <div class="mt-3" [class.hero-fully-compact]="fullyCompact()">
          <app-hero-summary />
        </div>
      </div>

      <app-mode-detail-view />

      <div class="flex flex-wrap items-center justify-center gap-3 pt-8 mt-6 border-t border-border">
        <button type="button" (click)="reset()" [class]="actionBtnClass">
          <app-icon name="reset" [size]="14" />
          Reset
        </button>
        <button type="button" (click)="shareWhatsApp()" [class]="actionBtnClass">
          <app-icon name="share" [size]="14" />
          Share via WhatsApp
        </button>
      </div>

      <p class="font-ui text-[0.72rem] text-tx-dim leading-relaxed text-center max-w-[640px] mx-auto mt-8 px-2">
        Fineprint — this is a side project, vibe-coded on weekends by some
        dude on the internet. The numbers are rough estimates with a stack of
        simplifying assumptions baked in (depreciation curves, locale defaults,
        category multipliers, etc). Useful for a sanity check; not a substitute
        for the actual contract from your dealer, a real insurance quote, your
        own math, or a financial advisor with credentials. Don't sign a
        five-figure deal because a chart on a stranger's website said so.
      </p>
    </div>
  `,
})
export class ComparisonPage {
  protected readonly store = inject(ScenarioStore);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly scrollY = signal(0);
  protected readonly progress = computed(() => {
    if (!this.isBrowser) return 0;
    const y = this.scrollY();
    if (y <= SHRINK_START) return 0;
    if (y >= SHRINK_END) return 1;
    return (y - SHRINK_START) / (SHRINK_END - SHRINK_START);
  });
  protected readonly compact = computed(() => this.progress() > 0.5);
  protected readonly fullyCompact = computed(() => this.progress() >= 0.9);

  // Coalesce scroll events to one update per animation frame: high-refresh
  // desktops fire scroll faster than the paint pipeline, and without
  // throttling the compositor falls behind into visible flicker.
  private rafScheduled = false;
  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.rafScheduled = false;
      this.scrollY.set(window.scrollY);
    });
  }

  protected readonly actionBtnClass =
    'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';

  protected reset(): void {
    this.store.reset();
  }

  protected shareWhatsApp(): void {
    if (typeof window === 'undefined') return;
    const compressed = encodeShareSnapshot(this.store.snapshot());
    const base = window.location.origin + window.location.pathname;
    const shareUrl = `${base}?${SHARE_PARAM}=${compressed}`;
    const text = `Check out this car cost breakdown — ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  protected readonly distanceUnit = computed(() => this.store.localeConfig().distanceUnit);
  protected readonly recommended = computed(() => this.store.recommendedTab().tab);
  protected readonly recommendationReason = computed(() => this.store.recommendedTab().reason);

  protected readonly cards = computed<readonly ModeCardData[]>(() => {
    const locale = this.store.locale();
    const distanceUnit = this.distanceUnit();
    const months = Math.max(Math.round(this.store.keepDuration() * 12), 1);
    const distance = this.store.annualMileage() * this.store.keepDuration();
    const rec = this.recommended();

    const entries: { mode: Tab; breakdown: CostBreakdown }[] = [
      { mode: 'lease', breakdown: this.store.leaseBreakdown() },
      { mode: 'finance', breakdown: this.store.financeBreakdown() },
      { mode: 'cash', breakdown: this.store.cashBreakdown() },
    ];
    const perDistanceByMode = new Map(
      entries.map(
        (e) => [e.mode, distance > 0 ? e.breakdown.total / distance : 0] as const,
      ),
    );
    const recPerDistance = perDistanceByMode.get(rec) ?? 0;

    return entries.map(({ mode, breakdown }) => {
      const monthly = breakdown.total / months;
      const perDistance = perDistanceByMode.get(mode) ?? 0;
      const isRecommended = mode === rec;
      const deltaPerDistance = perDistance - recPerDistance;
      return {
        mode,
        label: LABEL[mode],
        total: formatCurrency(breakdown.total, locale, 0),
        monthly: formatCurrency(monthly, locale, 0),
        perDistance: formatCurrency(perDistance, locale, 2),
        delta: isRecommended
          ? null
          : `+${formatCurrency(deltaPerDistance, locale, 2)}/${distanceUnit}`,
      };
    });
  });
}
