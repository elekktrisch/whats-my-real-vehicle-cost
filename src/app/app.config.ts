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
  STORAGE_KEY,
  fromLocalStorage,
  fromQueryParams,
  tabFromPath,
} from './scenario/scenario.serializer';
import type { ScenarioSnapshot } from './scenario/scenario.types';

function readSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URL(window.location.href).searchParams;
}

function readLocalStorage(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function merge(
  base: Partial<ScenarioSnapshot>,
  over: Partial<ScenarioSnapshot>,
): Partial<ScenarioSnapshot> {
  return {
    globals: { ...(base.globals ?? {}), ...(over.globals ?? {}) } as ScenarioSnapshot['globals'],
    lease: { ...(base.lease ?? {}), ...(over.lease ?? {}) } as ScenarioSnapshot['lease'],
    finance: { ...(base.finance ?? {}), ...(over.finance ?? {}) } as ScenarioSnapshot['finance'],
    cash: { ...(base.cash ?? {}), ...(over.cash ?? {}) } as ScenarioSnapshot['cash'],
    overrides: {
      ...(base.overrides ?? {}),
      ...(over.overrides ?? {}),
    } as ScenarioSnapshot['overrides'],
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAppInitializer(() => {
      const store = inject(ScenarioStore);
      const params = readSearchParams();
      const fromUrl = fromQueryParams(params);
      const fromLs = fromLocalStorage(readLocalStorage());
      // URL wins over localStorage (sharing-via-link is the headline use case).
      const merged = merge(fromLs, fromUrl);

      // Active tab comes from the route path, not from query params.
      const pathTab =
        typeof window === 'undefined' ? null : tabFromPath(window.location.pathname);
      if (pathTab) {
        merged.globals = {
          ...(merged.globals ?? ({} as ScenarioSnapshot['globals'])),
          activeTab: pathTab,
        } as ScenarioSnapshot['globals'];
      }

      store.applySnapshot(merged);
      store.markHydrated();
    }),
  ],
};