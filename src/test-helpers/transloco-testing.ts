import { EnvironmentProviders, Provider } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { BundledTranslocoLoader } from '../i18n';

/**
 * Bundles the Transloco providers required by ScenarioStore (it injects
 * TranslocoService) and any component that uses the `transloco` pipe.
 *
 * Tests load the bundled EN catalog with language fixed to `'en'`, so
 * existing assertions on English copy keep working without per-spec setup.
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
  ];
}
