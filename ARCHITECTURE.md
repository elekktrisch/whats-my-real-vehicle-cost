# Architecture

How [PRODUCT.md](./PRODUCT.md) and [USE_CASES.md](./USE_CASES.md) get built. Angular 20.1, standalone components, signals everywhere, no NgModules.

## Progress (last updated 2026-05-02)

Phases 1–3 are landed. The running app is now the new TabPage shell wired to `ScenarioStore`, with a working Lease tab and a stacked-area TCO chart. Finance and Cash are placeholders until Phase 6.

- **Phase 1 — Foundation: ✅ done.** `src/app/scenario/` holds `scenario.types.ts`, `locale.config.ts`, `scenario.defaults.ts`, `scenario.store.ts`, and `calculations/` (depreciation, msrp, category, financing, opportunity, fuel, tco, recommendation). 46 unit specs cover the calculations.
- **Phase 2 — Atoms: ✅ done.** Existing atoms (`slider-control`, `kpi-card`, `info-badge`) migrated to signal-based `input()` / `model()` I/O at their original paths under `shared/`. Six new atoms added under `shared/atoms/`: `button`, `toggle`, `number-input`, `icon`, `label`, `divider`. The slider's readout was replaced with an inline editable value (prefix / suffix / fractionDigits).
- **Phase 3 — TabPage shell + LeaseTab refactor + TCO chart: ✅ done.** Five molecules added under `shared/molecules/`: `tab-strip`, `vehicle-context-bar`, `kpi-bar`, `lease-end-section`, `slider-group` (header-bar deferred to Phase 4 since it carries edit-answers / wizard hooks). `features/chart/tco-chart-desktop/` renders the 6-layer stacked-area Chart.js view. `features/lease-tab/` is the new store-wired lease tab (financing inputs + TCO inputs section using the override pattern + lease-end section). `features/finance-tab/` and `features/cash-tab/` exist as "Coming in phase 6" placeholders. `pages/tab-page/` assembles the shell. Legacy `lease-tab/` and `app.html` are removed; `app.ts` is now a 7-line shell that renders `<app-tab-page/>`.
- **Phases 4–8: ⏳ pending.** Phase 4 (Splash + Wizard + routing) is next. Routing also unlocks the deferred `header-bar` molecule (edit-answers needs the wizard route).
- **Doc note:** USE_CASES.md UC2 quotes a back-derived MSRP of ~€25k for a 4-yr-old €15k Golf, but the PRODUCT.md curve (20% yr1 + 15%/yr yr2-5) actually produces ~€30.5k. PRODUCT.md is canonical; UC2's narrative number is the one that drifts.

## Guiding principles

1. **Signals are the source of truth.** All state lives in writable signals on a single store service. All derivations are `computed()`. Side effects (persistence, URL sync) are `effect()`s. Components are thin views over signals.
2. **Override-aware defaults.** TCO inputs (insurance, maintenance, fuel) need to *derive from* globals (price, age, powertrain, locale) AND be user-overrideable. Pattern: one `signal<T | null>` for the override, one `computed<T>` for the derived default, one public `computed<T>` returning `override ?? default`. Cleaner than `linkedSignal` for this case because (a) the override semantics are sticky and (b) only the override needs to be serialized to URL/localStorage.
3. **URL is the configuration.** The query string holds the full scenario. localStorage just remembers the last URL. Sharing = copy/paste.
4. **Atoms are dumb.** No business logic, no internal state, all I/O via `input()`/`output()`/`model()`. Existing `SliderControl`, `KpiCard`, `InfoBadge` are the model — extend with the same shape.
5. **Build types and pure functions before signals.** The math (MSRP back-derivation, TCO calculation, depreciation curve) is pure functions in a separate module, unit-tested without Angular. Signals just call them.

## State architecture

### Store: `ScenarioStore` (`providedIn: 'root'`)

A single service holding all signals. Components inject and read; only the store mutates.

