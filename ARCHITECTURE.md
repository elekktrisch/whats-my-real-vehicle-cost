# Architecture

How [PRODUCT.md](./PRODUCT.md) and [USE_CASES.md](./USE_CASES.md) get built. Angular 20, standalone components, signals everywhere, no NgModules.

For the current code-level layout (component tree, store shape, file paths), see [CLAUDE.md](./CLAUDE.md). This document covers the architectural *why*: principles, the override pattern, calc-engine layout, testing strategy.

## Guiding principles

1. **Signals are the source of truth.** All state lives in writable signals on a single store service. All derivations are `computed()`. Side effects (persistence, URL sync) are `effect()`s. Components are thin views over signals.
2. **Override-aware defaults.** TCO inputs (insurance, maintenance, fuel) need to *derive from* globals (price, age, powertrain, locale) AND be user-overrideable. Pattern: one `signal<T | null>` for the override, one `computed<T>` for the derived default, one public `computed<T>` returning `override ?? default`. Cleaner than `linkedSignal` for this case because (a) the override semantics are sticky and (b) only the override needs to be serialized.
3. **URL is the configuration.** The query string holds the full scenario via `?s=<encoded-json>` (autosave) and `?c=<compressed>` (share). No localStorage. Sharing = copy/paste.
4. **Atoms are dumb.** No business logic, no internal state, all I/O via `input()` / `output()` / `model()`.
5. **Build types and pure functions before signals.** The math (MSRP back-derivation, TCO calculation, depreciation curve) is pure functions in a separate module, unit-tested without Angular. Signals just call them.

## Two-signal override pattern (vs. `linkedSignal`)

`linkedSignal` re-runs its computation whenever its source changes, including over a user-set value (unless you use `previousValue` and complex predicates). The two-signal pattern matches the desired UX more naturally:

```ts
class ScenarioStore {
  private _insuranceOverride = signal<number | null>(null);
  private insuranceDefault = computed(
    () =>
      this.purchasePrice() *
      this.localeConfig().insuranceRate *
      this.categoryMultipliers().insurance,
  );
  readonly insurance = computed(
    () => this._insuranceOverride() ?? this.insuranceDefault(),
  );

  setOverride(slot: TcoSlot, value: number | null) {
    // routes value into the matching _xOverride signal
  }
}
```

Once the user sets a value, it sticks. Resetting goes back to derived. Only the override (often `null`) gets serialized — keeps URLs short.

## Calculation engine

Pure TypeScript module under `src/app/scenario/calculations/`. No Angular imports. Easy to unit-test.

```
calculations/
├── depreciation.ts        // depreciationFactor(age) → 0..1
├── msrp.ts                // backDeriveMsrp(price, age)
├── category.ts            // categorize(msrp, locale) → 'economy' | 'mid' | 'luxury'
├── financing.ts           // monthlyLeasePayment(...), monthlyFinancePayment(...)
├── opportunity.ts         // opportunityCostOverYears(principal, rate, years)
├── fuel.ts                // fuelCostOverYears(efficiency, price, mileage, years, locale)
├── maintenance.ts         // maintenanceOverYears(msrp, age, powertrain, mult)
├── recommendation.ts      // recommendTab(scenario) → 'lease' | 'finance' | 'cash'
├── tco-shared.ts          // emptyPoint, COST_KEYS, summarize helpers
├── tco-{lease,finance,cash}.ts  // per-mode TCO accumulators
└── tco.ts                 // dispatcher
```

Each function takes a plain object (subset of the scenario) and returns a plain value. No signals. The store calls them via `computed()`.

## Testing strategy

| Layer | Tooling | What |
|---|---|---|
| Pure calculations | Jasmine | `calculations/*.spec.ts` — happy path + edge cases (age=0, residual=price, EV vs ICE) |
| ScenarioStore | Jasmine + TestBed | Hydration order, override stickiness, computed correctness |
| Atoms | Jasmine + ComponentHarness | One harness per atom |
| Use-case E2E | Playwright | One per scenario in [USE_CASES.md](./USE_CASES.md) |

Use-case tests are the primary regression net.
