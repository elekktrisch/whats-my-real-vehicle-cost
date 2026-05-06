# Polish follow-up

## Why

After the comprehensive polish pass tracked in `POLISHING.md` (binary scroll
mechanism, sticky stack, hero details breakdown, cash-out overlay, legend
toggle, mobile slider touch-action, etc.), five user-observable rough edges
remain:

1. **Hero `+ Details` close trigger is too eager.** The disclosure is closed
   on every `window:scroll` event regardless of cause. Three known sources
   of non-user-initiated scroll events that incorrectly close the disclosure:
   - Initial hydration / scroll-position restoration after a `?s=` URL load
   - Browser scroll-anchoring after the sticky header shrinks (the sticky
     stack changes height when `[data-scrolled='true']` flips, which can
     adjust `scrollY` to keep the visible content stable — and that
     adjustment fires a `scroll` event)
   - Programmatic `scrollIntoView({behavior: 'smooth'})` from the "Tweak
     the levers" button
   The close should only fire on **direct user input** (wheel, touchmove,
   keyboard scroll keys), not on synthetic / layout-driven scroll events.

2. **Opportunity cost is invisible in the chart.** It's bundled into the
   `financing` layer alongside interest and lease finance fees. Users can't
   see how much of the "financing" stack is real cash interest vs.
   opportunity cost on capital tied up.

3. **Residual value lever is overloaded.** The `residualValue` override is
   evaluated at end-of-keep across all modes. For lease buyout, the buyout
   price needs the residual at end-of-lease-term, not end-of-keep. Currently
   the same number is reused, overstating or understating the buyout when
   keep ≠ term.

4. **"Out of pocket" caption is generic.** It reads "over X years" — accurate
   but doesn't convey when the money is actually spent. Cash users pay
   nearly everything in year 1; finance spreads across the loan term;
   lease-renew has spikes at every cycle.

5. **Hero hides opportunity cost.** The hero `outOfPocket` is pure cash
   flow. Opportunity cost is real but never appears in the hero — it's only
   in the chart. A user reading just the hero card will undercount the true
   cost of the scenario. A small footnote bridging hero ↔ chart is needed.

## What Changes

- **Hero details close trigger** — replace the `@HostListener('window:scroll')`
  approach with listeners on **direct user-input events** that correlate with
  scroll intent: `wheel`, `touchmove`, and `keydown` filtered to scroll keys
  (`PageUp`, `PageDown`, `Home`, `End`, `Space`, `ArrowUp`, `ArrowDown`).
  The `scroll` event itself becomes irrelevant — synthetic scrolls from
  hydration, scroll-anchoring on header shrink, and `scrollIntoView` no
  longer trigger close.

- **Chart opportunity-cost layer** — split `CostCategory.financing` into
  `interestAndFees` + `opportunityCost`. Calc layer accumulates each
  separately. Chart adds a 7th color-coded stacked-area layer + legend
  entry + sr-only column. Interest-and-fees keeps the existing purple;
  opportunity cost gets a distinct hue.

- **Lease-end residual lever** — add `leaseEndResidual` writable signal +
  computed (override ?? auto-derive at lease-term end). Lease-buyout TCO
  uses `leaseEndResidual` for the buyout cost. The existing `residualValue`
  continues to drive end-of-keep asset display + finance/cash depreciation.
  New slider in `lease-end-section` Advanced disclosure, only visible when
  `leaseEndChoice === 'buyOut'`.

- **Per-mode "Out of pocket" caption** — `hero-summary.data.ts` returns
  mode-specific copy explaining when the money is spent. Format kept very
  short ("year N" or "years 1-N") so it fits in the hero column on mobile:
  - Cash: "year 1"
  - Finance with non-zero down payment: "year 1" (year 1 = down + 12 monthlies, dominates)
  - Finance with zero down: "years 1-{loanYears}" (purely the monthly stream)
  - Lease (renew): "years 1-{keep}" (monthly + cyclic spikes throughout)
  - Lease (buyout): "years 1-{termYears}" (monthly + buyout, then nothing material)
  Mobile abbrev: "yr" / "yrs".

- **Hero opportunity-cost footnote** — small `<p class="hero-footnote">`
  below the `+ Details` disclosure. Computes ≈ `purchasePrice ×
  opportunityCostRate × keepDuration` and renders something like:
  "Plus ≈ $X in opportunity cost — included in the chart's true-cost view
   above, not in the cash-out total." Collapses on `[data-scrolled='true']`
  like other hero ornament.

## Impact

**Capabilities affected**: `hero-summary`, `tco-chart`, `scenario`.

**Files**:
- `scenario/scenario.types.ts` — `CostCategory` split; `LeaseInputs.leaseEndResidual`
- `scenario/scenario.defaults.ts` — `leaseEndResidual: null` default
- `scenario/scenario.store.ts` — `leaseEndResidualOverride` + computed
- `scenario/scenario.serializer.ts` — include in JSON snapshot (backward-compatible: missing field reads as null = auto-derive)
- `scenario/calculations/tco-shared.ts` — `emptyPoint`, `COST_KEYS` updates
- `scenario/calculations/tco-{lease,finance,cash}.ts` — separate accumulators; `tco-lease.ts` buyout uses `leaseEndResidual`
- `features/chart/tco-chart/tco-chart.ts` — 7th `LayerSpec`, legend, sr-only column
- `shared/molecules/lease-end-section/lease-end-section.ts` — new slider in Advanced disclosure (buyout-only)
- `shared/molecules/hero-summary/hero-summary.ts` — scroll-trigger refinement; footnote element
- `shared/molecules/hero-summary/hero-summary.data.ts` — per-mode `outOfPocketCaption` rewrite

**Tests**:
- `tco-{lease,finance,cash}.spec.ts` — assertions on category split
- `tco-lease.spec.ts` — buyout uses `leaseEndResidual`
- `scenario.store.spec.ts` — override pattern + snapshot round-trip
- `hero-summary.data.spec.ts` — per-mode caption assertions

**Backward compatibility**: existing share-URLs (`?s=`) decode without
`leaseEndResidual` → null → auto-derive matches today's behavior. Chart
totals unchanged (sum of split layers = old `financing` total).

**No user-facing breakage**.
