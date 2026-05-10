import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  linkedSignal,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import dragDataPlugin from 'chartjs-plugin-dragdata';
import { BaseChartDirective } from 'ng2-charts';
import { ScenarioStore } from '../../../scenario/scenario.store';
import {
  MAINTENANCE_ANCHOR_AGES,
  MAINTENANCE_PREVIEW_END_AGE,
  buildMaintenancePreviewSamples,
  clampMaintenanceFactorAt,
  factorsOfMaintenance,
  maintenanceAt,
  makeMaintenanceCurve,
} from '../../../scenario/calculations/maintenance';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { formatCurrency } from '../../../scenario/region.config';
import { Icon } from '../../atoms/icon/icon';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);
Chart.register(dragDataPlugin);

@Component({
  selector: 'app-maintenance-curve-editor',
  imports: [Icon, BaseChartDirective, TranslocoPipe],
  template: `
    <button
      type="button"
      data-testid="maintenance-curve-trigger"
      (click)="openDialog()"
      class="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.72rem] font-medium tracking-[0.06em] uppercase whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {{ 'curveEditor.maintenance.trigger' | transloco }}
      @if (hasOverride()) {
        <span
          data-testid="maintenance-curve-override-dot"
          [attr.aria-label]="'curveEditor.overrideActive' | transloco"
          class="inline-block size-1.5 rounded-full bg-accent"
        ></span>
      }
    </button>

    <dialog
      #dlg
      (close)="onDialogClose()"
      (click)="onBackdropClick($event)"
      class="m-auto p-0 rounded-[18px] bg-surface text-tx border border-border max-w-[480px] w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain [&::backdrop]:bg-black/60 [&::backdrop]:backdrop-blur-sm"
    >
      <div class="p-6 sm:p-7 flex flex-col gap-5">
        <header class="flex items-center justify-between">
          <h2 class="font-ui text-[1rem] font-medium tracking-[-0.01em] text-tx">
            {{ 'curveEditor.maintenance.title' | transloco }}
          </h2>
          <form method="dialog" class="contents">
            <button
              type="submit"
              [attr.aria-label]="'common.close' | transloco"
              class="size-7 inline-flex items-center justify-center rounded-[8px] text-tx-muted hover:text-tx hover:bg-elevated transition-colors duration-150 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <app-icon name="close" [size]="16" />
            </button>
          </form>
        </header>

        <p class="font-ui text-[0.78rem] text-tx-muted leading-snug">
          {{ 'curveEditor.maintenance.description' | transloco }}
        </p>

        <div data-testid="maintenance-curve-preview" class="relative h-[180px]">
          <canvas
            baseChart
            [data]="chartData()"
            [options]="chartOptions()"
            type="line"
          ></canvas>
        </div>

        <div
          class="flex flex-wrap gap-x-6 gap-y-2 px-3 py-2 rounded-md bg-elevated border border-border"
          data-testid="maintenance-curve-chain"
        >
          <div class="flex flex-col items-start gap-0.5">
            <span class="font-ui text-[0.62rem] tracking-[0.08em] uppercase text-tx-dim">
              {{ 'curveEditor.maintenance.year1' | transloco }}
            </span>
            <span class="font-mono text-[0.85rem] text-tx">
              {{ formatMoney(yr1Cost()) }}
            </span>
          </div>
          <div class="flex flex-col items-start gap-0.5">
            <span class="font-ui text-[0.62rem] tracking-[0.08em] uppercase text-tx-dim">
              {{ 'curveEditor.maintenance.yearN' | transloco: { year: keepYear() } }}
            </span>
            <span class="font-mono text-[0.85rem] text-tx">
              {{ formatMoney(yrNCost()) }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-2">
          @for (sample of activeSamples(); track sample.age) {
            <label class="flex flex-col gap-1 items-stretch">
              <span class="font-ui text-[0.7rem] tracking-[0.08em] uppercase text-tx-dim text-center">
                {{ 'curveEditor.yearAbbr' | transloco }} {{ sample.age }}
              </span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="10"
                [attr.data-testid]="'maintenance-curve-input-' + sample.age"
                [value]="(sample.factor * 100).toFixed(2)"
                (input)="onInput($index, $event)"
                (change)="onInput($index, $event)"
                class="w-full h-9 px-2 rounded-md bg-elevated border border-border text-center font-mono text-[0.85rem] text-tx focus:outline-none focus-within:border-accent focus:border-accent"
              />
              <span class="font-mono text-[0.62rem] text-tx-dim text-center">{{ 'curveEditor.maintenance.percentMsrp' | transloco }}</span>
            </label>
          }
        </div>

        <div class="flex items-center justify-between">
          @if (hasOverride()) {
            <button
              type="button"
              data-testid="maintenance-curve-reset"
              (click)="reset()"
              (pointerup)="reset()"
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.72rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <app-icon name="reset" [size]="12" /> {{ 'curveEditor.resetToDefault' | transloco }}
            </button>
          } @else {
            <span></span>
          }
          <form method="dialog" class="contents">
            <button
              type="submit"
              class="inline-flex items-center justify-center h-8 px-4 rounded-[8px] bg-accent text-bg border border-accent hover:brightness-110 font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {{ 'curveEditor.done' | transloco }}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  `,
})
export class MaintenanceCurveEditor {
  readonly open = model(false);

