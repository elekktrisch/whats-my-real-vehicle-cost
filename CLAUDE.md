# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start       # dev server at http://localhost:4200
npm run build   # production build
npm run watch   # build in watch mode
npm test        # unit tests via Karma/Jasmine
```

The user runs the dev server themselves — don't background-launch `ng serve`. Builds and `ng test --watch=false` are fine to run.

## Status

Mid-rebuild from a single-component lease calculator into the full TCO app described in [PRODUCT.md](./PRODUCT.md). See [ARCHITECTURE.md](./ARCHITECTURE.md#progress-last-updated-2026-05-02) for the canonical progress block. As of 2026-05-02:

- **Phases 1–5 done:** scenario module + 61 specs, signal-based atoms (existing migrated + 6 new), the TabPage shell with a store-wired LeaseTab + stacked-area TCO chart + global running-costs-bar, lazy-loaded routing with Splash + Wizard entry-flow, persistence + URL sync via a single debounced autosave `effect`, APP_INITIALIZER hydration from URL → localStorage → defaults.
- **Phase 6 next:** Finance + Cash tab features (each tab has its own financing math but shares all running-cost inputs).
- **Visible app:** `/` splash → `/wizard` (six questions + live recommendation) → `/lease | /finance | /cash`. Lease tab fully working with shareable URLs; Finance and Cash are placeholder components that ship in Phase 6.

## Architecture

Angular 20 standalone components, no NgModules. Layout under `src/app/`:

```
scenario/                    domain types, store, locale config, pure calc functions (+ specs)
shared/
  slider-control/            existing atom — signal-based, inline editable readout
  kpi-card/                  existing atom — signal-based
  info-badge/                existing atom — signal-based
  atoms/                     new atoms: button, toggle, number-input, icon, label, divider
  molecules/                 tab-strip, vehicle-context-bar, kpi-bar, lease-end-section, slider-group, header-bar
features/
  lease-tab/                 wired to ScenarioStore: hero monthly-payment card + financing/TCO slider groups + lease-end section
  finance-tab/               placeholder until Phase 6
  cash-tab/                  placeholder until Phase 6
  chart/
    tco-chart-desktop/       stacked-area Chart.js renderer (mobile variant pending Phase 7)
pages/
  splash-page/               bold intro + "Get started" → /wizard, hasHydrated() skip seam (active in Phase 5)
  wizard-page/               6 numbered questions + live recommendation card
  tab-page/                  shell: header-bar + vehicle-context-bar + tab-strip + kpi-bar + active-tab + chart
