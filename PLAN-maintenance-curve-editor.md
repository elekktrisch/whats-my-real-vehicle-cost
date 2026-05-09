# Plan: Maintenance curve editor

Status: design resolved (via /grill-me), not yet implemented.

## Context

Maintenance is currently modeled as `base × (1 + k × age)` — a linear ramp where:
- `base = msrp × baseRate × categoryMultiplier.maintenance` (baseRate 0.015 ICE / 0.007 EV)
- `k = ICE_K[category] × powertrainFactor × mileageFactor` (varies by category, powertrain, mileage)

The result is a fully-derived display in `MaintenanceDisplay`; the user has no override slot today. Two goals motivate this change:

1. **Visualization** — show the maintenance(age) curve in a chart so the user can see what the model believes.
2. **Adjustability** — let the user drag/edit the curve to fit their real-world maintenance experience.

No specific shape mismatch is being fixed — defaults stay linear and faithful to today's output. The editor's value is *visibility* and *agency*, not bug-fixing.

## Why a curve editor (and not just a slider)

The user explicitly framed this as "the same thing as depreciation": a visual + adjustable curve. The PCHIP interpolator, anchor editor UI, and `chartjs-plugin-dragdata` plugin already exist from depreciation; the marginal cost is direction-flipping clamps and writing per-domain defaults.

## Design decisions

Resolved via /grill-me. See chat history for reasoning per decision.

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Scope | **Global curve override** — replaces `maintenanceAt(base, k, age)` everywhere (`tco-shared.ts:buildOwnedMonthsSeries` and `MaintenanceDisplay`). |
| 2 | Math | **Monotonic cubic (PCHIP / Fritsch–Carlson)** interpolation, monotonic-increasing. PCHIP itself is direction-agnostic; only `clampFactorAt` is direction-specific. |
| 3 | Anchors | **5 fixed X positions at ages [0, 3, 6, 10, 15]**. Back-loaded for maintenance (vs. depreciation's [0, 2, 4, 7, 12] front-loading) — captures post-warranty cliff (year 3) and wear-out climb (year 10–15). Y-only draggable. **Y₀ not locked** (no MSRP-style natural anchor; user may know their year-0 cost). |
| 4 | Y-axis representation | **Stored as % of MSRP per year** (e.g. `[0.0150, 0.0186, …]`). Editor *displays* absolute currency via display-only normalization (multiply by `msrp × catMult × mileageFactor` for chain values; chart axis labels in currency). On commit, divide displayed € back by the same product. |
| 5 | Mileage / category interaction | **Full multiplication.** `maintenance(age) = msrp × curve(age) × catMult.maintenance × mileageFactor`. Year-0 maintenance now scales with mileage too — small behavior change vs. today's "year-0 mileage-independent" rule, accepted because heavy drivers do incur day-1 wear (tires, brakes, fluids). Defaults stay per-(powertrain) only; category and mileage compose orthogonally. |
| 6 | Stashing | **Single override per scenario** (no per-powertrain stash). Toggling powertrain leaves user override in place; flips the underlying default. |
| 7 | UI placement | **Modal**, triggered from a button **next to (not replacing)** the existing `MaintenanceDisplay` in `global-controls.ts:191`. |
| 8 | Commit timing | **Live commit** on every drag/edit (TCO chart visible behind the modal updates in real time). |
| 9 | Drag impl | **`chartjs-plugin-dragdata`** + 5 numeric inputs below the chart for keyboard a11y. Already in `package.json` from depreciation. |
| 10 | Pill behavior | **No pill for the curve.** Dot indicator on the trigger button when override active. (Maintenance has no downstream override slots, so there is nothing to delegate conflict surfacing to — but the override semantic is "user explicitly opted in," and a stale override after a powertrain toggle is something they signed up for.) |
| 11 | Monotonicity | **Hard clamp** during drag/input. Direction-flipped from depreciation: each interior point bounded by `(leftNeighbor.y, rightNeighbor.y)` with **left as lower bound, right as upper bound**. First anchor bounded below by 0 (no negative maintenance). Last anchor bounded above by `0.10` (10% of MSRP) — sanity cap. PCHIP is monotonic-by-construction given monotonic inputs. |
| 12 | Persistence | New field `globals.maintenanceCurve: MaintenanceCurve \| null` in `scenario.types.ts`. **No schema bump** (forward-compatible — old URLs decode the missing field as `null` = use default). |
| 13 | Defaults (ICE) | `[0.0150, 0.0186, 0.0222, 0.0270, 0.0330]` — sampled from current `(1 + k_mid·age) × 0.015` at anchors `[0, 3, 6, 10, 15]` (mid-category, nominal mileage). |
| 14 | Defaults (EV) | `[0.0070, 0.0080, 0.0090, 0.0104, 0.0120]` — sampled from `(1 + k_mid·0.6·age) × 0.007`. |
| 15 | Extrapolation past year 15 | **Linear, with slope = (last segment slope) × 3.** `TAIL_SLOPE_MULTIPLIER = 3`. Default ICE: ~6.9% at age 25; EV: ~2.4%. Tail bends visibly upward; user-curves with steep year 10–15 segments produce proportionally steep tails. |
| 16 | Override indicator | **Dot on trigger button** when `maintenanceCurveOverride !== null`. Same accent-dot pattern as depreciation editor. |
| 17 | Modal responsive style | **Same modal across breakpoints** — reuse depreciation editor's `<dialog>` styles (`max-w-[480px] w-[calc(100%-2rem)]`). No full-screen mobile variant (depreciation's full-screen-mobile path was reverted). |
| 18 | Chart X-range | **0–18 yrs** (anchors [0, 3, 6, 10, 15] fill ~83%; dotted extrapolation hint shown for years 15–18). |
| 19 | Editor chain display | **Mirror `MaintenanceDisplay`'s existing copy logic** — year-1 / year-N currency under the user's current `activeTab` and `leaseEndChoice`. Same `computed` source, rendered as labeled chips like depreciation's chain. |
| 20 | Code organization | **Extract `pchipInterpolate` to a new `calculations/pchip.ts`.** Both `depreciation.ts` and `maintenance.ts` import from it. `clampFactorAt`, `buildPreviewSamples`, anchors, defaults stay per-module. `depreciation.ts` is refactored to import as part of this work. |

