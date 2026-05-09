# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start       # dev server at http://localhost:4200
npm run build   # production build (output: dist/car-leasing-chart/browser/)
npm run watch   # build in watch mode
npm test -- --watch=false --browsers=ChromeHeadless  # CI-style one-shot run
```

The user runs the dev server themselves — don't background-launch `ng serve`. Builds and `ng test --watch=false` are fine to run.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. Pushes to `master` build, run the test suite, then deploy to <https://elekktrisch.github.io/whats-my-real-vehicle-cost/> via `actions/deploy-pages` (no `gh-pages` branch — uses the modern Pages-from-Actions flow).

The workflow builds with `--base-href=/whats-my-real-vehicle-cost/` so asset URLs resolve correctly under the project subpath, and copies `index.html` → `404.html` so SPA deep links (e.g. `/lease`) survive a hard reload (GitHub Pages serves `404.html` for any unknown path; Angular's router then takes over).

One-time setup on the repo: **Settings → Pages → Source: GitHub Actions** must be enabled. Manual runs via Actions tab → "Deploy to GitHub Pages" → Run workflow.

## Status

`git log` is authoritative for what shipped.

**Visible app today:** single `/` route — splash on cold start, comparison page once the user engages or arrives via a `?s=` URL. All three financing modes (lease, finance, cash) are visible at once via a sticky comparison strip; the focused mode's chart and sliders sit below.

## Architecture

Angular 21 standalone components, no NgModules. Layout under `src/app/`:

```
scenario/                    domain types, store, locale config, pure calc functions (+ specs)
shared/
  slider-control/            atom — labeled range slider + inline editable readout
  kpi-card/                  atom — minimal display
  info-badge/                atom — tooltip-on-hover/focus button
  atoms/                     button, toggle, number-input, icon, label, divider
  molecules/                 comparison-strip, mode-card, hero-summary, locale-selector, powertrain-selector,
                             global-controls, your-situation, lease-end-section, maintenance-display,
                             disclosure, slider-group
features/
  mode-detail-view/          shell: chart + active-mode fields + global-controls + your-situation
                             plus per-mode field components (lease-fields, finance-fields, cash-fields)
  chart/
    tco-chart/               stacked-area Chart.js renderer (responsive options across breakpoints,
                             no separate mobile component)
pages/
  splash-page/               cold-start intro card; "Get started" engages → comparison page
  comparison-page/           sticky stack (page-header + comparison-strip + hero-summary) → mode-detail-view
  app-shell/                 single `/` landing — splash vs comparison-page based on hasReturningState()