app.ts                       <router-outlet/>
app.routes.ts                lazy-loaded routes: '', wizard, lease, finance, cash, ** → ''
```

### Scenario module — `src/app/scenario/`

Pure data + math + state, no Angular UI dependencies in the calc layer. Built to be unit-testable without TestBed.

- `scenario.types.ts` — domain types (Locale, Powertrain, Tab, ScenarioSnapshot, CostBreakdown, …). `LeaseInputs.leaseEndChoice` is `LeaseEndChoice | null` — null means auto-derive from keep-duration vs. lease term.
- `locale.config.ts` — US/EU defaults, units, formatters, `detectLocaleFromBrowser()`. Insurance baselines: 2% US / 1.5% EU.
- `scenario.defaults.ts` — `defaultScenario()` factory (leaseEndChoice defaults to null so auto-derive fires); lease-end fallback constants.
- `scenario.store.ts` — `ScenarioStore` (`providedIn: 'root'`). Holds writable signals for globals + per-tab inputs; exposes `computed` derivations (msrp, vehicle category, insurance/maintenance defaults, lease/finance/cash breakdowns, effective monthly, cost per distance). Uses the **two-signal override pattern** (`_xOverride: signal<T | null>` + `xDefault: computed<T>` + public `x: computed<T>` returning `override ?? default`) for sticky overrides that serialize cleanly. `applySnapshot()` and `snapshot()` are the hydration / serialization seams. Single autosave `effect` reads the snapshot, gates on `isHydrating()` and `hasHydrated()`, debounces 200ms, then writes to localStorage AND URL queryParams (via `Location.replaceState` of a parsed router tree — no navigation event fires).
- `scenario.serializer.ts` — `toQueryParams` / `fromQueryParams` (URL: short keys, skips null overrides, leaves activeTab to the route path), `toLocalStorage` / `fromLocalStorage` (full JSON), `tabFromPath`, `hasAnyParams`. Storage key is `whatsmycost.v1`.
- `calculations/` — pure functions, one file per concern: `depreciation`, `msrp`, `category` (luxury × 1.3 insurance / × 1.8 maintenance), `financing` (lease + amortized loan), `opportunity`, `fuel`, `recommendation`, `tco` (the aggregator). Co-located `*.spec.ts` files.

### Lease TCO model

Two modes, auto-derived from keep-duration vs. lease term, user-overrideable:

- **Hand back (rolling lease):** lease payments accrue across the full keep duration. Handback fees fire at every cycle boundary (m % term === 0) and once more at month=keep if it lands mid-cycle. Down payment is charged once on the first cycle (amortized across `min(term, keep)` months). Insurance/fuel/maintenance accrue throughout because the user always has a (rolling) car.
- **Buy out:** lease payments accrue for the lease term only; at month=term we charge `residualValue + buyoutFee` as a one-time step in the leaseEnd layer, then continue depreciation for the owned-car portion of keep without any further financing.

Auto-selection: keep ≤ term → handback, keep > term → buyout. The user can flip the toggle either way; both modes work for any keep duration.

### Atoms — `src/app/shared/`

All migrated to Angular 20 signal I/O (`input()`, `input.required()`, `model()`, no decorators, no `EventEmitter`).

- `shared/slider-control/` — labeled range slider + inline editable number readout (prefix/suffix/fractionDigits, clamps on blur).
- `shared/kpi-card/`, `shared/info-badge/` — minimal display atoms.
- `shared/atoms/` — `button` (primary/secondary/ghost × sm/md/lg), `toggle` (segmented two-option, `model()`-based), `number-input` (formatted editable input), `icon` (name-based registry), `label`, `divider`.

The split between `shared/<atom>/` and `shared/atoms/<atom>/` follows ARCHITECTURE.md's migration map ("Same path" for the original three; new atoms under `atoms/`). Don't move the originals into `atoms/` without a corresponding spec update.

### Binding store signals to atoms

Atoms expose writable two-way slots via `model()`. The store exposes both writable signals (e.g. `store.leaseApr`) and read-only computed values (e.g. `store.insurance('lease')`). To keep the boundary clean, components bind via the explicit `[value] / (valueChange)` form rather than `[(value)]`:

```html
<app-slider-control
  [value]="store.leaseApr()"
  (valueChange)="store.leaseApr.set($event)"
/>

<app-slider-control
  [value]="store.insurance('lease')()"
  (valueChange)="store.setOverride('lease', 'insurance', $event)"
/>
```

This avoids accidentally exposing raw store internals to the template, and works the same way for direct writable signals and override-pattern setters.

### Routing

Five lazy-loaded routes in `app.routes.ts`:

- `/` → `SplashPage` (intro card)
- `/wizard` → `WizardPage` (six questions + live recommendation)
- `/lease | /finance | /cash` → `TabPage` with `data: { tab }`

`TabPage` reads `route.data` via `toSignal` and pushes the tab to `store.activeTab` in an `effect`. Tab clicks call `router.navigate(['/', tab])`, which re-fires the data subscription. Single source of truth = the route.

## Conventions

- **Signals everywhere.** Readable signals on the store, `computed` derivations, no manual change detection. The single autosave `effect` in `ScenarioStore` covers persistence + URL sync — don't add component-level effects for either; let the store own that boundary.
- **Atoms are dumb.** No business logic, no internal state beyond view-only derivations (focus tracking, percentage display). All I/O via `input()` / `output()` / `model()`.
- **Pure calc functions take plain objects, not signals.** Signals call them via `computed()`.
- **Tailwind utility classes inline**, using existing color/font tokens (`bg-surface`, `text-tx`, `font-mono`, etc.) defined in `src/styles.css`.
- **Prettier**: 100-char lines, single quotes. `npx prettier --write .` to format.
- Find files? **Always exclude `node_modules`** — the directory is large enough to freeze searches.

## Open inconsistencies

- USE_CASES.md UC2 narrates ~€25k back-derived MSRP and €600/yr insurance for a 4-yr-old €15k Golf, but the current PRODUCT.md curve + insurance formula produce ~€30.5k MSRP (Mid category, not Economy) and ~€260/yr insurance. The narrative is annotated; tests follow the canonical math.