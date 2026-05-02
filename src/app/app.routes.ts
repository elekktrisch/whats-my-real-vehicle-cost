import { Routes } from '@angular/router';
import type { Tab } from './scenario/scenario.types';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/splash-page/splash-page').then((m) => m.SplashPage),
  },
  {
    path: 'wizard',
    loadComponent: () => import('./pages/wizard-page/wizard-page').then((m) => m.WizardPage),
  },
  {
    path: 'lease',
    loadComponent: () => import('./pages/tab-page/tab-page').then((m) => m.TabPage),
    data: { tab: 'lease' as Tab },
  },
  {
    path: 'finance',
    loadComponent: () => import('./pages/tab-page/tab-page').then((m) => m.TabPage),
    data: { tab: 'finance' as Tab },
  },
  {
    path: 'cash',
    loadComponent: () => import('./pages/tab-page/tab-page').then((m) => m.TabPage),
    data: { tab: 'cash' as Tab },
  },
  { path: '**', redirectTo: '' },
];