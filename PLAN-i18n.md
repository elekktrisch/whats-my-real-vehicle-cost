# PLAN — Internationalization

Branch: `i18n`. One big PR. Lands a working en + de UI with the locale model split into Region + Language axes.

## Decisions (locked via /grill-me, do not relitigate)

### Scope & model

- **Split the overloaded `Locale` axis** into two independent axes:
  - `Region` — `'US' | 'EU'`. Controls units, currency symbol, default rates, distance/fuel units, etc. (the things `LOCALE_CONFIG` controls today).
  - `Language` — `'en' | 'de'`. Controls UI text only.
- Rename current `Locale` → `Region` codebase-wide. `LOCALE_CONFIG` → `REGION_CONFIG`. `localeFromTimezone` → `regionFromTimezone`. `detectLocaleFromBrowser` → `detectRegionFromBrowser`. `store.locale` → `store.region`. `store.localeConfig` → `store.regionConfig`. `setLocale` → `setRegion`.
- **Fix the existing `'Leasingfaktor'` leak** in `LOCALE_CONFIG.EU.leaseRateLabel` — that string moves into the translation catalog (region-keyed via ICU select).
- `Language` is an enum `'en' | 'de'`. Add a derived `bcp47` computed on the store:
  - `en + US → 'en-US'`
  - `en + EU → 'en-GB'`
  - `de + US → 'de-DE'`
  - `de + EU → 'de-DE'`

### Engine

- **Transloco** (`@jsverse/transloco@^8.3.0`) with the **MessageFormat plugin** (`@jsverse/transloco-messageformat@^8.3.0`) for ICU plurals + select.
- Catalogs live as **bundled TS imports**: `src/i18n/en.ts` and `src/i18n/de.ts`. All eagerly loaded — single bundle, instant switch. Provide via Transloco's `TRANSLOCO_LOADER`.
- **Namespaced keys** grouped by feature (`splash.heroTitle`, `chart.legend.depreciation`, `lease.fields.apr.label`, etc.).
- **Region-driven labels** use ICU select inside the value, not split keys: e.g. `lease.rateLabel = "{region, select, US {Money factor} EU {Lease factor}}"`.

### UX

- **Existing region flag selector untouched.** Stays in the page header.
- **New `Footer` component**, both pages, end-of-scroll:
  - Splash: `LanguageSelector` + GitHub link + disclaimer.
  - Comparison: `LanguageSelector` + Reset + Share + GitHub + disclaimer (extracts the existing block at `comparison-page.ts:62-96`).
- Fineprint paragraph translated to DE creatively (preserve the casual, self-deprecating tone — not literal).

### Detection & persistence

- **Cold-load order**: `localStorage` > `navigator.language` (stripped to base) > `'en'` fallback.
- **Manual flip → write to `localStorage`**. This is a one-time carve-out from CLAUDE.md's "URL is the only persistence channel; no localStorage" rule. CLAUDE.md must be updated to note the exception.
- **Language is NOT in the `?s=` snapshot.** Sharing a URL doesn't override the recipient's language. No serializer change needed.

### Plumbing

- **Format helpers** take a `FormatContext` object: `formatCurrency(value, ctx, fractionDigits)` where `ctx = { region, language }`. Same for `formatCompactCurrency`. Internally derive the BCP-47 string for `toLocaleString`. Add a `bcp47ForContext(ctx)` helper.
- **Pure calc functions stop building user-facing strings.** `recommendTab()` returns structured data (`{ tab, others: [{tab, cost}, ...] }`); the UI component renders the sentence via `t('recommendation.reason', {...})`.
- **Tests load the real EN catalog** with language fixed to `'en'`. Provide a `provideTranslocoTesting()` helper or similar in a test harness module. Existing assertions on English copy keep working.

### Sequencing

- One big PR on branch `i18n`.

### Open / deferred (copy-only, not architecture)

- DE wording for splash hero (`"What's my real vehicle cost?"` → ?). Pick a tagline that lands in DE; not a literal translation.
- DE wording for the casual fineprint paragraph.

## Implementation order (mapped to TaskCreate IDs)

