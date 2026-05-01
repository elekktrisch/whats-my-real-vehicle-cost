import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { SliderControl } from '../shared/slider-control/slider-control';
import { KpiCard } from '../shared/kpi-card/kpi-card';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-lease-tab',
  imports: [FormsModule, BaseChartDirective, DecimalPipe, SliderControl, KpiCard],
  templateUrl: './lease-tab.html',
})
export class LeaseTab {
  capitalizedCosts = 34400;
  downPayment = 15000;
  residualPrice = 15300;
  apr = 2.94;
  months = 48;

  get adjustedCapCost() {
    return this.capitalizedCosts - this.downPayment;
  }
  get moneyFactor() {
    return this.apr / 2400;
  }
  get depreciationFee() {
    return (this.adjustedCapCost - this.residualPrice) / this.months;
  }
  get financeFee() {
    return this.capitalizedCosts * this.moneyFactor;
  }
  get monthlyPayment() {
    return this.depreciationFee + this.financeFee;
  }

  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 280 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141e33',
        borderColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        titleColor: '#dde3f0',
        bodyColor: '#8896b3',
        titleFont: { family: 'Roboto', size: 12, weight: '500' } as any,
        bodyFont: { family: 'JetBrains Mono', size: 11 } as any,
        padding: 10,
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.parsed.y as number;
            return `  $${Math.round(val).toLocaleString('en-US')}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#5c6d8f',
          font: { family: 'JetBrains Mono', size: 10 } as any,
          maxTicksLimit: 7,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.07)' },
      },
      y: {
        ticks: {
          color: '#5c6d8f',
          font: { family: 'JetBrains Mono', size: 10 } as any,
          callback: (v: any) =>
            `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.07)' },
      },
    },
  };

  private updateTimer: ReturnType<typeof setTimeout> | null = null;

  scheduleUpdate() {
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => this.updateChart(), 200);
  }

  updateChart() {
    const depreciation = (this.capitalizedCosts - this.residualPrice) / this.months;
    const labels: string[] = [];
    const debtData: number[] = [];
    const valueData: number[] = [];

    for (let i = 0; i <= this.months; i++) {
      labels.push(`Mo ${i}`);
      debtData.push(this.monthlyPayment * (this.months - i));
      valueData.push(this.capitalizedCosts - depreciation * i);
    }

    this.chartData = {
      labels,
      datasets: [
        {
          data: debtData,
          label: 'Lease Debt',
          borderColor: '#f4845f',
          backgroundColor: 'rgba(244, 132, 95, 0.05)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#f4845f',
        },
        {
          data: valueData,
          label: 'Vehicle Value',
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79, 142, 247, 0.05)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#4f8ef7',
        },
      ],
    };
  }

  ngOnInit() {
    this.updateChart();
  }
}