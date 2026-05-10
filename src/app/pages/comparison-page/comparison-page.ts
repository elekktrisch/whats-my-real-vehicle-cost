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
import { Icon } from '../../shared/atoms/icon/icon';
import { PageHeader } from '../../shared/molecules/page-header/page-header';
import {
  ComparisonStrip,
  ModeCardData,
} from '../../shared/molecules/comparison-strip/comparison-strip';
import { WarningsList } from '../../shared/molecules/warnings-list/warnings-list';
import { ShareDialog } from '../../shared/molecules/share-dialog/share-dialog';
import { ModeDetailView } from '../../features/mode-detail-view/mode-detail-view';
import { URL_PARAM, encodeSnapshot } from '../../scenario/scenario.serializer';
import { formatCompactCurrency, formatCurrency } from '../../scenario/region.config';
import type { CostBreakdown, Tab } from '../../scenario/scenario.types';

const LABEL: Record<Tab, string> = { lease: 'Lease', finance: 'Loan', cash: 'Cash' };

// Hysteresis bands for the binary [data-scrolled] flip — a single threshold
// would oscillate at the boundary because the sticky region's own
// collapse-induced layout shift can push scroll position back across it.
// Wider gap on mobile to absorb iOS address-bar resize during scroll.
const HYSTERESIS = {
  desktop: { down: 100, up: 10 },
  mobile: { down: 200, up: 10 },
};
const MOBILE_BP = 600;

@Component({
  selector: 'app-comparison-page',
  imports: [Icon, PageHeader, ComparisonStrip, WarningsList, ModeDetailView, ShareDialog],
  template: `
    <div
      class="max-w-[1200px] mx-auto px-4 sm:px-7 pb-[72px] relative z-[1] overflow-x-clip"
      [attr.data-scrolled]="scrolled()"
    >
      <div class="sticky top-0 z-20">
        <app-page-header />

        <div class="comparison-strip-bg sticky-strip-pad">
          <app-comparison-strip
            [cards]="cards()"
            [active]="store.activeTab()"
            (activeChange)="store.activeTab.set($event)"
            [recommended]="recommended()"
            [distanceUnit]="distanceUnit()"
            [recommendationReason]="recommendationReason()"
          />
          <app-warnings-list [conflicts]="store.visibleConflicts()" />
        </div>
      </div>

      <app-mode-detail-view />

      <div class="flex flex-wrap items-center justify-center gap-3 pt-8 mt-6 border-t border-border">
        <button type="button" (click)="reset()" [class]="actionBtnClass">
          <app-icon name="reset" [size]="14" />
          Reset
        </button>
        <button type="button" (click)="openShare()" [class]="actionBtnClass">
          <app-icon name="share" [size]="14" />
          Share
        </button>
        <a
          [href]="repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          [class]="actionBtnClass"
        >
          <app-icon name="github" [size]="14" />
          View on GitHub
        </a>
      </div>

      <app-share-dialog
        [(open)]="shareOpen"
        [longUrl]="shareLongUrl()"
        [keepDuration]="store.keepDuration()"
      />

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

  protected readonly scrolled = signal(false);

  // Coalesce scroll events to one update per animation frame; high-refresh
  // desktops fire scroll faster than the paint pipeline.
  private rafScheduled = false;
  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.rafScheduled = false;
      const y = window.scrollY;
      const t = window.innerWidth < MOBILE_BP ? HYSTERESIS.mobile : HYSTERESIS.desktop;
      const cur = this.scrolled();
      if (!cur && y > t.down) this.scrolled.set(true);
      else if (cur && y < t.up) this.scrolled.set(false);
    });
  }

  protected readonly actionBtnClass =
    'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 no-underline';

  protected readonly repoUrl = 'https://github.com/elekktrisch/whats-my-real-vehicle-cost';

  protected readonly shareOpen = signal(false);

  // Build the share URL deterministically from the current snapshot rather
  // than reading window.location.href — the autosave effect debounces the
  // address-bar update by 200ms, so a quick "move slider, click Share"
  // sequence would otherwise capture a stale URL.
  protected readonly shareLongUrl = computed(() => {
    if (!this.isBrowser) return '';
    const base = window.location.origin + window.location.pathname;
    const param = encodeSnapshot(this.store.snapshot());
    return `${base}?${URL_PARAM}=${encodeURIComponent(param)}`;
  });

  protected reset(): void {
    this.store.reset();
  }

  protected openShare(): void {
    this.shareOpen.set(true);
  }

  protected readonly distanceUnit = computed(() => this.store.regionConfig().distanceUnit);
  protected readonly recommended = computed(() => this.store.recommendedTab().tab);
  protected readonly recommendationReason = computed(() => this.store.recommendedTab().reason);

  protected readonly cards = computed<readonly ModeCardData[]>(() => {
    const region = this.store.region();
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

    // For lease handback the user returns the car at end of keep, so the
    // retained asset is 0; in every other scenario it's the residual at end
    // of keep. The TCO total satisfies T = cashOut + opportunityCost − assetRetained.
    const retainedAsset = (mode: Tab): number => {
      if (mode !== 'lease') return this.store.residualValue();
      return this.store.leaseEndChoice() === 'handBack' ? 0 : this.store.residualValue();
    };

    return entries.map(({ mode, breakdown }) => {
      const monthly = breakdown.total / months;
      const perDistance = perDistanceByMode.get(mode) ?? 0;
      const isRecommended = mode === rec;
      const deltaPerDistance = perDistance - recPerDistance;

      const cashOut =
        breakdown.series.length > 0
          ? breakdown.series[breakdown.series.length - 1].cashOut
          : 0;
      const oppCost = breakdown.totals.opportunityCost;
      const asset = retainedAsset(mode);
      const fT = formatCurrency(breakdown.total, region, 0);
      const fC = formatCurrency(cashOut, region, 0);
      const fO = formatCurrency(oppCost, region, 0);
      const fA = formatCurrency(asset, region, 0);
      const fM = formatCurrency(monthly, region, 0);
      const fP = formatCurrency(perDistance, region, 2);
      const totalDistance = Math.round(distance);
      const fDist = totalDistance.toLocaleString();

      const totalTip =
        `True total cost over your keep duration. ` +
        `${fC} cash out + ${fO} opportunity cost on tied-up capital − ${fA} asset retained at end of keep = ${fT}.`;
      const monthlyTip =
        `${fT} total ÷ ${months} months keep = ${fM}/mo. The "level monthly" equivalent.`;
      const perDistanceTip =
        `${fT} total ÷ ${fDist} ${distanceUnit} driven over keep duration = ${fP}/${distanceUnit}. ` +
        `Useful for comparing scenarios with different mileages.`;

      return {
        mode,
        label: LABEL[mode],
        total: formatCompactCurrency(breakdown.total, region),
        totalFull: fT,
        totalTip,
        monthly: formatCompactCurrency(monthly, region),
        monthlyFull: fM,
        monthlyTip,
        perDistance: fP,
        perDistanceTip,
        delta: isRecommended
          ? null
          : `+${formatCurrency(deltaPerDistance, region, 2)}/${distanceUnit}`,
        conflictCount: this.store.conflictCount(mode),
      };
    });
  });
}
