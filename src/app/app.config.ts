import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';

import { routes } from './app.routes';
import { ScenarioStore } from './scenario/scenario.store';
import { URL_PARAM, decodeSnapshot, hasAnyState } from './scenario/scenario.serializer';
import { BundledTranslocoLoader, detectLanguage } from '../i18n';

function readSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URL(window.location.href).searchParams;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideTransloco({
      config: {
        availableLangs: ['en', 'de', 'it', 'fr', 'es'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: BundledTranslocoLoader,
    }),
    provideTranslocoMessageformat(),
    provideAppInitializer(() => {
      const store = inject(ScenarioStore);

      // Detection-time set: sync to Transloco but DON'T persist to
      // localStorage — only user-initiated flips should lock in.
      store.setLanguage(detectLanguage(), { persist: false });

      const params = readSearchParams();
      const snap = decodeSnapshot(params.get(URL_PARAM));
      store.applySnapshot(snap);
      store.markHydrated({ hadReturningState: hasAnyState(params) });
    }),
  ],
};
