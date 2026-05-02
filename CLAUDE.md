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

- **Phases 1 + 2 done:** scenario module (types, locale config, defaults, store, pure calculations + 46 specs) and signal-based atom migration + six new atoms.
- **Phase 3 next:** new TabPage shell, LeaseTab refactor onto the store, stacked-area TCO chart. First phase that visibly changes the UI.
- **Visible app is still the legacy LeaseTab.** The new scenario/ code and new atoms are not rendered anywhere yet.

## Architecture

Angular 20 standalone components, no NgModules. Two coexisting layers right now:

### New (target) layer — `src/app/scenario/`

Pure data + math + state, no Angular UI dependencies in the calc layer. Built to be unit-testable without TestBed.

- `scenario.types.ts` — domain types (Locale, Powertrain, Tab, ScenarioSnapshot, CostBreakdown, …).
- `locale.config.ts` — US/EU defaults, units, formatters, `detectLocaleFromBrowser()`.
- `scenario.defaults.ts` — `defaultScenario()` factory; lease-end fallback constants.
- `scenario.store.ts` — `ScenarioStore` (`providedIn: 'root'`). Holds writable signals for globals + per-tab inputs; exposes `computed` derivations (msrp, vehicle category, insurance/maintenance defaults, lease/finance/cash breakdowns, effective monthly, cost per distance). Uses the **two-signal override pattern** (`_xOverride: signal<T | null>` + `xDefault: computed<T>` + public `x: computed<T>` returning `override ?? default`) for sticky overrides that serialize cleanly. `applySnapshot()` and `snapshot()` are the hydration / serialization seams; `isHydrating` guards downstream effects (Phase 5).
- `calculations/` — pure functions, one file per concern: `depreciation`, `msrp`, `category`, `financing` (lease + amortized loan), `opportunity`, `fuel`, `recommendation`, `tco` (the aggregator). Co-located `*.spec.ts` files.

### Legacy (still rendered) layer — `src/app/`

- `app.ts` / `app.html` — root component: tab buttons + Lease/Financing/Cash branches. Financing and Cash are the original "Coming soon" placeholders.
- `lease-tab/` — the only working tab. Holds its own state (capitalizedCosts, downPayment, residualPrice, apr, months) and a Chart.js line chart of "Lease Debt vs Vehicle Value". This component will be refactored into `features/lease-tab/` and rewired onto `ScenarioStore` in Phase 3; the line chart is replaced by a stacked-area TCO chart.

### Atoms — `src/app/shared/`

All migrated to Angular 20 signal I/O (`input()`, `input.required()`, `model()`, no decorators, no `EventEmitter`).

- `shared/slider-control/` — labeled range slider + inline editable number readout (prefix/suffix/fractionDigits, clamps on blur). Replaced the older static-readout + duplicate quick-input grid.
- `shared/kpi-card/`, `shared/info-badge/` — minimal display atoms.
- `shared/atoms/` — new atoms not yet rendered: `button` (primary/secondary/ghost × sm/md/lg), `toggle` (segmented two-option, `model()`-based), `number-input` (formatted editable input), `icon` (name-based registry), `label`, `divider`.

The split between `shared/<atom>/` and `shared/atoms/<atom>/` follows ARCHITECTURE.md's migration map ("Same path" for the original three; new atoms under `atoms/`). Don't move the originals into `atoms/` without a corresponding spec update.

## Conventions

- **Signals everywhere.** Readable signals on the store, `computed` derivations, no manual change detection. Side effects (persistence, URL sync) will be `effect()`s in Phase 5 — don't add them earlier.
- **Atoms are dumb.** No business logic, no internal state beyond view-only derivations (focus tracking, percentage display). All I/O via `input()` / `output()` / `model()`.
- **Pure calc functions take plain objects, not signals.** Signals call them via `computed()`.
- **Tailwind utility classes inline**, using existing color/font tokens (`bg-surface`, `text-tx`, `font-mono`, etc.) defined in `src/styles.css`.
- **Prettier**: 100-char lines, single quotes. `npx prettier --write .` to format.
- Find files? **Always exclude `node_modules`** — the directory is large enough to freeze searches.

## Open inconsistencies

- USE_CASES.md UC2 narrates ~€25k back-derived MSRP for a 4-yr-old €15k Golf, but the canonical PRODUCT.md depreciation curve produces ~€30.5k. Tests follow PRODUCT.md.