1. **Install Transloco + MessageFormat** (`@jsverse/transloco@^8.3.0`, `@jsverse/transloco-messageformat@^8.3.0`).
2. **Scaffold catalogs + Transloco config**: `src/i18n/en.ts`, `de.ts` (empty namespaces stubbed), `src/i18n/transloco-loader.ts` (TS-import loader), wire `provideTransloco()` + `provideTranslocoMessageformat()` in `app.config.ts`.
3. **Add `Language` axis to types + store**:
   - `Language` type in `scenario.types.ts`.
   - `language` signal + `setLanguage()` on `ScenarioStore`.
   - `localStorage` persistence (write on every flip; read once on init).
   - `detectLanguageFromBrowser()` helper in `locale.config.ts` (will move to `region.config.ts` after rename).
   - `bcp47` computed on store. `formatContext` computed on store.
   - APP_INITIALIZER in `app.config.ts` resolves initial language and calls `transloco.setActiveLang(...)`.
4. **Rename `Locale` → `Region` across the codebase** (mechanical churn):
   - `scenario.types.ts`: `Locale` → `Region` type.
   - `locale.config.ts` → `region.config.ts`. `LOCALE_CONFIG` → `REGION_CONFIG`. Function renames as listed above. **Remove `leaseRateLabel`** from `REGION_CONFIG.EU` (it moves to the catalog).
   - `scenario.store.ts`: `locale` signal → `region`, `localeConfig` → `regionConfig`, `setLocale` → `setRegion`. Stash maps key on region. Update all internal usages.
   - `scenario.serializer.ts`: encode/decode reads/writes `region` field. Backwards-compatible decode: accept legacy `locale` key as `region`.
   - `scenario.defaults.ts`: `locale` default value → `region`.
   - All calc functions (`category`, `financing`, `recommendation`, `tco-*`) accept `region` instead of `locale`.
   - All components reading `store.locale()` → `store.region()`.
   - `RegionSelector` component → `RegionSelector` (file rename + selector rename `app-locale-selector` → `app-region-selector`).
