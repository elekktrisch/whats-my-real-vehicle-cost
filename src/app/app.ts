import { Component, signal } from '@angular/core';
import { LeaseTab } from './lease-tab/lease-tab';

@Component({
  selector: 'app-root',
  imports: [LeaseTab],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('car-leasing-chart');

  activeTab: 'lease' | 'financing' | 'cash' = 'lease';
}