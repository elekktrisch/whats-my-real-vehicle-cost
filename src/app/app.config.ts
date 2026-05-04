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
  URL_PARAM,
  decodeSnapshot,
  hasAnyState,
  tabFromPath,
} from './scenario/scenario.serializer';
import type { ScenarioSnapshot } from './scenario/scenario.types';

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
      const merged: Partial<ScenarioSnapshot> = decodeSnapshot(params.get(URL_PARAM));

      // Active tab still comes from the route path while routes 'lease | finance
      // | cash' exist (Phase E consolidates everything to '/'). The path wins
      // over the JSON snapshot so deep links to a specific tab keep working.
      const pathTab =
        typeof window === 'undefined' ? null : tabFromPath(window.location.pathname);
      if (pathTab) {
        merged.globals = {
          ...(merged.globals ?? ({} as ScenarioSnapshot['globals'])),
          activeTab: pathTab,
        } as ScenarioSnapshot['globals'];
      }

      store.applySnapshot(merged);
      store.markHydrated({ hadReturningState: hasAnyState(params) || !!pathTab });
    }),
  ],
};