```
ScenarioStore (signals)
├── Globals
│   ├── locale: signal<'US' | 'EU'>
│   ├── powertrain: signal<'ICE' | 'EV'>
│   ├── purchasePrice: signal<number>
│   ├── residualValue: signal<number>
│   ├── vehicleAge: signal<number>           // 0–10
│   ├── annualMileage: signal<number>
│   ├── keepDuration: signal<number>          // years
│   ├── downPayment: signal<number>
│   └── activeTab: signal<'lease' | 'finance' | 'cash'>
│
├── Lease tab
│   ├── apr: signal<number>
│   ├── leaseTerm: signal<number>             // months: 24/36/48/60
│   ├── leaseEndChoice: signal<'handBack' | 'buyOut'>
│   ├── dispositionFee: signal<number | null>
│   ├── mileageOverageRate: signal<number | null>
│   ├── excessWearEstimate: signal<number | null>
│   └── buyoutFee: signal<number | null>
│
├── Finance tab
│   ├── financeApr: signal<number>
│   └── loanTerm: signal<number>              // months
│
├── Cash tab
│   └── opportunityCostRate: signal<number>   // 0–0.10
│
└── TCO overrides (per tab; each tab has its own override slot)
    ├── insuranceOverride: { lease, finance, cash }: signal<number | null>
    ├── maintenanceOverride: { ... }
    ├── fuelEfficiencyOverride: { ... }
    ├── fuelPriceOverride: { ... }
    └── homeChargerInstallOverride: { ... }
```

### Computed layer

```
Derived (computed)
├── msrp                        ← purchasePrice, vehicleAge
├── vehicleCategory             ← msrp, locale          (Economy | Mid | Luxury)
├── categoryMultipliers         ← vehicleCategory       ({ insurance, maintenance })
├── insuranceDefault[tab]       ← purchasePrice, locale, categoryMultipliers
├── maintenanceDefault[tab]     ← msrp, vehicleAge, powertrain, categoryMultipliers
├── fuelEfficiencyDefault       ← powertrain, locale
├── fuelPriceDefault            ← powertrain, locale
├── insurance[tab]              ← insuranceOverride[tab] ?? insuranceDefault[tab]
├── maintenance[tab]            ← (same shape)
├── fuelEfficiency / fuelPrice  ← (same shape)
│
├── recommendedTab              ← downPayment, purchasePrice, keepDuration, mileage
│
├── monthlyFinancingPayment[tab]   ← per-tab financing math
├── leaseEndFees                   ← (Lease only)
│
├── tcoBreakdown[tab]              ← all of the above × keepDuration → array of layered points
├── totalCost[tab]                 ← sum
├── effectiveMonthly[tab]          ← totalCost / months
└── costPerDistance[tab]           ← totalCost / (mileage × keep years)
```

### Effects layer

Three effects, all in `ScenarioStore` constructor (or initialized from `inject(DestroyRef)`-aware setup):

