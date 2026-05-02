import { Component } from '@angular/core';
import { TabPage } from './pages/tab-page/tab-page';

@Component({
  selector: 'app-root',
  imports: [TabPage],
  template: `<app-tab-page />`,
})
export class App {}