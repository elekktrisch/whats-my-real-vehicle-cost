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

Phases 1–6 done. As of 2026-05-03:

- **Phases 1–5 done** — see ARCHITECTURE.md.
- **Phase 6 done:** All three tabs (Lease, Finance, Cash) wired to the store. Hero card extracted into a `tab-hero` molecule positioned at the top of `TabPage` with KPI bar + chart, switching content per active tab. Down payment is now per-tab (`leaseDownPayment`, `financeDownPayment`; cash uses `purchasePrice`). Loan tab math accounts for opportunity cost on the down payment (parity with lease/cash). Wizard now has a 7th question for investment style → opportunity-cost rate. Recommendation is now a real cost-per-distance comparison across all three tabs.
- **Phase 7 next:** Mobile chart variant + responsive layout polish.
- **Visible app:** `/` splash → `/wizard` (7 questions + live cost-per-distance recommendation) → `/lease | /finance | /cash`. All three tabs fully working with shareable URLs; per-tab down payments; lessor-table-style early termination.

## Architecture

Angular 20 standalone components, no NgModules. Layout under `src/app/`:

```
scenario/                    domain types, store, locale config, pure calc functions (+ specs)
shared/
  slider-control/            existing atom — signal-based, inline editable readout
  kpi-card/                  existing atom — signal-based
  info-badge/                existing atom — signal-based
  atoms/                     button, toggle, number-input, icon, label, divider
  molecules/                 tab-strip, header-bar, tab-hero, kpi-bar, vehicle-context-bar, running-costs-bar, lease-end-section, slider-group
features/
  lease-tab/                 lease-financing slider group + lease-end section
  finance-tab/               loan-financing slider group (APR, loan term, opportunity-cost rate)
  cash-tab/                  cash-purchase slider group (just opportunity-cost rate)
  chart/
    tco-chart-desktop/       stacked-area Chart.js renderer (mobile variant pending Phase 7)
pages/
  splash-page/               bold intro + "Get started" → /wizard, hasHydrated() skip seam
  wizard-page/               7 numbered questions + live cost-per-distance recommendation card
  tab-page/                  shell: header-bar + tab-hero + kpi-bar + tab-strip + chart + active-tab + vehicle-context-bar + running-costs-bar
app.ts                       <router-outlet/>
app.routes.ts                lazy-loaded routes: '', wizard, lease, finance, cash, ** → ''
```

`TabPage` lays out top-down as: hero (per-tab monthly numbers) → KPI bar (totals) → tab strip → chart → tab-specific sliders → global vehicle/running-cost sliders. Everything below the chart is "controls that adjust the results above."

### Scenario module — `src/app/scenario/`

Pure data + math + state, no Angular UI dependencies in the calc layer. Built to be unit-testable without TestBed.

- `scenario.types.ts` — domain types (Locale, Powertrain, Tab, ScenarioSnapshot, CostBreakdown, …). `LeaseInputs.leaseEndChoice` is `LeaseEndChoice | null` — null means auto-derive. `LeaseInputs` and `FinanceInputs` each carry their own `downPayment` (per-tab, defaults differ). Cash uses `purchasePrice` directly.
- `locale.config.ts` — US/EU defaults, units, formatters, `detectLocaleFromBrowser()`. Insurance baselines: 2% US / 1.5% EU.
- `scenario.defaults.ts` — `defaultScenario()` factory (leaseEndChoice defaults to null so auto-derive fires; lease.downPayment $5k/€4k; finance.downPayment $0). `LEASE_END_DEFAULTS` for fee fallbacks.
- `scenario.store.ts` — `ScenarioStore` (`providedIn: 'root'`). Holds writable signals for globals + per-tab inputs (`leaseDownPayment`, `financeDownPayment`); exposes `computed` derivations (msrp, vehicle category, insurance/maintenance defaults, three breakdowns, effective monthly, cost per distance, `recommendedTab` based on lowest cost-per-distance, `activeDownPayment` switching on `activeTab`). Uses the **two-signal override pattern** (`_xOverride: signal<T | null>` + `xDefault: computed<T>` + public `x: computed<T>` returning `override ?? default`) for sticky overrides that serialize cleanly. Two effects: (1) debounced autosave to localStorage + URL queryParams, (2) cross-field clamping (down payments and residual ≤ purchase price).
- `scenario.serializer.ts` — `toQueryParams` / `fromQueryParams` (URL: short keys, skips null overrides, leaves activeTab to the route path), `toLocalStorage` / `fromLocalStorage` (full JSON), `tabFromPath`, `hasAnyParams`. Storage key is `whatsmycost.v1`. URL keys for per-tab down payments: `leaseDown`, `finDown`.
- `calculations/` — pure functions, one file per concern: `depreciation`, `msrp`, `category` (luxury × 1.3 insurance / × 1.8 maintenance), `financing` (lease + amortized loan), `opportunity`, `fuel`, `recommendation` (now: pick tab with lowest cost-per-distance, with locale-aware reason text), `tco` (the aggregator). Co-located `*.spec.ts` files.

### Lease TCO model

Two modes, auto-derived from keep-duration vs. lease term, user-overrideable:

- **Renew lease (rolling lease, internal value `'handBack'`):** lease payments accrue across the full keep duration. Each cycle pays a fresh down payment (amortized across that cycle's actual length, may be partial for the final cycle — that's modeled as the user signing a shorter last lease). Handback fees fire at every cycle boundary AND once at month=keep if it lands mid-cycle. Opportunity cost grows on cumulative down payments, so the financing line steepens at each cycle boundary.
- **Buy out:** lease payments accrue for the lease term only; at month=term we charge `residualValue + buyoutFee` as a one-time step in the leaseEnd layer, then continue depreciation for the owned-car portion of keep without any further financing.

Auto-selection: keep ≤ term → renew lease, keep > term → buyout. The user can flip the toggle either way; both modes work for any keep duration.

**Early termination penalty** fires when `keep < term` (single partial cycle = user signed a longer lease than they're keeping). Applies to BOTH modes. Default value is depreciation-based (`(term−keep)/term × (price − residual)`) approximating typical lessor early-exit tables; user can override with the actual figure from their contract. Capped at 90% of the financed portion. The slider lives in `lease-end-section`, hidden/disabled when `keep ≥ term`. Multi-cycle final partial cycles do NOT trigger it (the model assumes a shorter last lease, no penalty).

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