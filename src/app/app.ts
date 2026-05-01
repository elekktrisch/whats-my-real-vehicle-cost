import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  Legend
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend
);
@Component({
  selector: 'app-root',
  imports: [FormsModule, BaseChartDirective, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('car-leasing-chart');

    capitalizedCosts = 34400;
    downPayment = 15000;
    residualPrice = 15300;
    apr = 2.94;
    months = 48;

    get adjustedCapCost() { return this.capitalizedCosts - this.downPayment; }
    get moneyFactor() { return this.apr / 2400; }
    get depreciationFee() { return (this.adjustedCapCost - this.residualPrice) / this.months; }
    get financeFee() { return this.capitalizedCosts * this.moneyFactor; }
    get monthlyPayment() { return this.depreciationFee + this.financeFee; }
    get debt() { return this.capitalizedCosts + this.financeFee + this.depreciationFee - this.downPayment; }

    activeTab: 'lease' | 'financing' | 'cash' = 'lease';

    chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

    private updateTimer: ReturnType<typeof setTimeout> | null = null;

    scheduleUpdate() {
      if (this.updateTimer) clearTimeout(this.updateTimer);
      this.updateTimer = setTimeout(() => this.updateChart(), 200);
    }

    updateChart() {
      const depreciation = (this.capitalizedCosts - this.residualPrice) / this.months;
      const labels = [];
      const data = [];
      const data2 = [];

      for (let i = 0; i <= this.months; i++) {
        labels.push(`Month ${i}`);
        data.push(this.debt - this.monthlyPayment * i);
        data2.push(this.capitalizedCosts - depreciation * i);
      }

      this.chartData = {
        labels,
        datasets: [
          { data, label: 'Lease Debt Over Time', borderColor: '#ff95cd', fill: false },
          { data: data2, label: 'Car Value Over Time', borderColor: '#3e95cd', fill: false },
        ],
      };
    }

    ngOnInit() {
      this.updateChart();
    }
}
