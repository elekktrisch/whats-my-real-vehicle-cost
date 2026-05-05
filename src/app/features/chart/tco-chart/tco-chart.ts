import {
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { formatCurrency } from '../../../scenario/locale.config';
import type {
  CostBreakdown,
  CostCategory,
  MonthlyTcoPoint,
} from '../../../scenario/scenario.types';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

interface LayerSpec {
  key: CostCategory;
  label: string;
  color: string;
  fill: string;
}

const LAYERS: readonly LayerSpec[] = [
  { key: 'depreciationOrLease',  label: 'Depreciation / lease', color: '#4f8ef7', fill: 'rgba(79, 142, 247, 0.30)' },
  { key: 'financing',            label: 'Financing',            color: '#7c5cff', fill: 'rgba(124, 92, 255, 0.30)' },
  { key: 'fuel',                 label: 'Fuel / electricity',   color: '#34d399', fill: 'rgba(52, 211, 153, 0.30)' },
  { key: 'insurance',            label: 'Insurance',            color: '#f4845f', fill: 'rgba(244, 132, 95, 0.30)' },
  { key: 'maintenance',          label: 'Maintenance',          color: '#facc15', fill: 'rgba(250, 204, 21, 0.28)' },
  { key: 'leaseEnd',             label: 'Lease-end fees',       color: '#f87171', fill: 'rgba(248, 113, 113, 0.30)' },
];

const MOBILE_BP = 600;
const TABLET_BP = 900;

@Component({
  selector: 'app-tco-chart',
  imports: [BaseChartDirective],
  template: `
    <div class="bg-surface border border-border rounded-xl pt-3 px-3 pb-4 sm:pt-[22px] sm:px-[22px]">
      <div class="flex items-center justify-between mb-[18px] flex-wrap gap-2">
        <span class="font-ui text-[0.75rem] font-medium tracking-[0.13em] uppercase text-tx-dim">
          Cumulative total cost of ownership
        </span>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          @for (layer of layers; track layer.key) {
            <span
              class="flex items-center gap-[6px] font-ui text-[0.75rem] text-tx-muted tracking-[0.04em]"
            >
              <span
                class="w-3 h-2 rounded-[2px] inline-block"
                [style.background]="layer.color"
              ></span>
              {{ layer.label }}
            </span>
          }
        </div>
      </div>

      <div class="relative w-full" [style.height.px]="chartHeight()">
        <canvas
          baseChart
          role="img"
          [attr.aria-label]="ariaSummary()"
          [data]="chartData()"
          [type]="'line'"
          [options]="chartOptions()"
        ></canvas>
      </div>

      <!-- sr-only table covers full data; aria-label on the canvas is just
           a headline. Year-aligned samples (≤ 15 rows) avoid the DOM/CD load
           of one-row-per-month at long keeps. -->
      <div class="sr-only">
        <table>
          <caption>Cumulative total cost of ownership by year and category</caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              @for (layer of layers; track layer.key) {
                <th scope="col">{{ layer.label }}</th>
              }
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (point of yearlySamples(); track point.month) {
              <tr>
                <th scope="row">{{ point.month / 12 }}</th>
                @for (layer of layers; track layer.key) {
                  <td>{{ money(point[layer.key]) }}</td>
                }
                <td>{{ money(rowTotal(point)) }}</td>
              </tr>
            }
        </tbody>
      </table>
    </div>
  `,
})
export class TcoChart {
  readonly breakdown = input.required<CostBreakdown>();

  protected readonly layers = LAYERS;
  private readonly store = inject(ScenarioStore);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly viewportWidth = signal<number>(
    typeof window === 'undefined' ? 1200 : window.innerWidth,
  );
  // Chart.js animations are JS-driven; the CSS media query doesn't reach them.
  private readonly reducedMotion = signal<boolean>(
    this.isBrowser && typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  @HostListener('window:resize')
  protected onResize(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    this.viewportWidth.set(window.innerWidth);
  }

  constructor() {
    if (!this.isBrowser || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener?.('change', (e) => this.reducedMotion.set(e.matches));
  }

  protected readonly chartHeight = computed(() => {
    const w = this.viewportWidth();
    if (w < MOBILE_BP) return 160;
    if (w < TABLET_BP) return 260;
    return 300;
  });

  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const series = this.breakdown().series;
    const labels = series.map((p) => `Mo ${p.month}`);
    const datasets = LAYERS.map((layer) => ({
      label: layer.label,
      data: series.map((p) => p[layer.key]),
      borderColor: layer.color,
      backgroundColor: layer.fill,
      fill: true,
      tension: 0.25,
      borderWidth: 1.25,
      pointRadius: 0,
      pointHoverRadius: 3,
      pointHoverBackgroundColor: layer.color,
    }));
    return { labels, datasets };
  });

  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const w = this.viewportWidth();
    const isMobile = w < MOBILE_BP;
    const isTablet = w >= MOBILE_BP && w < TABLET_BP;

    const tickFontSize = isMobile ? 11 : 13;
    const tooltipTitleSize = isMobile ? 12 : 13;
    const tooltipBodySize = isMobile ? 11 : 12;
    const maxTicksX = isMobile ? 4 : isTablet ? 6 : 8;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: this.reducedMotion() ? false : { duration: 240 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141e33',
          borderColor: 'rgba(255,255,255,0.10)',
          borderWidth: 1,
          titleColor: '#dde3f0',
          bodyColor: '#8896b3',
          titleFont: { family: 'Roboto', size: tooltipTitleSize, weight: '500' } as never,
          bodyFont: { family: 'JetBrains Mono', size: tooltipBodySize } as never,
          padding: 10,
          callbacks: {
            label: (ctx) => `  ${ctx.dataset.label}: ${this.money(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#5c6d8f',
            font: { family: 'JetBrains Mono', size: tickFontSize } as never,
            maxTicksLimit: maxTicksX,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.07)' },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#5c6d8f',
            font: { family: 'JetBrains Mono', size: tickFontSize } as never,
            callback: (v) => this.money(Number(v)),
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.07)' },
        },
      },
    };
  });

  protected readonly ariaSummary = computed(() => {
    const series = this.breakdown().series;
    const months = series.length > 0 ? series[series.length - 1].month : 0;
    const total = this.breakdown().total;
    const totals = this.breakdown().totals;
    const largest = LAYERS.reduce((a, b) => (totals[a.key] >= totals[b.key] ? a : b));
    return `Cumulative total cost of ownership over ${months} months. Total ${this.money(
      total,
    )}. Largest component: ${largest.label} at ${this.money(totals[largest.key])}.`;
  });

  protected money(v: number): string {
    return formatCurrency(v, this.store.locale(), 0);
  }

  protected rowTotal(point: MonthlyTcoPoint): number {
    let sum = 0;
    for (const layer of LAYERS) sum += point[layer.key];
    return sum;
  }

  protected readonly yearlySamples = computed<MonthlyTcoPoint[]>(() => {
    const series = this.breakdown().series;
    if (series.length === 0) return [];
    return series.filter((p) => p.month > 0 && p.month % 12 === 0);
  });
}