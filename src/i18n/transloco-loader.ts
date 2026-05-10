import { Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { de } from './de';
import { en } from './en';

const CATALOGS: Record<string, Translation> = { en, de };

@Injectable({ providedIn: 'root' })
export class BundledTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(CATALOGS[lang] ?? CATALOGS['en']);
  }
}