  protected readonly store = inject(ScenarioStore);
  private readonly transloco = inject(TranslocoService);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly hasOverride = computed(
    () => this.store.maintenanceCurveOverride() !== null,
  );

  protected readonly activeSamples = computed(() =>
    this.store.maintenanceCurve().samples.map((s) => ({ age: s.age, factor: s.factor })),
  );

  protected readonly keepYear = computed(() =>
    Math.max(Math.round(this.store.keepDuration()), 1),
  );

  // Mid-year-1 and mid-year-N samples for the chain display — same convention
  // as MaintenanceDisplay.
  protected readonly yr1Cost = computed(() => {
    const ctx = this.store.maintenanceContext();
    return maintenanceAt(ctx, this.store.vehicleAge() + 0.5);
  });

  protected readonly yrNCost = computed(() => {
    const ctx = this.store.maintenanceContext();
    const k = this.store.keepDuration();
    return maintenanceAt(ctx, this.store.vehicleAge() + Math.max(k - 0.5, 0.5));
  });

  protected formatMoney(v: number): string {
    return formatCurrency(v, this.store.formatContext(), 0);
  }

  // Currency multiplier — convert stored % factor to displayed currency.
  // Same product as `maintenanceAt` with agingScale=1 at curve(age).
  private readonly displayScale = computed(() => {
    const ctx = this.store.maintenanceContext();
    return ctx.msrp * ctx.categoryMult * ctx.mileageFactor;
  });

