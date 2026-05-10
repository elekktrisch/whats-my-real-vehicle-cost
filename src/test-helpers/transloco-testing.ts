import {
  EnvironmentProviders,
  Provider,
  ENVIRONMENT_INITIALIZER,
  inject,
} from '@angular/core';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { BundledTranslocoLoader, en, de } from '../i18n';

/**
 * Bundles the Transloco providers required by ScenarioStore (it injects
 * TranslocoService) and any component that uses the `transloco` pipe.
 *
 * Tests load the bundled EN catalog *synchronously* via setTranslation so
 * `translate()` returns the actual string immediately rather than the key
 * (the loader path is async and tests can't await its observable).
 */
export function provideTranslocoTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideTransloco({
      config: {
        availableLangs: ['en', 'de'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: true,
      },
      loader: BundledTranslocoLoader,
    }),
    provideTranslocoMessageformat(),
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const transloco = inject(TranslocoService);
        transloco.setTranslation(en, 'en');
        transloco.setTranslation(de, 'de');
        transloco.setActiveLang('en');
      },
    },
  ];
}
