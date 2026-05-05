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
import { NumberInput } from '../../shared/atoms/number-input/number-input';
import { Icon } from '../../shared/atoms/icon/icon';
import { LocaleSelector } from '../../shared/molecules/locale-selector/locale-selector';
import { PowertrainSelector } from '../../shared/molecules/powertrain-selector/powertrain-selector';
import {
  ComparisonStrip,
  ModeCardData,
} from '../../shared/molecules/comparison-strip/comparison-strip';
import { HeroSummary } from '../../shared/molecules/hero-summary/hero-summary';
import { ModeDetailView } from '../../features/mode-detail-view/mode-detail-view';
import { formatCurrency } from '../../scenario/locale.config';
import type { CostBreakdown, Tab } from '../../scenario/scenario.types';

const LABEL: Record<Tab, string> = { lease: 'Lease', finance: 'Loan', cash: 'Cash' };

const SHRINK_THRESHOLD_DESKTOP = 250;
const SHRINK_THRESHOLD_MOBILE = 400;
const MOBILE_BREAKPOINT_PX = 600;

/**
 * The new comparison-first shell. Layout per plan §Page shape (order O1):
 *
 *   header  →  comparison-strip (sticky)  →  recommendation line
 *           →  mode-detail-view (chart  →  mode fields  →  globals)
 *
 * Header (logo + locale + powertrain + basic/advanced toggle) intentionally
 * scrolls away — only the strip stays sticky. Phase E will swap routes so
 * `/` lands here (currently still routed via `/lease | /finance | /cash`).
 */
@Component({
  selector: 'app-comparison-page',
  imports: [
    NumberInput,
    Icon,
    LocaleSelector,
    PowertrainSelector,
    ComparisonStrip,
    HeroSummary,
    ModeDetailView,
  ],
  template: `
    <div class="max-w-[1200px] mx-auto px-4 sm:px-7 pb-[72px] relative z-[1] overflow-x-clip">
      <!-- Two-row mobile / single-row desktop header.
           Mobile: row 1 = label + price input full-width; row 2 = locale + powertrain.
           Desktop: input on left, label centered, selectors on right (single row). -->
      <header class="pt-7 pb-[18px] border-b border-border">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <label class="header-input flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span class="font-ui text-[0.75rem] font-medium tracking-[0.12em] uppercase text-tx-dim">
              Negotiated price
            </span>
            <app-number-input
              [(value)]="store.purchasePrice"
              [min]="5000"
              [max]="150000"
              [prefix]="currencyPrefix()"
              [suffix]="currencySuffix()"
              ariaLabel="Negotiated price"
              size="lg"
            />
          </label>
          <!-- Mobile: justify-between pushes locale to the far left and
               powertrain to the far right; both at content size, the gap
               between them fills the rest. Row is therefore visually 100%
               wide. Desktop: justify-end groups them on the right. -->
          <div class="flex items-center gap-3 justify-between sm:justify-end">
            <app-locale-selector />
            <app-powertrain-selector />
          </div>
        </div>
      </header>

      <!-- Sticky region: comparison strip + hero summary. Both compress
           together past the scroll threshold (driven by compact() below).
           The 24 px gradient fade band at the bottom comes from
           .comparison-strip-bg. -->
      <div
        class="comparison-strip-bg sticky top-0 z-20 pt-2 pb-[18px] sm:pt-3 sm:pb-[28px]"
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
        <div class="mt-3">
          <app-hero-summary [compact]="compact()" />
        </div>
      </div>

      <app-mode-detail-view />

      <!-- Page-level actions: reset to defaults; share the current state via
           WhatsApp (the URL already carries the ?s=JSON snapshot). -->
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

      <!-- Fineprint -->
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

  /** F2 shrink — past the enter threshold both the strip and the hero
   * collapse. Two stabilizers prevent flicker:
   *   1. Hysteresis: exit threshold sits well below enter, so the
   *      sticky's own shrinkage (≈ 150 px on mobile when the hero
   *      collapses) can't drop scrollY back below exit.
   *   2. Toggle lockout: after switching state we ignore further scroll
   *      events for 200 ms, giving the browser time to settle the layout
   *      reflow before we re-evaluate.
   *
   * The mobile thresholds are deliberately generous (enter ~220, exit ~70)
   * because the gap between them must exceed the layout-shift magnitude to
   * absorb the bounce. */
  private readonly compactState = signal(false);
  protected readonly compact = this.compactState.asReadonly();
  private lastToggleAt = 0;

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    const now = performance.now();
    if (now - this.lastToggleAt < 200) return; // recent toggle — let layout settle
    const y = window.scrollY;
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    const enter = isMobile ? SHRINK_THRESHOLD_MOBILE : SHRINK_THRESHOLD_DESKTOP;
    const exit = isMobile ? 70 : Math.floor(enter / 2);
    if (this.compactState()) {
      if (y < exit) {
        this.compactState.set(false);
        this.lastToggleAt = now;
      }
    } else {
      if (y > enter) {
        this.compactState.set(true);
        this.lastToggleAt = now;
      }
    }
  }

  /** Shared "ghost button" styling for the bottom action row. */
  protected readonly actionBtnClass =
    'inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';

  protected reset(): void {
    // Full reset — clears state, clears the URL, and flips
    // `hasReturningState` back to false so AppShell re-renders the splash.
    this.store.reset();
  }

  protected shareWhatsApp(): void {
    if (typeof window === 'undefined') return;
    // Build a fresh share URL with the compressed `?c=` param — much
    // shorter than the autosaved `?s=<JSON>`. The address bar stays put.
    const compressed = encodeShareSnapshot(this.store.snapshot());
    const base = window.location.origin + window.location.pathname;
    const shareUrl = `${base}?${SHARE_PARAM}=${compressed}`;
    const text = `Check out this car cost breakdown — ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  protected readonly distanceUnit = computed(() => this.store.localeConfig().distanceUnit);
  protected readonly currencyPrefix = computed(() =>
    this.store.localeConfig().currencyAfter ? '' : this.store.localeConfig().currencySymbol,
  );
  protected readonly currencySuffix = computed(() =>
    this.store.localeConfig().currencyAfter ? ' ' + this.store.localeConfig().currencySymbol : '',
  );

  protected readonly recommended = computed(() => this.store.recommendedTab().tab);
  protected readonly recommendationReason = computed(() => this.store.recommendedTab().reason);

  /** Build the three card payloads from the store's per-mode breakdowns. */
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
      // Recommended card shows the Best badge in the top-right; other cards
      // show the per-distance delta in that same corner. Each card has
      // exactly one thing on the right side of the header → equal heights
      // without a "Reference" filler.
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
