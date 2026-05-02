import { Component, computed, input } from '@angular/core';
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
import type { CostBreakdown, CostCategory } from '../../../scenario/scenario.types';

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

const LAYERS: LayerSpec[] = [
  { key: 'depreciationOrLease',  label: 'Depreciation / lease', color: '#4f8ef7', fill: 'rgba(79, 142, 247, 0.30)' },
  { key: 'financing',            label: 'Financing',            color: '#7c5cff', fill: 'rgba(124, 92, 255, 0.30)' },
  { key: 'fuel',                 label: 'Fuel / electricity',   color: '#34d399', fill: 'rgba(52, 211, 153, 0.30)' },
  { key: 'insurance',            label: 'Insurance',            color: '#f4845f', fill: 'rgba(244, 132, 95, 0.30)' },
  { key: 'maintenance',          label: 'Maintenance',          color: '#facc15', fill: 'rgba(250, 204, 21, 0.28)' },
  { key: 'leaseEnd',             label: 'Lease-end fees',       color: '#f87171', fill: 'rgba(248, 113, 113, 0.30)' },
];

@Component({
  selector: 'app-tco-chart-desktop',
  imports: [BaseChartDirective],
  template: `
    <div class="bg-surface border border-border rounded-xl pt-[22px] px-[22px] pb-4">
      <div class="flex items-center justify-between mb-[18px] flex-wrap gap-2">
        <span
          class="font-ui text-[0.62rem] font-medium tracking-[0.13em] uppercase text-tx-dim"
        >
          Cumulative total cost of ownership
        </span>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          @for (layer of layers; track layer.key) {
            <span
              class="flex items-center gap-[6px] font-ui text-[0.62rem] text-tx-muted tracking-[0.04em]"
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
      <canvas baseChart [data]="chartData()" [type]="'line'" [options]="chartOptions"></canvas>
    </div>
  `,
})
export class TcoChartDesktop {
  readonly breakdown = input.required<CostBreakdown>();

  protected readonly layers = LAYERS;

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

  protected readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.2,
    animation: { duration: 240 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141e33',
        borderColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        titleColor: '#dde3f0',
        bodyColor: '#8896b3',
        titleFont: { family: 'Roboto', size: 12, weight: '500' } as never,
        bodyFont: { family: 'JetBrains Mono', size: 11 } as never,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const v = Math.round(ctx.parsed.y);
            return `  ${ctx.dataset.label}: $${v.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#5c6d8f',
          font: { family: 'JetBrains Mono', size: 10 } as never,
          maxTicksLimit: 8,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.07)' },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          color: '#5c6d8f',
          font: { family: 'JetBrains Mono', size: 10 } as never,
          callback: (v) =>
            `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.07)' },
      },
    },
  };
}