import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/app-shell/app-shell').then((m) => m.AppShell),
  },
  { path: '**', redirectTo: '' },
];