  // Dark-theme palette literals. Chart.js renders to canvas and cannot
  // resolve `var(--…)` at draw time, so duplicate the tokens from styles.css.
  private static readonly C_ACCENT = '#4f8ef7';
  private static readonly C_ACCENT_FILL = 'rgba(79, 142, 247, 0.18)';
  private static readonly C_TX_DIM = '#7282a3';
  private static readonly C_GRID = 'rgba(255, 255, 255, 0.06)';

  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const scale = this.displayScale();
    const previewSamples = buildMaintenancePreviewSamples(this.store.maintenanceCurve());
    const anchorSamples = this.activeSamples();
    return {
      labels: previewSamples.map((s) => s.age),
      datasets: [
        {
          label: 'curve',
          data: previewSamples.map((s) => ({ x: s.age, y: s.factor * scale })),
          borderColor: MaintenanceCurveEditor.C_ACCENT,
          backgroundColor: MaintenanceCurveEditor.C_ACCENT_FILL,
          borderWidth: 1.6,
          fill: true,
          tension: 0,
          pointRadius: 0,
          parsing: false,
          // Years 15+ are the linear-3× extrapolation tail — render as a
          // dashed hint so the user sees where editable anchors stop.
          segment: {
            borderDash: (ctx) => ((ctx.p1.parsed.x ?? 0) > 15 ? [4, 4] : undefined),
          },
          // Smooth-line points must NOT be draggable — only the anchors are.
          dragData: false,
        },
        {
          label: 'anchors',
          data: anchorSamples.map((s) => ({ x: s.age, y: s.factor * scale })),
          borderColor: 'transparent',
          backgroundColor: MaintenanceCurveEditor.C_ACCENT,
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHitRadius: 14,
          parsing: false,
          dragData: true,
        },
      ],
    };
  });

  // Highest displayed currency value across the preview window (curve +
  // extrapolation tail). Drives the Y-axis sizing.
  private readonly chartPeak = computed(() => {
    const scale = this.displayScale();
    const previewSamples = buildMaintenancePreviewSamples(this.store.maintenanceCurve());
    return previewSamples.reduce((m, s) => Math.max(m, s.factor), 0) * scale;
  });

  // Y-axis max with smooth scaling + wide hysteresis. We deliberately don't
  // round to "nice" values (1.5×, 3×, 6×, 12× of power-of-10) because the
  // tail-extrapolation lever effect (last-segment slope × 3 past year 15)
  // means a small drag on year 10 can swing the peak across a bracket
  // boundary and double the axis visibly. Smooth `peak × 1.30` plus a wide
  // [0.30, 0.95] band absorbs wiggles up to ±20%.
  protected readonly chartYMax = linkedSignal<number, number>({
    source: this.chartPeak,
    computation: (peak, previous) => {
      const target = peak * 1.3;
      if (!previous) return target;
      const cur = previous.value;
      if (peak > cur * 0.95) return target; // ceiling getting tight — bump up
      if (peak < cur * 0.3) return target; // way below — shrink
      return cur;
    },
  });

  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        filter: (item) => {
          const label = item.dataset.label ?? '';
          return label === 'curve' || label === 'anchors';
        },
        callbacks: {
          title: (items) => {
            const x = items[0]?.parsed.x ?? 0;
            return this.transloco.translate(
              'curveEditor.tooltipYear',
              { year: (+x).toFixed(1) },
              this.store.language(),
            );
          },
          label: (item) => {
            const y = (item.parsed.y ?? 0) as number;
            return this.transloco.translate(
              'curveEditor.maintenance.tooltipPerYear',
              { amount: this.formatMoney(y) },
              this.store.language(),
            );
          },
        },
      },
      // chartjs-plugin-dragdata: only the anchors dataset (index 1) is
      // draggable. Drag is constrained to the Y axis. Currency values come
      // out of the plugin; commitFactor divides by displayScale to land in
      // stored % space.
      dragData: {
        round: 0,
        dragX: false,
        showTooltip: true,
        onDragStart: (_e, datasetIndex) => {
          if (datasetIndex !== 1) return false;
          return undefined;
        },
        onDrag: (_e, datasetIndex, index, value) => {
          if (datasetIndex !== 1) return false;
          const yCurrency = (value as { x: number; y: number }).y;
          const scale = this.displayScale() || 1;
          this.commitFactor(index, yCurrency / scale);
          return false;
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: 0,
        max: MAINTENANCE_PREVIEW_END_AGE,
        border: { color: MaintenanceCurveEditor.C_GRID },
        ticks: {
          stepSize: 3,
          color: MaintenanceCurveEditor.C_TX_DIM,
          font: { size: 10 },
        },
        grid: { color: MaintenanceCurveEditor.C_GRID },
      },
      y: {
        min: 0,
        max: this.chartYMax(),
        border: { color: MaintenanceCurveEditor.C_GRID },
        ticks: {
          color: MaintenanceCurveEditor.C_TX_DIM,
          font: { size: 10 },
          callback: (v) => this.formatMoney(v as number),
        },
        grid: { color: MaintenanceCurveEditor.C_GRID },
      },
    },
  }));

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const dlg = this.dialogRef()?.nativeElement;
      if (!dlg) return;
      untracked(() => {
        if (isOpen && !dlg.open) dlg.showModal();
        else if (!isOpen && dlg.open) dlg.close();
      });
    });
  }

  openDialog(): void {
    this.open.set(true);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onDialogClose(): void {
    this.open.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) this.open.set(false);
  }

  protected reset(): void {
    this.store.maintenanceCurveOverride.set(null);
  }

  protected onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawPercent = parseFloat(input.value);
    if (!Number.isFinite(rawPercent)) return;
    const clamped = this.commitFactor(index, rawPercent / 100);
    input.value = (clamped * 100).toFixed(2);
  }

  // Single source of truth for "user is changing factor[i] to v" — currently
  // called only from the keyboard input handler; the drag handler will share
  // it once Task #8 lands.
  private commitFactor(index: number, rawFactor: number): number {
    const stored = factorsOfMaintenance(this.store.maintenanceCurve());
    if (index < 0 || index >= stored.length) return Number.NaN;
    const clamped = clampMaintenanceFactorAt(stored, index, rawFactor);
    if (clamped !== stored[index]) {
      stored[index] = clamped;
      this.store.maintenanceCurveOverride.set(makeMaintenanceCurve(stored));
    }
    return clamped;
  }
}

// Lint-quiet reference so `MAINTENANCE_ANCHOR_AGES` isn't tree-shaken — the
// activeSamples already carry the ages, but exporting the constant from
// here would muddy responsibilities.
void MAINTENANCE_ANCHOR_AGES;