## Constants

```ts
// In calculations/maintenance.ts
export const MAINTENANCE_ANCHOR_AGES = [0, 3, 6, 10, 15] as const;
export const MAINTENANCE_PREVIEW_END_AGE = 18;
export const MAINTENANCE_PREVIEW_STEP = 0.25;
const TAIL_SLOPE_MULTIPLIER = 3;
const MAX_FACTOR = 0.10; // 10% of MSRP — sanity cap on the final anchor

export const DEFAULT_MAINTENANCE_CURVES: Record<Powertrain, MaintenanceCurve> = {
  ICE: makeMaintenanceCurve([0.0150, 0.0186, 0.0222, 0.0270, 0.0330]),
  EV:  makeMaintenanceCurve([0.0070, 0.0080, 0.0090, 0.0104, 0.0120]),
};
```

## Public API shape

```ts
// In scenario.types.ts (mirroring DepreciationCurve)
export interface MaintenanceSample {
  readonly age: number;
  readonly factor: number; // % of MSRP per year, e.g. 0.0186 = 1.86%/yr
}
export interface MaintenanceCurve {
  readonly samples: readonly [
    MaintenanceSample, MaintenanceSample, MaintenanceSample,
    MaintenanceSample, MaintenanceSample,
  ];
}

// Replaces today's `maintenanceAt(base, k, age)`.
export function maintenanceAt(
  msrp: number,
  curve: MaintenanceCurve,
  age: number,
  multipliers: { categoryMult: number; mileageFactor: number },
): number;

// Pure curve eval — returns the unitless % of MSRP factor at `age`.
export function maintenanceFactor(age: number, curve: MaintenanceCurve): number;

// Default getter (used by store to resolve override ?? default)
export function defaultMaintenanceCurveForPowertrain(pt: Powertrain): MaintenanceCurve;

// Helpers — same shape as depreciation
export function makeMaintenanceCurve(factors: readonly number[]): MaintenanceCurve;
export function factorsOfMaintenance(curve: MaintenanceCurve): number[];
export function clampMaintenanceFactorAt(
  factors: readonly number[], i: number, raw: number,
): number;
export function buildMaintenancePreviewSamples(
  curve: MaintenanceCurve,
): { age: number; factor: number }[];

// In calculations/pchip.ts (new shared module)
export function pchipInterpolate(
  xs: readonly number[], ys: readonly number[], x: number,
): number;
```

