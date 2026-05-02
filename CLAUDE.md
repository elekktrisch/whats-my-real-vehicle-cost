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

- **Phases 1–3 done:** scenario module + 46 specs, signal-based atoms (existing migrated + 6 new), and the new TabPage shell with a store-wired LeaseTab and stacked-area TCO chart.
- **Phase 4 next:** Splash + Wizard + routing. Phase 4 also unlocks the deferred `header-bar` molecule (edit-answers needs the wizard route).
- **Visible app:** the new TabPage shell. Lease tab fully working; Finance and Cash are placeholder components that ship in Phase 6.

## Architecture

Angular 20 standalone components, no NgModules. Layout under `src/app/`:

```
scenario/                    domain types, store, locale config, pure calc functions (+ specs)
shared/
  slider-control/            existing atom — signal-based, inline editable readout
  kpi-card/                  existing atom — signal-based
  info-badge/                existing atom — signal-based
  atoms/                     new atoms: button, toggle, number-input, icon, label, divider
  molecules/                 tab-strip, vehicle-context-bar, kpi-bar, lease-end-section, slider-group
features/
  lease-tab/                 wired to ScenarioStore: hero monthly-payment card + financing/TCO slider groups + lease-end section
  finance-tab/               placeholder until Phase 6
  cash-tab/                  placeholder until Phase 6
  chart/
    tco-chart-desktop/       stacked-area Chart.js renderer (mobile variant pending Phase 7)
pages/
  tab-page/                  shell: header + vehicle-context-bar + tab-strip + kpi-bar + active-tab + chart
app.ts                       7-line shell that renders <app-tab-page/> (becomes <router-outlet/> in Phase 4)
```

### Scenario module — `src/app/scenario/`

Pure data + math + state, no Angular UI dependencies in the calc layer. Built to be unit-testable without TestBed.

- `scenario.types.ts` — domain types (Locale, Powertrain, Tab, ScenarioSnapshot, CostBreakdown, …).
- `locale.config.ts` — US/EU defaults, units, formatters, `detectLocaleFromBrowser()`.
- `scenario.defaults.ts` — `defaultScenario()` factory; lease-end fallback constants.
- `scenario.store.ts` — `ScenarioStore` (`providedIn: 'root'`). Holds writable signals for globals + per-tab inputs; exposes `computed` derivations (msrp, vehicle category, insurance/maintenance defaults, lease/finance/cash breakdowns, effective monthly, cost per distance). Uses the **two-signal override pattern** (`_xOverride: signal<T | null>` + `xDefault: computed<T>` + public `x: computed<T>` returning `override ?? default`) for sticky overrides that serialize cleanly. `applySnapshot()` and `snapshot()` are the hydration / serialization seams; `isHydrating` guards downstream effects (Phase 5).
- `calculations/` — pure functions, one file per concern: `depreciation`, `msrp`, `category`, `financing` (lease + amortized loan), `opportunity`, `fuel`, `recommendation`, `tco` (the aggregator). Co-located `*.spec.ts` files.

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

## Conventions

- **Signals everywhere.** Readable signals on the store, `computed` derivations, no manual change detection. Side effects (persistence, URL sync) will be `effect()`s in Phase 5 — don't add them earlier.
- **Atoms are dumb.** No business logic, no internal state beyond view-only derivations (focus tracking, percentage display). All I/O via `input()` / `output()` / `model()`.
- **Pure calc functions take plain objects, not signals.** Signals call them via `computed()`.
- **Tailwind utility classes inline**, using existing color/font tokens (`bg-surface`, `text-tx`, `font-mono`, etc.) defined in `src/styles.css`.
- **Prettier**: 100-char lines, single quotes. `npx prettier --write .` to format.
- Find files? **Always exclude `node_modules`** — the directory is large enough to freeze searches.

## Open inconsistencies

- USE_CASES.md UC2 narrates ~€25k back-derived MSRP for a 4-yr-old €15k Golf, but the canonical PRODUCT.md depreciation curve produces ~€30.5k. Tests follow PRODUCT.md.