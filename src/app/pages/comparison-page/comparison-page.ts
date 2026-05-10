import {
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { ScenarioStore } from '../../scenario/scenario.store';
import { PageHeader } from '../../shared/molecules/page-header/page-header';
import {
  ComparisonStrip,
  ModeCardData,
} from '../../shared/molecules/comparison-strip/comparison-strip';
import { WarningsList } from '../../shared/molecules/warnings-list/warnings-list';
import { ShareDialog } from '../../shared/molecules/share-dialog/share-dialog';
import { Footer } from '../../shared/molecules/footer/footer';
import { ModeDetailView } from '../../features/mode-detail-view/mode-detail-view';
import { URL_PARAM, encodeSnapshot } from '../../scenario/scenario.serializer';
import { formatCompactCurrency, formatCurrency } from '../../scenario/region.config';
import type { CostBreakdown, Tab } from '../../scenario/scenario.types';


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
  imports: [PageHeader, ComparisonStrip, WarningsList, ModeDetailView, ShareDialog, Footer],
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

      <app-footer [showActions]="true" (share)="openShare()" />

      <app-share-dialog
        [(open)]="shareOpen"
        [longUrl]="shareLongUrl()"
        [keepDuration]="store.keepDuration()"
      />
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

  private readonly transloco = inject(TranslocoService);

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

  protected openShare(): void {
    this.shareOpen.set(true);
  }

  protected readonly distanceUnit = computed(() => this.store.regionConfig().distanceUnit);
  protected readonly recommended = computed(() => this.store.recommendedTab().tab);
  protected readonly recommendationReason = computed(() => {
    const rec = this.store.recommendedTab();
    const fmt = this.store.formatContext();
    const unit = this.distanceUnit();
    const lang = this.store.language();
    const tabLabel = (t: Tab) => this.transloco.translate(`mode.${t}`, {}, lang);
    const fmtCost = (v: number) => `${formatCurrency(v, fmt, 2)}/${unit}`;
    const others = rec.others.map((o) => `${tabLabel(o.tab)} ${fmtCost(o.cost)}`).join(', ');
    return this.transloco.translate(
      'recommendation.reason',
      {
        winner: tabLabel(rec.tab),
        unit,
        winnerCost: fmtCost(rec.winnerCost),
        others,
      },
      lang,
    );
  });

  protected readonly cards = computed<readonly ModeCardData[]>(() => {
    const fmt = this.store.formatContext();
    const distanceUnit = this.distanceUnit();
    const lang = this.store.language();
    const t = (k: string, p?: Record<string, unknown>) => this.transloco.translate(k, p, lang);
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
      const fT = formatCurrency(breakdown.total, fmt, 0);
      const fC = formatCurrency(cashOut, fmt, 0);
      const fO = formatCurrency(oppCost, fmt, 0);
      const fA = formatCurrency(asset, fmt, 0);
      const fM = formatCurrency(monthly, fmt, 0);
      const fP = formatCurrency(perDistance, fmt, 2);
      const totalDistance = Math.round(distance);
      const fDist = totalDistance.toLocaleString();

      const totalTip = t('comparison.tip.total', {
        cashOut: fC,
        oppCost: fO,
        asset: fA,
        total: fT,
      });
      const monthlyTip = t('comparison.tip.monthly', { total: fT, months, monthly: fM });
      const perDistanceTip = t('comparison.tip.perDistance', {
        total: fT,
        distance: fDist,
        unit: distanceUnit,
        perDistance: fP,
      });

      return {
        mode,
        label: t(`mode.${mode}`),
        total: formatCompactCurrency(breakdown.total, fmt),
        totalFull: fT,
        totalTip,
        monthly: formatCompactCurrency(monthly, fmt),
        monthlyFull: fM,
        monthlyTip,
        perDistance: fP,
        perDistanceTip,
        delta: isRecommended
          ? null
          : `+${formatCurrency(deltaPerDistance, fmt, 2)}/${distanceUnit}`,
        conflictCount: this.store.conflictCount(mode),
      };
    });
  });
}