The signature change to `maintenanceAt` is a thread-through:
- `tco-shared.ts:102` calls `maintenanceAt(input.maintenanceBase, input.maintenanceK, ageMidMonth)` — replaced with the curve-based form.
- `tco-shared.ts:OwnedWindowInputs` (line 73–80) and `TcoBaseInputs` (line 14–35) currently carry `maintenanceBase` and `maintenanceK`. These get replaced with `{ maintenanceCurve, maintenanceCategoryMult, maintenanceMileageFactor }` (msrp is already on `TcoBaseInputs` via `purchasePrice`/derived `msrp`).
- `MaintenanceDisplay` (3 call sites in `maintenance-display.ts`) reworked to consume the curve.
- All `tco-*.spec.ts` test fixtures updated from `maintenanceK: 0.08` to `maintenanceCurve: makeMaintenanceCurve([…])`.

## Files affected

**New:**
- `src/app/scenario/calculations/pchip.ts` — extracted shared PCHIP interpolator (just `pchipInterpolate` + its private `endpointSlope` helper).
- `src/app/scenario/calculations/pchip.spec.ts` — relocated PCHIP-internal tests.
- `src/app/shared/molecules/maintenance-curve-editor/maintenance-curve-editor.ts` — modal component (chart + 5 numeric inputs + reset).
- `src/app/shared/molecules/maintenance-curve-editor/maintenance-curve-editor.spec.ts`.

**Modified:**
- `src/app/scenario/calculations/maintenance.ts` — replace linear formula. Add curve eval (PCHIP + linear-3× extrapolation), anchor constants, per-powertrain defaults, helpers.
- `src/app/scenario/calculations/maintenance.spec.ts` — new tests: monotonicity invariants, extrapolation slope = last × 3, ICE/EV defaults match expected, integration with msrp × cat × mileage.
- `src/app/scenario/calculations/depreciation.ts` — drop local `pchipInterpolate` (import from `pchip.ts`).
- `src/app/scenario/calculations/depreciation.spec.ts` — drop any PCHIP-internal tests duplicated by `pchip.spec.ts`.
- `src/app/scenario/calculations/tco-shared.ts` — change `OwnedWindowInputs` and `TcoBaseInputs` to carry curve + scalars. Update `buildOwnedMonthsSeries`.
- `src/app/scenario/calculations/tco-cash.ts`, `tco-finance.ts`, `tco-lease.ts` — thread curve through.
- `src/app/scenario/calculations/tco-cash.spec.ts`, `tco-finance.spec.ts`, `tco-lease.spec.ts`, `tco-invariants.spec.ts`, `tco.spec.ts` — update fixtures.
- `src/app/scenario/scenario.types.ts` — add `MaintenanceSample`, `MaintenanceCurve`; `Globals.maintenanceCurve: MaintenanceCurve \| null`.
- `src/app/scenario/scenario.defaults.ts` — `maintenanceCurve: null` in default scenario.
- `src/app/scenario/scenario.store.ts`:
  - `maintenanceCurveOverride` writable signal.
  - `maintenanceCurve` computed (override ?? `defaultMaintenanceCurveForPowertrain(powertrain())`).
  - Drop the existing `maintenance` and `maintenanceK` computeds; replace with a single `maintenanceContext` computed bundling `{ msrp, curve, catMult, mileageFactor }`.
  - Update `commonBreakdownArgs` (line 375–391) to pass curve context instead of `maintenanceBase` + `maintenanceK`.
  - `applySnapshot` / `snapshot` round-trip `maintenanceCurve`.
  - **No `bindConflict`** for the curve.
- `src/app/scenario/scenario.serializer.ts` — pass-through; verify the new field round-trips.
- `src/app/scenario/scenario.store.spec.ts` — add curve override test cases.
- `src/app/shared/molecules/maintenance-display/maintenance-display.ts` — consume `maintenanceContext()` instead of `maintenance()` + `maintenanceK()`. Re-derive year-1 / year-N copy from curve.
- `src/app/shared/molecules/global-controls/global-controls.ts` — add `<app-maintenance-curve-editor />` trigger next to `<app-maintenance-display />` at line 191.

**Docs:**
- `CLAUDE.md` — add a "Maintenance curve" section under "Scenario module," paralleling the existing "Depreciation curve" section.

## Implementation order (suggested)

