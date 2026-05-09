# Plan: Depreciation curve editor

Status: design resolved (via /grill-me), not yet implemented.

## Context

The current `depreciationFactor(age)` in `src/app/scenario/calculations/depreciation.ts` is a single hardcoded curve (-20% yr 1, -15%/yr yrs 2-5, -10%/yr after) shared between ICE and EV. A user reported the auto-derived `leaseEndResidual` for a 2-yr-old EV (purchase 34,900 / lease term 48 mo / 15k down) came out at ~19,289 EUR vs. their actual contract's ~15,000 EUR. The curve is too generous, especially for EVs (which depreciate harder in years 2-5 due to battery anxiety).

This plan adds a per-powertrain default split AND a user-editable spline curve hidden behind an "Edit depreciation curve" modal.

## Why a curve editor and not just per-powertrain defaults

Per-powertrain defaults alone would close most of the gap, but the user has *contract-level* data (specific residual figures from real lease offers) that the existing single-number `leaseEndResidual` override can't fully capture — overriding one residual point doesn't fix the model's belief about the underlying curve, so the *other* residual (`residualValue` end-of-keep) remains wrong. A curve override fixes the whole shape with one edit.

## Design decisions

Resolved via /grill-me. See chat history for reasoning per decision.

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Scope | **Global curve override** — replaces `depreciationFactor()` everywhere (msrp back-derivation, end-of-keep `residualValue`, end-of-term `leaseEndResidual`, insurance category via msrp) |
| 2 | Math | **Monotonic cubic (PCHIP / Fritsch-Carlson)** interpolation |
| 3 | Anchors | **5 fixed X positions** at ages [0, 2, 4, 7, 12]; Y-only draggable; Y₀ locked at 1.0 |
| 4 | Stashing | **Single override per scenario** (no per-powertrain stash). Toggling powertrain leaves user override in place; flips the underlying default. |
| 5 | UI placement | **Modal**, triggered from `your-situation` near the residual slider |
| 6 | Commit timing | **Live commit** on every drag/edit (TCO chart visible behind modal updates in real time) |
| 7 | Drag impl | **`chartjs-plugin-dragdata`** + 5 numeric inputs below the chart for keyboard a11y |
| 8 | Override layering | **Coexist** — curve override changes all defaults globally; existing number overrides on `residualValue` / `leaseEndResidual` still win locally for their specific values |
| 9 | Pill behavior | **No pill for the curve itself**; downstream existing pills on `residualValue` / `leaseEndResidual` already handle "your override differs from the curve-derived default" |
| 10 | Monotonicity | **Hard clamp** during drag/input. Each interior point bounded by `(rightNeighbor.y, leftNeighbor.y)`. PCHIP is monotonic-by-construction given monotonic inputs. |
| 11 | Persistence | New field `globals.depreciationCurve: number[5] \| null` in `scenario.serializer.ts` shape. **No schema bump** (forward-compatible — old URLs decode the missing field as `null` = use default). |
| 12 | Defaults | ICE `[1.00, 0.68, 0.49, 0.34, 0.20]` (matches today's curve sampled at the anchors). EV `[1.00, 0.55, 0.36, 0.22, 0.13]` (~10-15pp lower mid-curve). |
| 13 | Extrapolation | **Exponential -10%/yr past Year 12** — `curve[4] * Math.pow(0.9, age - 12)`. Matches the existing curve's behavior past year 5; never goes negative. |
| 14 | Override indicator | **Dot on trigger button** when `depreciationCurveOverride !== null`. Same idea as the existing `[isAuto]` flag pattern in `lease-fields.ts`. |
| 15 | Mobile | **Full-screen modal on mobile**, narrow modal on desktop. Same `<dialog>` element as `share-dialog`, just different responsive CSS. |
| 16 | Chart X-range | **0-15 yrs** (anchors fill ~80%, dotted extrapolation hint shown for years 12-15). |

## Constants

```ts
// In calculations/depreciation.ts
const ANCHOR_AGES = [0, 2, 4, 7, 12] as const;
const DEFAULT_CURVES: Record<Powertrain, readonly number[]> = {
  ICE: [1.00, 0.68, 0.49, 0.34, 0.20],
  EV:  [1.00, 0.55, 0.36, 0.22, 0.13],
};
const TAIL_DECAY_PER_YEAR = 0.9; // exponential decay past Year 12
```

## Public API shape

```ts
// New: powertrain-aware curve eval
export function depreciationFactor(
  age: number,
  curve?: readonly number[], // optional override; defaults to ICE curve for backwards compat
): number;

// Default getter for a given powertrain (used by store to resolve override ?? default)
export function defaultCurveForPowertrain(pt: Powertrain): readonly number[];

// PCHIP interpolator (exposed for tests)
export function pchipInterpolate(
  xs: readonly number[],
  ys: readonly number[],
  x: number,
): number;
```

The signature change to `depreciationFactor` is a thread-through — every caller will need to pass the active curve. Callers today (`msrp.ts`, `scenario.store.ts:124`, `scenario.store.ts:323`) all live in places with `Powertrain` access, so they can resolve `curve = store.depreciationCurve()`.

## Files affected

**New:**
- `src/app/shared/molecules/depreciation-curve-editor/depreciation-curve-editor.ts` — modal component (chart + 5 numeric inputs + reset)
- `src/app/shared/molecules/depreciation-curve-editor/depreciation-curve-editor.spec.ts`

**Modified:**
- `src/app/scenario/calculations/depreciation.ts` — add PCHIP eval, anchor constants, per-powertrain defaults, extrapolation; change signature to take optional curve
- `src/app/scenario/calculations/depreciation.spec.ts` — new tests: PCHIP correctness, monotonicity invariants, extrapolation, default samples for ICE/EV match expected, signature back-compat
- `src/app/scenario/calculations/msrp.ts` — thread curve through `backDeriveMsrp`
- `src/app/scenario/calculations/msrp.spec.ts` — update for new signature
- `src/app/scenario/scenario.types.ts` — add `depreciationCurve: number[] | null` to `Globals`
- `src/app/scenario/scenario.defaults.ts` — `depreciationCurve: null` in default scenario
- `src/app/scenario/scenario.store.ts`:
  - `depreciationCurveOverride` writable signal
  - `depreciationCurve` computed (override ?? `defaultCurveForPowertrain(powertrain())`)
  - Update existing `residualValueDefault` (line 124), `leaseEndResidualDefault` (line 322), `msrp` (line 110) to pass `this.depreciationCurve()` through
  - `applySnapshot` / `snapshot` round-trip the new field
  - **No** `bindConflict` for the curve (per Q9γ)
- `src/app/scenario/scenario.serializer.ts` — pass-through (the encoder is already shape-driven; only need to verify the new field round-trips)
- `src/app/scenario/scenario.store.spec.ts` — add curve override test cases; verify existing tests still pass with new signature
- `src/app/shared/molecules/your-situation/your-situation.ts` — add trigger button + dialog wiring next to the residual slider
- `package.json` — add `chartjs-plugin-dragdata` (verify size + maintenance status before adding)

**Docs:**
- `CLAUDE.md` — add a paragraph under "Scenario module" describing the curve editor and pointing to `calculations/depreciation.ts`'s `ANCHOR_AGES` / `DEFAULT_CURVES`.

## Implementation order (suggested)

1. **Pure math first.** Write PCHIP + extrapolation + per-powertrain defaults in `calculations/depreciation.ts`. Tests pass before touching any UI.
2. **Store wiring.** Add `depreciationCurveOverride` signal, `depreciationCurve` computed, thread through to `residualValueDefault` / `leaseEndResidualDefault` / `msrp`. Update `applySnapshot` / `snapshot`. Existing store tests should still pass — only sample numbers change for EV scenarios (now use the steeper EV default).
3. **Serializer round-trip test.** Verify a snapshot with a custom curve serializes and decodes correctly. Verify a snapshot without the field decodes with `depreciationCurve: null`.
4. **Modal component, no drag.** Build the dialog with 5 numeric inputs, the reset button, dot indicator on the trigger. Ship it functional but not visually polished — text-only edit works end-to-end.
5. **Add the chart preview.** Read-only at first — render a smooth PCHIP curve from the current values, no drag interaction.
6. **Add drag interaction.** Hook up `chartjs-plugin-dragdata`. Wire `onDrag` to the same signal the inputs write to. Add the hard-clamp in `onDrag`.
7. **Mobile pass.** Verify the responsive CSS (full-screen on mobile vs. narrow modal on desktop). Touch targets sized appropriately (≥44px hit area for chart points).
8. **Update CLAUDE.md.**

## Things to watch

- **`chartjs-plugin-dragdata`'s alignment under canvas resize.** Verify dots stay attached to data points when the modal opens and the chart's plot area first lays out. The plugin uses Chart.js native point hit-testing, so this should "just work" — but there's a known issue where if the chart is hidden when initialized, the first drag attempt can mis-hit. Mitigate by initializing the chart only after the dialog `open` transition finishes (effect with a microtask delay, or `dialog.addEventListener('transitionend', ...)`).
- **Powertrain toggle while modal is open.** If the user toggles ICE↔EV with the editor open, the *default* curve underneath flips (per Q4a). The user override stays. Modal should re-render to show the new context. Live commit means no special handling needed — signal change → chart re-renders → numeric inputs reflect new state.
- **Residual sliders' `[max]` values.** `residualMax()` and `leaseEndResidualMax()` currently derive from the curve's output. After the curve changes, the max might shift, potentially clamping a previously-valid override. Existing clamp effect in `scenario.persistence.ts:20` handles this.
- **`backDeriveMsrp` for used cars** uses the same curve. Curve changes → msrp changes → insurance category check might flip (e.g. a luxury car threshold). This is correct behavior but worth a regression test in `category.spec.ts`.
- **Test ripple.** `tco-*.spec.ts` tests pass specific input values, not derived defaults, so they should be insulated. `scenario.store.spec.ts` likely needs updates wherever it asserts specific default residual values for EVs.

## Out of scope

- Per-powertrain stashed overrides (rejected in Q4 — single override is sufficient for realistic use).
- Conflict pill on the curve itself (rejected in Q9 — downstream pills handle it).
- 6th anchor at Year 20 (rejected in Q13 — exponential extrapolation is sufficient).
- Per-vehicle-tier curves (compact/midsize/luxury). Not requested; the category multipliers in `category.ts` already partially address tier differences.

## Open questions for implementation time (not blocking design)

- Exact dot color/size for the "override active" indicator — decide during UI pass.
- Whether the trigger button should live above or below the existing `Residual value` slider in `your-situation`. Probably above (curve is "more global" than the single-number override).
- Whether to debounce the drag updates (e.g., write to URL only on drag-end). Probably yes — autosave already debounces by 200ms (see `scenario.persistence.ts`); should be sufficient.