app.ts                       <router-outlet/>
app.routes.ts                single `/` route → AppShell, ** → ''
```

`ComparisonPage` lays out top-down as: sticky stack (top row + comparison strip + hero summary) → chart → mode-specific sliders → global vehicle / your-situation sliders. The strip is the tab control: clicking a card focuses that mode below.

### Scenario module — `src/app/scenario/`

Pure data + math + state, no Angular UI dependencies in the calc layer. Built to be unit-testable without TestBed.

- `scenario.types.ts` — domain types (Locale, Powertrain, Tab, ScenarioSnapshot, CostBreakdown, …). `LeaseInputs.leaseEndChoice` is `LeaseEndChoice | null` — null means auto-derive. `LeaseInputs` and `FinanceInputs` each carry their own `downPayment` (per-tab, defaults differ). Cash uses `purchasePrice` directly.
- `locale.config.ts` — US/EU defaults, units, formatters, `detectLocaleFromBrowser()`. Insurance baselines: 2% US / 1.5% EU.
- `scenario.defaults.ts` — `defaultScenario()` factory (leaseEndChoice defaults to null so auto-derive fires; lease.downPayment $5k/€4k; finance.downPayment $0). `LEASE_END_DEFAULTS` for fee fallbacks.
- `scenario.store.ts` — `ScenarioStore` (`providedIn: 'root'`). Holds writable signals for globals + per-tab inputs (`leaseDownPayment`, `financeDownPayment`); exposes `computed` derivations (msrp, vehicle category, insurance/maintenance defaults, three breakdowns, effective monthly, cost per distance, `recommendedTab` based on lowest cost-per-distance, `activeDownPayment` switching on `activeTab`). Uses the **two-signal override pattern** (`_xOverride: signal<T | null>` + `xDefault: computed<T>` + public `x: computed<T>` returning `override ?? default`) for sticky overrides that serialize cleanly. Two effects: (1) URL autosave (`?s=<encoded-json>`), (2) cross-field clamping (down payments and residual ≤ purchase price).
- `scenario.serializer.ts` — `encodeSnapshot` / `decodeSnapshot` for the autosaved `?s=<encoded-json>` form. URL is the only persistence channel; no localStorage. The share dialog wraps the long URL via `shortener.ts` (is.gd) for compact sharing.
- `calculations/` — pure functions, one file per concern: `depreciation`, `msrp`, `category` (luxury × 1.3 insurance / × 1.8 maintenance), `financing` (lease + amortized loan), `opportunity`, `fuel`, `recommendation` (now: pick tab with lowest cost-per-distance, with locale-aware reason text), `tco` (the aggregator). Co-located `*.spec.ts` files.

### Depreciation curve

`calculations/depreciation.ts` is the single source of truth for vehicle resale-value modeling. The curve is a 5-anchor monotonic spline:

- `ANCHOR_AGES = [0, 2, 4, 7, 12]` — fixed x positions in years.
- `DEFAULT_CURVES.{ICE, EV}` — per-powertrain defaults (EV is ~10–15pp lower mid-curve to capture battery-anxiety depreciation in years 2–7).
- `DepreciationCurve { samples: 5-tuple of {age, factor} }` — domain type lives in `scenario.types.ts`. Storage is **MSRP-normalized**: `samples[0].factor === 1.0` is an invariant.
- `depreciationFactor(age, curve?)` interpolates with Fritsch–Carlson PCHIP between anchors and decays exponentially at 10%/yr past `age 12` (so resale never reaches zero). Default curve is ICE for backward compat.
- `makeCurve(factors)` builds a curve from a 5-element y-array; `factorsOf(curve)` extracts it back. `clampFactorAt(factors, i, raw)` enforces monotonicity bounds (Y0 locked at 1.0; interior bounded by neighbors).

The store wires this through three places: `msrp` (back-derived for used cars via `backDeriveMsrp(price, age, curve)`), `residualValueDefault` (end of keep), and `leaseEndResidualDefault` (end of lease term). All three use `store.depreciationCurve()` which resolves `depreciationCurveOverride() ?? defaultCurveForPowertrain(powertrain())`. **Toggling powertrain leaves any user override in place** — the override is a single global slot, no per-powertrain stash.

`shared/molecules/depreciation-curve-editor/` is the user-facing editor — modal with a Chart.js preview (drag the 5 anchors via `chartjs-plugin-dragdata`) plus 5 numeric inputs for keyboard a11y, a chain display showing live MSRP / residuals, and a reset-to-default button. The trigger lives next to every curve-driven slider (`residualValue` in `global-controls.ts`, `leaseEndResidual` in `lease-end-section.ts`); a small accent dot on the trigger flags an active override.

**Display-only normalization.** Internally the curve is MSRP-normalized (Y0 stored = 1.0). The editor *displays* every factor relative to `factor(vehicleAge)`, so the locked reference reads "100% at today's price" and MSRP appears as a value > 1.0 for used cars. On commit, displayed values are multiplied back by `factor(vehicleAge)` to land in stored space — `commitFactor` is the single conversion path used by both keyboard input and drag. The chart shows a dashed cross at `(vehicleAge, 1.0)` as a visual anchor.

### Maintenance curve

`calculations/maintenance.ts` is the single source of truth for vehicle maintenance modeling. Same 5-anchor PCHIP machinery as the depreciation curve, with two key differences:

- `MAINTENANCE_ANCHOR_AGES = [0, 3, 6, 10, 15]` — back-loaded (vs. depreciation's front-loaded `[0, 2, 4, 7, 12]`) because maintenance climbs in late life rather than early.
- `DEFAULT_MAINTENANCE_CURVES.{ICE, EV}` — per-powertrain defaults seeded from the legacy linear `(1 + k_mid·age) × baseRate` formula at the anchors, so day-1 output for default scenarios matches the prior model. ICE: `[1.50%, 1.86%, 2.22%, 2.70%, 3.30%]` of MSRP/yr; EV: `[0.70%, 0.80%, 0.90%, 1.04%, 1.20%]`.
- `MaintenanceCurve` storage is **% of MSRP per year** — Y0 is *not* locked (no natural anchor like MSRP=1.0; user may know their year-0 cost).
- `maintenanceFactor(age, curve)` returns the unitless factor. PCHIP between anchors; past year 15, **linear extrapolation** at `TAIL_SLOPE_MULTIPLIER × lastSegmentSlope` (default 3×) — so the tail bends visibly upward without exploding.
- `MAX_FACTOR = 0.10` — hard cap on the last anchor (10% of MSRP/yr), enforced by `clampMaintenanceFactorAt`.
- `clampMaintenanceFactorAt` is direction-flipped from depreciation: monotonic-*increasing*, with first-anchor lower bound of 0 (no negative maintenance) and last-anchor upper bound of `MAX_FACTOR`.
- `maintenanceAt(ctx, age, agingScale=1)` is the formula: `msrp × curve(age) × catMult × mileageFactor`. The optional `agingScale` (default 1) scales **only the growth above year-0**. The lease-warranty branch in `tco-lease` passes `0.5` — consumables (tires, brakes, fluids) age at half rate while the lessor handles powertrain repairs under warranty.

`shared/molecules/maintenance-curve-editor/` mirrors the depreciation editor: modal with a Chart.js preview (drag 5 anchors via `chartjs-plugin-dragdata`), 5 numeric inputs (% values for keyboard a11y), chain display showing live year-1 / year-N currency, and a reset button. The trigger lives next to `MaintenanceDisplay` in `global-controls.ts`; an accent dot flags an active override. **Toggling powertrain leaves any override in place** — single global slot, no per-powertrain stash.

**Display-only normalization** (different from depreciation's). Storage is % of MSRP; the chart Y-axis labels in **currency** (multiply by `msrp × catMult × mileageFactor`); numeric inputs show **percent** (`factor × 100`). On drag commit, divide the chart's currency value back by the same product to land in stored % space — `commitFactor` is the single conversion path.

**Behavior changes vs. the prior linear model** (deliberate, documented for future-Claude not to mistake for bugs):

1. **Year-0 maintenance now scales with `mileageFactor`.** The legacy formula `(1 + k × mileageFactor × age) × base` left year-0 mileage-independent; the new formula `msrp × curve(age) × catMult × mileageFactor` doesn't. Heavy drivers do incur day-1 wear (tires, brakes, fluids), so this is arguably more correct. Magnitude is small (~$50/yr at 25k mi/yr).
2. **Loss of luxury-ages-faster compounding.** The legacy model had category-specific `k` values (luxury 0.12 vs. economy 0.05), so luxury-vs-economy maintenance ratio compounded from 1.8× (year 0) to ~4.3× (year 10). Under the curve model, `categoryMult` only scales the *level* (1.8× flat across ages). Defensible for the 5–10 year keeps this app targets; user can override the curve to recreate the steeper luxury slope if needed.

### Lease TCO model

Two modes, auto-derived from keep-duration vs. lease term, user-overrideable:

- **Renew lease (rolling lease, internal value `'handBack'`):** lease payments accrue across the full keep duration. Each cycle pays a fresh down payment (amortized across that cycle's actual length, may be partial for the final cycle — that's modeled as the user signing a shorter last lease). Handback fees fire at every cycle boundary AND once at month=keep if it lands mid-cycle. Opportunity cost grows on cumulative down payments, so the financing line steepens at each cycle boundary.
- **Buy out:** lease payments accrue for the lease term only; at month=term we charge `residualValue + buyoutFee` as a one-time step in the leaseEnd layer, then continue depreciation for the owned-car portion of keep without any further financing.

Auto-selection: keep ≤ term → renew lease, keep > term → buyout. The user can flip the toggle either way; both modes work for any keep duration.

**Early termination penalty** fires when `keep < term` (single partial cycle = user signed a longer lease than they're keeping). Applies to BOTH modes. Default value is depreciation-based (`(term−keep)/term × (price − residual)`) approximating typical lessor early-exit tables; user can override with the actual figure from their contract. Capped at 90% of the financed portion. The slider lives in `lease-end-section`, hidden/disabled when `keep ≥ term`. Multi-cycle final partial cycles do NOT trigger it (the model assumes a shorter last lease, no penalty).

### Atoms — `src/app/shared/`

All migrated to Angular 21 signal I/O (`input()`, `input.required()`, `model()`, no decorators, no `EventEmitter`).

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
  [value]="store.insurance()"
  (valueChange)="store.setOverride('insurance', $event)"
/>
```

This avoids accidentally exposing raw store internals to the template, and works the same way for direct writable signals and override-pattern setters.

### Routing

Single `/` route → `AppShell`, which renders `SplashPage` on cold start and `ComparisonPage` once the user engages or `hasReturningState()` is true (URL has `?s=` / `?c=` state). `**` redirects to `/`. No tab routes — mode switching is store-driven (`store.activeTab`) and reflected in the comparison strip, not the URL.

## Conventions

- **Signals everywhere.** Readable signals on the store, `computed` derivations, no manual change detection. The single autosave `effect` in `ScenarioStore` covers persistence + URL sync — don't add component-level effects for either; let the store own that boundary.
- **Atoms are dumb.** No business logic, no internal state beyond view-only derivations (focus tracking, percentage display). All I/O via `input()` / `output()` / `model()`.
- **Pure calc functions take plain objects, not signals.** Signals call them via `computed()`.
- **Tailwind utility classes inline**, using existing color/font tokens (`bg-surface`, `text-tx`, `font-mono`, etc.) defined in `src/styles.css`.
- **Prettier**: 100-char lines, single quotes. `npx prettier --write .` to format.
- Find files? **Always exclude `node_modules`** — the directory is large enough to freeze searches.