1. **Pure math first.** Extract `pchip.ts`. Update `depreciation.ts` to import from it; verify all depreciation tests still pass. Then add `MaintenanceCurve` type, anchor constants, defaults, `maintenanceFactor` (PCHIP + linear-3× extrapolation), `maintenanceAt` (with multipliers), helpers. Tests pass before touching any UI.
2. **Refactor TCO inputs.** Change `OwnedWindowInputs` / `TcoBaseInputs` to carry curve + scalars. Thread through `tco-cash`/`tco-finance`/`tco-lease`. Update all spec fixtures. CI green.
3. **Store wiring.** Add `maintenanceCurveOverride` + `maintenanceCurve` + `maintenanceContext`. Drop `maintenance` / `maintenanceK` computeds. Update `applySnapshot` / `snapshot` / `commonBreakdownArgs`. Existing store tests pass — sample numbers unchanged for nominal inputs.
4. **Serializer round-trip test.** Verify a snapshot with a custom curve serializes and decodes correctly. Verify a snapshot without the field decodes with `maintenanceCurve: null`.
5. **Update MaintenanceDisplay.** Replace `maintenance()` + `maintenanceK()` consumption with curve-based eval. Visual output unchanged for default-curve scenarios.
6. **Modal component, no drag.** Build the dialog with 5 numeric inputs, reset button, dot indicator on trigger, chain display. Functional but not visually polished — text-only edit works end-to-end.
7. **Add the chart preview.** Read-only at first — render a smooth PCHIP curve from the current values + dotted extrapolation tail.
8. **Add drag interaction.** Hook up `chartjs-plugin-dragdata`. Wire `onDrag` to the same signal the inputs write to. Add the hard-clamp.
9. **Update CLAUDE.md.**

## Things to watch

- **Refactor scope.** The signature change to `OwnedWindowInputs` and `TcoBaseInputs` ripples into 5+ tco spec files. Keep the steps split — pchip extraction, math + types, tco refactor, store wiring, UI — so each step has a small diff.
- **Default sample fidelity.** Verify the seeded ICE/EV defaults reproduce today's `MaintenanceDisplay` output to within rounding. Specifically: `maintenanceAt(msrp, ICE_curve, vehicleAge + 0.5, { catMult: 1, mileageFactor: 1 })` should match `base × (1 + k × (vehicleAge + 0.5))` with today's constants for mid-category nominal-mileage. Cover with a regression spec.
- **Mileage scaling year-0 change (Q5).** Heavy-mileage scenarios will see year-0 maintenance shift up vs. today (e.g. 1.67× for 25k mi/yr in EU). Confirm the magnitude is small (~$50/yr) and surface the change in CLAUDE.md so future-Claude doesn't mistake it for a bug.
- **Powertrain toggle while modal is open.** Same as depreciation — default flips, override stays, modal re-renders. Live commit means no special handling.
- **Lease-renew sawtooth.** Each cycle starts at age 0; only anchors 0 and 3 are sampled within a typical 36-month cycle. Curve still works; just doesn't exercise the late anchors during lease cycles. Confirm in `tco-lease.spec.ts`.
- **Loss of luxury-ages-faster compounding.** Today, luxury-vs-economy maintenance ratio compounds from 1.8× (year 0) to ~4.3× (year 10) because both `base` and `k` differ by category. Under this design, category only multiplies the *level* (1.8× flat across ages). Defensible (small effect for 5–10 year keeps), but document it in CLAUDE.md.
- **`backDeriveMsrp`** is depreciation-only — no cross-coupling with the maintenance curve.

## Out of scope

- Per-(powertrain × category) stashed defaults (rejected in Q3.5 — orthogonal scalars are simpler; fidelity loss is small).
- Per-vehicle-tier curves beyond the existing category multiplier.
- Pill-on-curve UI (rejected in Q7b — dot indicator is sufficient).
- Maintenance "base" override slot — entire maintenance shape is captured by the curve override.
- Exponential or capped tail past year 15 (rejected in Q5/Q5.5 — linear-with-3× is the chosen form).

## Open questions for implementation time (not blocking design)

- Round display values to nearest €10 vs €1 in the chain display (probably €10, parallel to the depreciation editor's `MoneyPipe` formatting).
- Whether the year-0 anchor deserves a tooltip noting "this includes calendar-time wear like fluid changes, not just mileage-driven wear" — a soft callout for the small year-0-mileage behavior change.
- Whether to debounce drag updates for URL writes (autosave already debounces 200ms — should be sufficient).
