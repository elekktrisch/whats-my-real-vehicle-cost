import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { ScenarioStore } from './scenario/scenario.store';
import { URL_PARAM, decodeSnapshot, hasAnyState } from './scenario/scenario.serializer';

function readSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URL(window.location.href).searchParams;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAppInitializer(() => {
      const store = inject(ScenarioStore);
      const params = readSearchParams();
      const snap = decodeSnapshot(params.get(URL_PARAM));
      store.applySnapshot(snap);
      store.markHydrated({ hadReturningState: hasAnyState(params) });
    }),
  ],
};