1. **`persistEffect`** — reads the full state, writes to localStorage. Debounced via `setTimeout` inside an `untracked()` block.
2. **`urlSyncEffect`** — reads the full state, calls `router.navigate([], { queryParams, replaceUrl: true })`. Same debounce. Uses a `private isHydrating` guard signal to avoid the URL-write → navigation-event → hydrate → URL-write loop.
3. **`hydrationBootstrap`** — *not* an effect; runs once during APP_INITIALIZER (or in the root component's constructor). Reads URL query params first, then localStorage, then defaults. Sets all signals via `untracked()` to skip downstream effects during hydration. Sets `isHydrating = false` when done.

### Why two-signal override (not `linkedSignal`)

`linkedSignal` re-runs its computation whenever its source changes, including over a user-set value (unless you use the `previousValue` parameter and complex predicates). The two-signal pattern matches the desired UX more naturally:

```ts
private insuranceOverrideLease = signal<number | null>(null);
insuranceDefaultLease = computed(() =>
  this.purchasePrice() * (this.locale() === 'US' ? 0.05 : 0.04)
                       * this.categoryMultipliers().insurance,
);
insuranceLease = computed(() =>
  this.insuranceOverrideLease() ?? this.insuranceDefaultLease(),
);

setInsuranceLease(v: number) { this.insuranceOverrideLease.set(v); }
resetInsuranceLease()         { this.insuranceOverrideLease.set(null); }
```

Once the user sets a value, it sticks. Resetting goes back to derived. Only the override (often `null`) gets serialized to URL — keeps URLs short.

## Calculation engine

Pure TypeScript module under `src/app/scenario/calculations/`. No Angular imports. Easy to unit-test with Vitest/Jasmine.

```
calculations/
├── depreciation.ts        // depreciationFactor(age) → 0..1
├── msrp.ts                // backDeriveMsrp(price, age)
├── category.ts            // categorize(msrp, locale) → 'economy' | 'mid' | 'luxury'
├── financing.ts           // monthlyLeasePayment(...), monthlyFinancePayment(...)
├── opportunity.ts         // opportunityCostOverYears(principal, rate, years)
├── fuel.ts                // fuelCostOverYears(efficiency, price, mileage, years, locale)
├── tco.ts                 // tcoBreakdown(scenario) → CostBreakdown[]
└── recommendation.ts      // recommendTab(scenario) → 'lease' | 'finance' | 'cash'
```

Each function takes a plain object (subset of the scenario) and returns a plain value. No signals. Signals in the store call them via `computed()`.

## Component tree (atomic)

```
src/app/
├── app.ts                              // shell: <router-outlet/>
├── app.routes.ts
│
├── pages/
│   ├── splash-page/                    // organism page: hero + "Get started"
│   ├── wizard-page/                    // organism page: 6-question form
│   └── tab-page/                       // organism page: vehicle-context-bar + tab-shell + chart + kpi-bar
│
├── features/
│   ├── lease-tab/                      // financing inputs + lease-end section + TCO inputs
│   ├── finance-tab/
│   ├── cash-tab/
│   └── chart/
│       ├── tco-chart-desktop/          // stacked-area Chart.js
│       └── tco-chart-mobile/           // line + 100%-stacked-bar
│
├── shared/                             // atoms + molecules
│   ├── atoms/
│   │   ├── button/                     // variants: primary, secondary, ghost
│   │   ├── toggle/                     // 2-state segmented (US/EU, ICE/EV)
│   │   ├── number-input/               // currency/distance/percent display
│   │   ├── slider-control/             // EXISTING — migrate to signal input/output/model
│   │   ├── kpi-card/                   // EXISTING — migrate to signal input
│   │   ├── info-badge/                 // EXISTING
│   │   ├── icon/                       // single-svg sprite reference
│   │   ├── label/
│   │   └── divider/
│   └── molecules/
│       ├── header-bar/                 // logo + locale-toggle + powertrain-toggle + edit-answers
│       ├── vehicle-context-bar/        // collapsed view of globals, click-to-edit
│       ├── kpi-bar/                    // 3 kpi-cards
│       ├── lease-end-section/
│       ├── tab-strip/                  // Lease | Finance | Cash buttons
│       └── slider-group/               // labeled grouping for tab inputs
│
└── scenario/
    ├── scenario.store.ts               // ScenarioStore service
    ├── scenario.types.ts               // domain types: Locale, Powertrain, Tab, etc.
    ├── scenario.serializer.ts          // URL ↔ state, localStorage ↔ state
    ├── scenario.defaults.ts            // factory for fresh scenario per locale
    ├── locale.config.ts                // unit labels, formatters, default values per locale
    └── calculations/
        └── (above)
```

### Atom contracts (signal-based I/O)

All new atoms use the Angular 20 signal-based I/O. Existing decorator-based atoms (`SliderControl`, `KpiCard`) get migrated:

```ts
// shared/atoms/slider-control/slider-control.ts (target shape)
@Component({ selector: 'app-slider-control', templateUrl: './slider-control.html' })
export class SliderControl {
  label = input.required<string>();
  tip = input.required<string>();
  min = input.required<number>();
  max = input.required<number>();
  step = input(1);
  minLabel = input.required<string>();
  maxLabel = input.required<string>();
  readout = input.required<string>();
  value = model.required<number>();        // two-way via model()

  pct = computed(() =>
    `${((this.value() - this.min()) / (this.max() - this.min())) * 100}%`,
  );

  onInput(event: Event) {
    this.value.set(+(event.target as HTMLInputElement).value);
  }
}
```

`model()` gives two-way binding the parent uses as `[(value)]="store.purchasePrice"` — except the store exposes a setter wrapper rather than the raw signal, since direct binding to the store signal would bypass any future validation hooks.

### Atom rules (apply equally here)

- No internal state beyond view-only derivations (e.g. `pct` above).
- All inputs typed; required inputs use `input.required<T>()`.
- All outputs use `output<T>()`. No `EventEmitter` in new code.
- Two-way bindings use `model()`, not paired `input + output`.
- No business logic. A `ToggleAtom` doesn't know what "US" means; the parent maps it.
- Tailwind classes inline; tokens (`bg-surface`, `text-tx-muted`, etc.) come from the existing palette.

## Routing

```ts
// app.routes.ts
export const routes: Routes = [
  { path: '',        loadComponent: () => import('./pages/splash-page/splash-page').then(m => m.SplashPage) },
  { path: 'wizard',  loadComponent: () => import('./pages/wizard-page/wizard-page').then(m => m.WizardPage) },
  { path: 'lease',   loadComponent: () => import('./pages/tab-page/tab-page').then(m => m.TabPage), data: { tab: 'lease' } },
  { path: 'finance', loadComponent: () => import('./pages/tab-page/tab-page').then(m => m.TabPage), data: { tab: 'finance' } },
  { path: 'cash',    loadComponent: () => import('./pages/tab-page/tab-page').then(m => m.TabPage), data: { tab: 'cash' } },
  { path: '**', redirectTo: '' },
];
```

- Tab routes share `TabPage` and read which tab from `route.data`.
- Lazy loading per page is free here — keeps initial bundle small (splash + wizard load fast for the first-visit path).
- Query params on `/lease|finance|cash` carry the full scenario. URL on `/wizard` may also carry params (for the "edit my answers" case).

### Splash skip rule

`SplashPage` checks `ScenarioStore.hasHydratedFromUrlOrStorage()` — if true (returning user with state), redirect to their `activeTab`. Splash is shown only on a true cold start.

## Persistence and URL sync

```
                    ┌──────────── URL ────────────┐
                    │                             │
                    │  /lease?price=42000&...     │
                    │                             │
                    └──────┬──────────────▲───────┘
                           │              │
              hydrate (boot)              urlSyncEffect (debounced, replaceUrl)
                           │              │
                           ▼              │
                    ┌─────────────────────────────┐
                    │       ScenarioStore         │
                    │   (signals + computed)      │
                    └──────┬──────────────▲───────┘
                           │              │
                  persistEffect       (none — localStorage is write-only here)
                           │
                           ▼
                    ┌─────────────────────────────┐
                    │        localStorage          │
                    │   key: 'whatsmycost.v1'      │
                    └─────────────────────────────┘
```

### Hydration order (boot)

```
1. APP_INITIALIZER → ScenarioStore.bootstrap()
2. Read URL query params via inject(ActivatedRoute).snapshot.queryParamMap
3. If URL has any scenario keys → hydrate from URL (URL wins)
4. Else if localStorage has 'whatsmycost.v1' → hydrate from localStorage
5. Else → keep schema defaults (fresh scenario, locale auto-detected from navigator.language)
6. Set isHydrating = false → effects start running
```

### Loop-avoidance

`urlSyncEffect` checks `if (isHydrating()) return;` at the top. The effect's `router.navigate()` uses `replaceUrl: true` so it doesn't push to history; the resulting `NavigationEnd` event is ignored because the store never reads from the router after boot.

### Serializer

`scenario.serializer.ts` exposes:

```ts
toQueryParams(state: ScenarioSnapshot): Record<string, string>
fromQueryParams(params: ParamMap): Partial<ScenarioSnapshot>
toLocalStorage(state: ScenarioSnapshot): string         // JSON
fromLocalStorage(raw: string): Partial<ScenarioSnapshot>
```

Both encoders skip `null` overrides — keeps URLs short. Schema versioning: localStorage key includes `.v1`; if a future schema breaks, bump to `.v2` and ignore old payloads.

### Debouncing inside an effect

```ts
constructor() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  effect(() => {
    const snapshot = this.snapshot();          // touches all signals
    if (this.isHydrating()) return;
    untracked(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => this.persist(snapshot), 200);
    });
  });
}
```

## Mobile

A single `viewport.ts` utility exposes a `isMobile` signal driven by `window.matchMedia('(max-width: 768px)')` — no `@angular/cdk` dependency:

```ts
export function provideViewport() {
  const mobile = signal(window.matchMedia('(max-width: 768px)').matches);
  window.matchMedia('(max-width: 768px)').addEventListener('change', e => mobile.set(e.matches));
  return { isMobile: mobile.asReadonly() };
}
```

Provided once in `app.config.ts`; injected wherever needed. The chart container uses it:

```html
@if (viewport.isMobile()) {
  <app-tco-chart-mobile [breakdown]="store.tcoBreakdownLease()"/>
} @else {
  <app-tco-chart-desktop [breakdown]="store.tcoBreakdownLease()"/>
}
```

Both chart components consume the same `CostBreakdown[]` shape — only the rendering differs.

## Internationalization scaffold

v1 ships English-only UI. Centralize all strings now so v1.1 German can be mechanical:

```
src/app/i18n/
├── strings.en.ts           // single source of all UI text
└── strings.ts              // re-exports en for now: export * from './strings.en';
```

Components import from `i18n/strings`. v1.1 swaps `strings.ts` for a runtime selector. Avoid Angular's `i18n` attribute-based extraction for v1 — it locks in a build-time toolchain that's overkill here.

Locale-specific *values* (currency symbol, units, formatters, defaults) live in `scenario/locale.config.ts`, not in the strings file. Strings are language; locale config is region.

## Testing strategy

| Layer | Tooling | What |
|---|---|---|
| Pure calculations | Jasmine (existing Karma setup) | `calculations/*.spec.ts` — happy path + edge cases (age=0, residual=price, EV vs ICE) |
| ScenarioStore | Jasmine + TestBed | Verify hydration order, override stickiness, computed correctness |
| Atoms | Jasmine + ComponentHarness | One harness per atom — `SliderControlHarness`, `ToggleHarness` |
| Use-case E2E | Playwright (new) | Five tests, one per use case in [USE_CASES.md](./USE_CASES.md) |

Use-case tests are the primary regression net. They walk a real user through the splash → wizard → tab journey and assert on KPI values.

## Migration map (current → target)

| Status | Current | Action | Target |
|---|---|---|---|
| ✅ | `app.ts` (root with all state) | Refactored to a thin shell rendering `<app-tab-page/>` (router-outlet swap-in is Phase 4) | `app.ts` = thin shell |
| ✅ | `app.html` (tab toggle + placeholders) | Deleted; tab toggle is now the `tab-strip` molecule; placeholder Finance/Cash are full feature components | `pages/tab-page/` |
| ✅ | `lease-tab/lease-tab.ts` | Rewritten on top of `ScenarioStore`; financing math now lives in `scenario/calculations/financing.ts`; TCO inputs section + lease-end section in place | `features/lease-tab/` |
| 🟡 | Chart definition (in lease-tab) | Desktop stacked-area Chart.js renderer done; mobile composition is Phase 7 | `features/chart/tco-chart-desktop/` ✅, `tco-chart-mobile/` ⏳ |
| ✅ | `shared/slider-control` | Migrated to signal `input()` / `model()`; readout is now an inline editable value (prefix / suffix / fractionDigits) | Same path |
| ✅ | `shared/kpi-card` | Migrated to signal input | Same path |
| ✅ | `shared/info-badge` | Migrated to signal input | Same path |
| ✅ | (none) | New atoms: `button`, `toggle`, `number-input`, `icon`, `label`, `divider` | `shared/atoms/` |
| 🟡 | (none) | New molecules: `tab-strip`, `vehicle-context-bar`, `kpi-bar`, `lease-end-section`, `slider-group` ✅; `header-bar` ⏳ (deferred to Phase 4 with edit-answers / wizard route) | `shared/molecules/` |
| ✅ | (none) | New service: `ScenarioStore` | `scenario/` |
| ✅ | (none) | New module: pure calculations + 46 unit specs | `scenario/calculations/` |
| ⏳ | (none) | New routing setup | `app.routes.ts` |

### Suggested build order

Mirrors the use-case priority from USE_CASES.md:

1. ✅ **Foundation:** types + `calculations/` + `ScenarioStore` (no UI yet, all unit-tested). Verify by inspecting computed values in tests.
2. ✅ **Atoms migration:** `SliderControl`, `KpiCard`, `InfoBadge` migrated to signal I/O. Added `button`, `toggle`, `number-input`, `icon`, `label`, `divider`.
3. ✅ **TabPage shell + LeaseTab refactor:** lease tab rebuilt on top of `ScenarioStore` with TCO inputs + lease-end section; desktop stacked-area chart renders. The new TabPage is what the app shows on load.
4. ⏳ **Wizard + SplashPage + routing:** the entry-flow comes after the tab works, since the wizard's job is to populate store values that the tab already knows how to render.
5. ⏳ **Persistence + URL sync:** layer on the effects; verify hydration with manual URL paste.
6. ⏳ **Finance + Cash tabs:** with the lease tab as template, these are mostly variation on financing math.
7. ⏳ **Mobile chart + responsive layout polish.**
8. ⏳ **i18n scaffold:** centralize remaining strings.

## Open architectural questions

1. **APP_INITIALIZER vs. root-component constructor for hydration.** APP_INITIALIZER blocks the bootstrap, which delays first paint slightly but guarantees state is ready before any component renders. Root-constructor is faster but risks a flash of default state. Lean toward APP_INITIALIZER given hydration is synchronous and fast.
2. **Chart.js plugin for stacked-area legend interactivity.** v1 has no layer toggling, so default Chart.js plugins are enough. If we add toggles in v1.1, consider switching to Chart.js's built-in legend with custom click handlers.
3. **`@angular/localize` vs. plain string constants for i18n.** Defended above (strings constants for v1). Revisit when German UI is on the table.