5. **Refactor `formatCurrency` and friends to `FormatContext`**:
   - `FormatContext` type in `region.config.ts` (or a new `format.ts`).
   - `formatCurrency(value, ctx, fractionDigits)`, `formatCompactCurrency(value, ctx, subThousandFractionDigits)`.
   - Internal `bcp47ForContext(ctx)` helper.
   - Update every call site (the store's `activeConflicts`, components, recommendation, share dialog). Many sites — use Edit with care.
6. **Refactor `recommendTab` to return structured data**:
   - New return shape: `{ tab: Tab; winnerCost: number; others: Array<{ tab: Tab; cost: number }> }`.
   - Drop `locale` and `distanceUnit` from the input — they were only for string building.
   - Drop `formatCurrency` import from the calc layer.
   - Update `comparison-page.ts` to read `recommended.tab` and `recommended.others`, render the reason via `transloco.translate('recommendation.reason', {...})` or a template `t` pipe.
7. **Build `LanguageSelector` + `Footer` components**:
   - `shared/molecules/language-selector/` — pill toggle (EN/DE), signal-based, wraps `store.setLanguage`.
   - `shared/molecules/footer/` — extracts the action-buttons block + fineprint from `comparison-page.ts:62-96`. Has a `[showActions]` input (default true). Splash passes `false`. Adds `LanguageSelector` row.
   - Render `<app-footer />` at the end of `splash-page.ts` (no actions) and `comparison-page.ts` (actions).
   - Delete the inlined block from `comparison-page.ts`.
8. **Translate all UI strings (populate `en.ts` + `de.ts`)**:
   - Walk every component file under `src/app/`.
   - For each English literal in a template, replace with `{{ 'key.path' | transloco }}` (pipe form) or `{{ 'key.path' | transloco: {param: value} }}`.
   - For TS-side strings (conflict reasons in store, share dialog title, hero summary, recommendation), use `inject(TranslocoService).translate('key', {...})`. For reactive cases, use `transloco.selectTranslate('key', {...}, lang)` or thread `language()` into a `computed` that calls `translate(...)`.
   - Catalog structure (skeleton):
     - `splash.heroTitle`, `splash.heroSubtitle`, `splash.cta`
     - `nav.reset`, `nav.share`, `nav.viewOnGitHub`
     - `mode.lease`, `mode.finance`, `mode.cash`
     - `chart.legend.depreciation`, `chart.legend.financing`, `chart.legend.fuelEnergy`, `chart.legend.insurance`, `chart.legend.maintenance`, `chart.legend.opportunityCost`, `chart.legend.leaseEnd`, `chart.legend.cashOut`
     - `chart.title`, `chart.aria.summary` (uses `{count, plural, ...}` for months)
     - `lease.fields.*.label`, `lease.fields.*.tip`
     - `finance.fields.*.label`, `finance.fields.*.tip`
     - `cash.fields.*.label`, `cash.fields.*.tip`
     - `globals.*.label`, `globals.*.tip` (purchasePrice, vehicleAge, annualMileage, keepDuration, residualValue, etc.)
     - `globals.insurance.label = "{count, plural, one {Insurance / yr} other {Insurance / yr}}"` — DE: `Versicherung / Jahr`
     - `lease.rateLabel = "{region, select, US {Money factor} EU {Lease factor}}"`
     - `conflicts.<key>.label` and `conflicts.<key>.reason` (8 keys: leaseApr, residualValue, insurance, fuelEfficiency, fuelPrice, leaseEndChoice, earlyTerminationFee, leaseEndResidual)
     - `leaseEnd.choice.handBack`, `leaseEnd.choice.buyOut`
     - `maintenance.display.flatDuringLease`, `maintenance.display.resetsEachCycle`, `maintenance.display.range` (with year-N param)
     - `hero.assetCaption.afterYears` (ICU plural)
     - `share.dialog.title`, `share.dialog.copy`, `share.dialog.copied`
     - `share.url.tagline` (already pluralizes year/years)
     - `curveEditor.depreciation.title`, `curveEditor.maintenance.title`, common buttons (`reset`, `cancel`, `done`)
     - `regionSelector.aria.label`, `regionSelector.US.label`, `regionSelector.EU.label`
     - `languageSelector.aria.label`, `languageSelector.en`, `languageSelector.de`
     - `footer.fineprint` (long paragraph, DE rewritten in casual register)
     - `footer.disclaimer` (one-liner if added — currently the long fineprint is the only disclaimer)
     - `recommendation.reason` (ICU select on tab)
   - Populate `de.ts` for every key. **Important:** keep the keys identical between catalogs — type the catalog as `Record<string, string>` or stricter.
9. **Update test setup**:
   - Create `src/test-helpers/transloco-testing.ts` exporting a function that provides Transloco with the EN catalog and lang='en'.
   - Update each `*.spec.ts` that asserts on English text to use it.
   - `recommendation.spec.ts` no longer asserts on the sentence — only on the tab + structured data. Move the sentence-rendering test into `comparison-page.spec.ts` or wherever the rendering lives.
   - Run `npm test -- --watch=false --browsers=ChromeHeadless` and fix breakage.
10. **Update `CLAUDE.md`**:
    - Note the `Region` + `Language` axis split.
    - Note the Transloco engine, the eager-bundled catalogs at `src/i18n/`, and the MessageFormat plugin.
    - Add the localStorage carve-out for the language override.
    - Update file paths and architecture diagram.
    - Note the `Footer` component and its split between splash/comparison pages.
11. **Verify build + tests + dev server**:
    - `npm run build`
    - `npm test -- --watch=false --browsers=ChromeHeadless`
    - Ask user to spot-check `npm start` (dev server). Don't background-launch it (per CLAUDE.md).

## Files to touch (overview)

**Delete or rename**:
- `src/app/scenario/locale.config.ts` → `region.config.ts`
- `src/app/scenario/locale.config.spec.ts` → `region.config.spec.ts`
- `src/app/shared/molecules/locale-selector/` → `region-selector/`

**New**:
- `src/i18n/en.ts`, `src/i18n/de.ts`, `src/i18n/transloco-loader.ts`, `src/i18n/index.ts`
- `src/i18n/format.ts` (FormatContext type + bcp47 derivation + format helpers, OR keep them in region.config.ts)
- `src/app/shared/molecules/language-selector/language-selector.ts`
- `src/app/shared/molecules/footer/footer.ts`
- `src/test-helpers/transloco-testing.ts`

**Heavy edits**:
- `src/app/scenario/scenario.store.ts` — region rename + language signal + activeConflicts strings via translate.
- `src/app/scenario/scenario.types.ts` — Locale → Region, add Language.
- `src/app/scenario/scenario.serializer.ts` — read region (with legacy locale fallback).
- `src/app/scenario/scenario.defaults.ts` — region default.
- `src/app/scenario/calculations/recommendation.ts` — drop string building.
- `src/app/scenario/calculations/category.ts`, `financing.ts`, `tco-*.ts` — accept `region` param name.
- `src/app/app.config.ts` — provideTransloco + APP_INITIALIZER for language detection.
- `src/app/pages/splash-page/splash-page.ts` — translate all copy + add footer.
- `src/app/pages/comparison-page/comparison-page.ts` — translate strings + extract footer block.
- All `src/app/features/mode-detail-view/*-fields.ts` — translate labels + tips.
- All `src/app/shared/molecules/*` and `src/app/shared/atoms/*` that have hardcoded English.
- All `*.spec.ts` that assert on English text.
- `CLAUDE.md` — architecture update.

## Pitfalls / gotchas

- **CLAUDE.md says**: "The user runs the dev server themselves — don't background-launch `ng serve`." Builds + `ng test --watch=false` are fine.
- **Find files**: always exclude `node_modules` (per CLAUDE.md).
- **Don't introduce a per-component effect** for language. Transloco's signal-based API + the store's `language` signal handle reactivity. The store's existing autosave effect must NOT serialize language.
- **Backwards-compatible serializer**: existing `?s=` URLs in the wild encode `locale` (US/EU). The decoder must accept `locale` as a fallback when `region` is absent — otherwise old shared URLs lose their region setting. Encode going forward as `region`.
- **Stash maps in store** (`insuranceStash`, `fuelEffStash`, `fuelPriceStash`) currently key on `Locale` → must rename to `Region`. Functionality unchanged.
- **`recommendation.spec.ts`** currently asserts on the formatted sentence. After refactor it asserts on structured data — much simpler. Move sentence-rendering into a UI-layer test.
- **`scenario.store.spec.ts`** — heavy file, but its assertions are mostly on numeric outputs. Should mostly survive the rename + Region change.
- **Transloco's `signal()` API**: `translocoService.translate('key', params, lang?)` is the imperative form. For reactive components, prefer the `transloco` pipe in templates (`{{ 'key' | transloco }}`) — it auto-subscribes to language changes. For TS-side reactive strings, use `translocoService.selectTranslate(...)` returning an Observable, OR thread `store.language()` through a `computed` that calls `translate(key, params, store.language())`.
- **MessageFormat plugin** must be provided alongside Transloco for ICU `{count, plural, ...}` and `{region, select, ...}` to work. Without it, ICU strings render as raw template text.
- **Test helper**: existing specs use `TestBed.configureTestingModule({...})` widely. The Transloco testing harness needs to merge cleanly with existing setups — likely a `provideTranslocoTesting(catalog, lang)` function that returns an array of providers to spread into `providers`.
- **`'Leasingfaktor'` removal**: dropping `leaseRateLabel` from `REGION_CONFIG.EU` is fine because no one reads it after the rename — it moves to the catalog. Grep first to confirm. As of writing, only `lease-fields.ts` reads it.

## Resume-from-fresh-context cheat sheet

If a future Claude (or future-me) lands on this branch with no context:

1. Read this plan top to bottom.
2. `git log --oneline` to see what's done. Each major step lands as its own commit.
3. `TaskList` to see status of the 11 tracking tasks.
4. The decisions in this plan are LOCKED — don't re-grill them. If a decision turns out to be wrong, surface the trade-off to the user explicitly before changing course.
5. CLAUDE.md is the canonical project doc. The localStorage carve-out and the Region/Language model split must land there before the PR ships.
