import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
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
  ANCHOR_AGES,
  buildPreviewSamples,
  clampFactorAt,
  depreciationFactor,
  factorsOf,
  makeCurve,
} from '../../../scenario/calculations/depreciation';
import { Icon } from '../../atoms/icon/icon';
import { MoneyPipe } from '../../pipes/money.pipe';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);
Chart.register(dragDataPlugin);

@Component({
  selector: 'app-depreciation-curve-editor',
  imports: [Icon, BaseChartDirective, MoneyPipe],
  template: `
    <button
      type="button"
      data-testid="curve-trigger"
      (click)="openDialog()"
      class="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.72rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      Edit depreciation curve
      @if (hasOverride()) {
        <span
          data-testid="curve-override-dot"
          aria-label="Override active"
          class="inline-block size-1.5 rounded-full bg-accent"
        ></span>
      }
    </button>

    <dialog
      #dlg
      (close)="onDialogClose()"
      (click)="onBackdropClick($event)"
      class="m-auto p-0 rounded-[18px] bg-surface text-tx border border-border max-w-[480px] w-[calc(100%-2rem)] [&::backdrop]:bg-black/60 [&::backdrop]:backdrop-blur-sm"
    >
      <div class="p-6 sm:p-7 flex flex-col gap-5">
        <header class="flex items-center justify-between">
          <h2 class="font-ui text-[1rem] font-medium tracking-[-0.01em] text-tx">
            Depreciation curve
          </h2>
          <button
            type="button"
            (click)="close()"
            aria-label="Close"
            class="size-7 inline-flex items-center justify-center rounded-[8px] text-tx-muted hover:text-tx hover:bg-elevated transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <app-icon name="close" [size]="16" />
          </button>
        </header>

        <p class="font-ui text-[0.78rem] text-tx-muted leading-snug">
          Set the resale value as a fraction of MSRP at each milestone year.
          Defaults differ for ICE and EV; your override applies regardless of
          powertrain.
        </p>

        <div data-testid="curve-preview" class="relative h-[180px]">
          <canvas
            baseChart
            [data]="chartData()"
            [options]="chartOptions()"
            type="line"
          ></canvas>
        </div>

        <div
          class="flex flex-wrap gap-x-6 gap-y-2 px-3 py-2 rounded-md bg-elevated border border-border"
        >
          <div class="flex flex-col items-start gap-0.5" data-testid="curve-chain-msrp">
            <span
              class="font-ui text-[0.62rem] tracking-[0.08em] uppercase text-tx-dim"
            >
              MSRP
            </span>
            <span class="font-mono text-[0.85rem] text-tx">
              {{ store.msrp() | money }}
            </span>
          </div>
          @if (store.activeTab() === 'lease') {
            <div
              class="flex flex-col items-start gap-0.5"
              data-testid="curve-chain-residual-lease"
            >
              <span
                class="font-ui text-[0.62rem] tracking-[0.08em] uppercase text-tx-dim"
              >
                Residual @ lease end
              </span>
              <span class="font-mono text-[0.85rem] text-tx">
                {{ leaseEndResidualPreview() | money }}
              </span>
            </div>
          }
          <div class="flex flex-col items-start gap-0.5" data-testid="curve-chain-residual-keep">
            <span
              class="font-ui text-[0.62rem] tracking-[0.08em] uppercase text-tx-dim"
            >
              Residual @ end of keep
            </span>
            <span class="font-mono text-[0.85rem] text-tx">
              {{ residualValuePreview() | money }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-2">
          @for (sample of activeSamples(); track sample.age) {
            <label class="flex flex-col gap-1 items-stretch">
              <span
                class="font-ui text-[0.7rem] tracking-[0.08em] uppercase text-tx-dim text-center"
              >
                Yr {{ sample.age }}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                [attr.data-testid]="'curve-input-' + sample.age"
                [readOnly]="$index === 0"
                [value]="sample.factor.toFixed(2)"
                (input)="onInput($index, $event)"
                (change)="onInput($index, $event)"
                class="w-full h-9 px-2 rounded-md bg-elevated border border-border text-center font-mono text-[0.85rem] text-tx focus:outline-none focus-within:border-accent focus:border-accent disabled:text-tx-dim read-only:text-tx-dim read-only:cursor-not-allowed"
              />
            </label>
          }
        </div>

        <div class="flex items-center justify-between">
          @if (hasOverride()) {
            <button
              type="button"
              data-testid="curve-reset"
              (click)="reset()"
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent font-ui text-[0.72rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <app-icon name="reset" [size]="12" /> Reset to default
            </button>
          } @else {
            <span></span>
          }
          <button
            type="button"
            (click)="close()"
            class="inline-flex items-center justify-center h-8 px-4 rounded-[8px] bg-accent text-bg border border-accent hover:brightness-110 font-ui text-[0.75rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class DepreciationCurveEditor {
  readonly open = model(false);

  protected readonly store = inject(ScenarioStore);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly hasOverride = computed(
    () => this.store.depreciationCurveOverride() !== null,
  );

  // The factor at vehicleAge under the active curve. Used as the
  // denominator for display-only normalization: every shown factor is
  // expressed relative to today's price (= 1.0 at vehicleAge), so MSRP
  // appears as a value > 1 for used cars.
  protected readonly vehicleAgeFactor = computed(() =>
    depreciationFactor(this.store.vehicleAge(), this.store.depreciationCurve()),
  );

  // Anchor samples in vehicleAge-normalized space (what the user sees
  // and edits). Stored values stay MSRP-normalized.
  protected readonly activeSamples = computed(() => {
    const denom = this.vehicleAgeFactor() || 1;
    return this.store.depreciationCurve().samples.map((s) => ({
      age: s.age,
      factor: s.factor / denom,
    }));
  });

  // Auto-derived residual previews — computed from msrp × factor(endAge,
  // active-curve), independent of any user residual override. The point
  // is to show what the *curve* implies, so the user can see the effect
  // of dragging anchor points immediately.
  protected readonly residualValuePreview = computed(() => {
    const endAge = this.store.vehicleAge() + this.store.keepDuration();
    return Math.round(this.store.msrp() * depreciationFactor(endAge, this.store.depreciationCurve()));
  });

  protected readonly leaseEndResidualPreview = computed(() => {
    const endAge = this.store.vehicleAge() + this.store.leaseTerm() / 12;
    return Math.round(this.store.msrp() * depreciationFactor(endAge, this.store.depreciationCurve()));
  });

  // Smooth PCHIP samples for the chart line + extrapolation tail.
  // The dataset is split visually via `segment.borderDash` so years 12–15
  // render as a dotted hint of the exponential extrapolation.
  // Dark-theme palette literals — Chart.js renders to canvas and cannot
  // resolve `var(--…)` at draw time, so we duplicate the tokens from
  // src/styles.css (`--color-accent`, `--color-tx-dim`).
  private static readonly C_ACCENT = '#4f8ef7';
  private static readonly C_ACCENT_FILL = 'rgba(79, 142, 247, 0.18)';
  private static readonly C_TX_DIM = '#7282a3';
  private static readonly C_GRID = 'rgba(255, 255, 255, 0.06)';

  // Smooth + anchor data, both rendered in vehicleAge-normalized space.
  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const denom = this.vehicleAgeFactor() || 1;
    const previewSamples = buildPreviewSamples(this.store.depreciationCurve());
    const anchorSamples = this.activeSamples(); // already normalized
    const vehicleAge = this.store.vehicleAge();
    const yMax = this.chartYMax();
    return {
      labels: previewSamples.map((s) => s.age),
      datasets: [
        {
          label: 'curve',
          data: previewSamples.map((s) => ({ x: s.age, y: s.factor / denom })),
          borderColor: DepreciationCurveEditor.C_ACCENT,
          backgroundColor: DepreciationCurveEditor.C_ACCENT_FILL,
          borderWidth: 1.6,
          fill: true,
          tension: 0,
          pointRadius: 0,
          parsing: false,
          segment: {
            borderDash: (ctx) => ((ctx.p1.parsed.x ?? 0) > 12 ? [4, 4] : undefined),
          },
          // The smooth line has 60+ points; without this, the plugin
          // makes them all draggable and onDrag fires with indices that
          // are out of range for our 5-anchor model.
          dragData: false,
        },
        {
          label: 'anchors',
          data: anchorSamples.map((s) => ({ x: s.age, y: s.factor })),
          borderColor: 'transparent',
          backgroundColor: DepreciationCurveEditor.C_ACCENT,
          showLine: false,
          // Y0 is locked; the rest are larger/draggable hit-targets.
          pointRadius: anchorSamples.map((_, i) => (i === 0 ? 3 : 6)),
          pointHoverRadius: anchorSamples.map((_, i) => (i === 0 ? 3 : 8)),
          pointHitRadius: 14,
          parsing: false,
          dragData: true,
        },
        // Hint cross at (vehicleAge, 1.0) — vertical and horizontal
        // dashed reference lines + a labeled marker so the user sees
        // their current car position locked at "today's price".
        {
          label: 'today-vertical',
          data: [
            { x: vehicleAge, y: 0 },
            { x: vehicleAge, y: yMax },
          ],
          borderColor: DepreciationCurveEditor.C_TX_DIM,
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          parsing: false,
          dragData: false,
        },
        {
          label: 'today-horizontal',
          data: [
            { x: 0, y: 1 },
            { x: 15, y: 1 },
          ],
          borderColor: DepreciationCurveEditor.C_TX_DIM,
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          parsing: false,
          dragData: false,
        },
        {
          label: 'today-marker',
          data: [{ x: vehicleAge, y: 1 }],
          borderColor: 'transparent',
          backgroundColor: DepreciationCurveEditor.C_TX_DIM,
          showLine: false,
          pointRadius: 5,
          pointStyle: 'rectRot',
          parsing: false,
          dragData: false,
        },
      ],
    };
  });

  // Y-axis grows to fit the displayed Y0 (= MSRP relative to today).
  protected readonly chartYMax = computed(() => {
    const denom = this.vehicleAgeFactor() || 1;
    const yTop = 1 / denom;
    return Math.max(1.1, Math.ceil(yTop * 10) / 10 + 0.1);
  });

  // Computed because y.max scales with vehicleAge (so MSRP fits when it
  // displays > 1.0 for older used cars).
  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        filter: (item) => {
          // Suppress tooltip on the synthetic reference lines/marker.
          const label = item.dataset.label ?? '';
          return label === 'curve' || label === 'anchors';
        },
        callbacks: {
          title: (items) => {
            const x = items[0]?.parsed.x ?? 0;
            return `Year ${(+x).toFixed(1)}`;
          },
          label: (item) => {
            const y = (item.parsed.y ?? 0) as number;
            return `${(y * 100).toFixed(0)}% of today's price`;
          },
        },
      },
      // chartjs-plugin-dragdata config. We constrain dragging to the Y
      // axis on the anchor dataset; index 0 (Y0) is rejected from
      // onDragStart so it stays locked at the MSRP reference (read-only).
      dragData: {
        round: 2,
        dragX: false,
        showTooltip: true,
        onDragStart: (_e, datasetIndex, index) => {
          // Only the anchors dataset (index 1) is draggable; reject
          // anything else, plus index 0 (locked MSRP anchor).
          if (datasetIndex !== 1) return false;
          if (index === 0) return false;
          return undefined;
        },
        onDrag: (_e, datasetIndex, index, value) => {
          if (datasetIndex !== 1) return false;
          const y = (value as { x: number; y: number }).y;
          // The chart shows displayed (vehicleAge-normalized) values;
          // commitFactor expects displayed-space input and converts
          // back to stored space.
          this.commitFactor(index, y);
          return false;
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: 0,
        max: 15,
        border: { color: DepreciationCurveEditor.C_GRID },
        ticks: {
          stepSize: 1,
          color: DepreciationCurveEditor.C_TX_DIM,
          font: { size: 10 },
        },
        grid: { color: DepreciationCurveEditor.C_GRID },
      },
      y: {
        min: 0,
        max: this.chartYMax(),
        border: { color: DepreciationCurveEditor.C_GRID },
        ticks: {
          stepSize: 0.25,
          color: DepreciationCurveEditor.C_TX_DIM,
          font: { size: 10 },
          callback: (v) => `${Math.round((v as number) * 100)}%`,
        },
        grid: { color: DepreciationCurveEditor.C_GRID },
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
    this.store.depreciationCurveOverride.set(null);
  }

  protected onInput(index: number, event: Event): void {
    if (index === 0) return;
    const input = event.target as HTMLInputElement;
    const rawDisplayed = parseFloat(input.value);
    if (!Number.isFinite(rawDisplayed)) return;
    const clampedDisplayed = this.commitFactor(index, rawDisplayed);
    input.value = clampedDisplayed.toFixed(2);
  }

  // Single source of truth for "user is changing factor[i] to v" — called
  // from both the keyboard input handler and the drag callback. Inputs
  // are in *displayed* (vehicleAge-normalized) space; we convert to
  // stored (MSRP-normalized) space, clamp, and write. Returns the
  // actually-stored value in *displayed* form so callers can reflect it.
  private commitFactor(index: number, rawDisplayed: number): number {
    // Drag bug guard: the plugin can call onDrag with a datasetIndex/index
    // pair we didn't expect — bail rather than corrupt the curve.
    const stored = factorsOf(this.store.depreciationCurve());
    if (index < 0 || index >= stored.length) return Number.NaN;
    const denom = this.vehicleAgeFactor() || 1;
    const rawStored = rawDisplayed * denom;
    const clampedStored = clampFactorAt(stored, index, rawStored);
    if (clampedStored !== stored[index]) {
      stored[index] = clampedStored;
      this.store.depreciationCurveOverride.set(makeCurve(stored));
    }
    return clampedStored / denom;
  }
}

// Keep a lint-quiet reference so the `ANCHOR_AGES` import isn't tree-shaken
// by accident — the activeSamples already carry the ages, but exporting the
// constant from this module would muddy responsibilities.
void ANCHOR_AGES;
