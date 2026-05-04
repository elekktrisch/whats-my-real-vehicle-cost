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
import {
  SHARE_PARAM,
  URL_PARAM,
  decodeShareSnapshot,
  decodeSnapshot,
  hasAnyState,
} from './scenario/scenario.serializer';

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
      // Try the compressed share param first; fall back to the JSON
      // persistence param. The autosave will re-write `?s=<JSON>` after
      // the first state change so the URL settles to the readable form.
      const shared = params.get(SHARE_PARAM);
      const snap = shared
        ? decodeShareSnapshot(shared)
        : decodeSnapshot(params.get(URL_PARAM));
      store.applySnapshot(snap);
      store.markHydrated({ hadReturningState: hasAnyState(params) });
    }),
  ],
};