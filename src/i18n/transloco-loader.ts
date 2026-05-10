import { Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';

const CATALOGS: Record<string, Translation> = { en, de, it, fr, es };

@Injectable({ providedIn: 'root' })
export class BundledTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(CATALOGS[lang] ?? CATALOGS['en']);
  }
}
