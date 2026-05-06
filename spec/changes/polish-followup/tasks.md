# Implementation Tasks

1. **Calc model: split `CostCategory`.** In `scenario.types.ts` change `financing` → `interestAndFees` + `opportunityCost`. Update `MonthlyTcoPoint`, `CostBreakdown.totals`, `COST_KEYS` in `tco-shared.ts`, `emptyPoint`, `summarize`. Per-mode TCO functions accumulate the two separately.

2. **Chart: 7th layer.** Add `LayerSpec` for `opportunityCost` (pick a color distinct from existing palette — suggest a soft cyan or violet variant). Update legend rendering, sr-only table headers/rows, ariaSummary. Confirm legend toggle works on the new key.

3. **Add lease-end residual lever.** `LeaseInputs.leaseEndResidual: number | null` in `scenario.types.ts` + null default in `scenario.defaults.ts`. New `leaseEndResidualOverride` writable signal in `ScenarioStore` + `leaseEndResidualDefault` (auto-derive `msrp × depreciationFactor(vehicleAge + leaseTerm/12)`) + public `leaseEndResidual` computed.

4. **Wire lease-end residual through TCO + serializer.** `tco-lease.ts` buyout branch uses `leaseEndResidual` (or fallback to `residualValue` if null/auto-mode). `scenario.serializer.ts` includes the field in JSON snapshot.

5. **UI: residual-at-lease-end slider.** New `<app-slider-control>` in `lease-end-section.ts` Advanced disclosure, visible only when `choice() === 'buyOut'`, bound to `store.leaseEndResidualOverride`.

6. **Hero scroll-trigger refinement.** Replace `@HostListener('window:scroll')` in `hero-summary.ts` with three direct-input listeners on `window`: `wheel`, `touchmove`, and `keydown` filtered to scroll keys (`PageUp`, `PageDown`, `Home`, `End`, `ArrowUp`, `ArrowDown`, `Space` — only when `event.target` is not an input/textarea/contentEditable). All three short-circuit when `detailsOpen()` is already false. The `scroll` event itself is no longer listened to — synthetic scrolls from hydration, sticky-stack scroll-anchoring, and `scrollIntoView` no longer trigger close.

7. **Hero per-mode "Out of pocket" caption.** `hero-summary.data.ts`: replace `outOfPocketCaption` content with short year-range wording per mode: cash → "year 1"; finance with `downPayment > 0` → "year 1"; finance with `downPayment === 0` → "years 1-{loanYears}"; lease-renew → "years 1-{keep}"; lease-buyout → "years 1-{termYears}". Mobile variant uses "yr" / "yrs" abbreviation.

8. **Hero opportunity-cost footnote.** Add `<p class="hero-footnote">` element to `hero-summary.ts` template. Compute approximate opportunity cost over keep duration. Style + collapse on `[data-scrolled='true']` matching the other hero ornaments.

9. **Calc-layer tests.** `tco-{lease,finance,cash}.spec.ts`: assertions that interestAndFees + opportunityCost stay separate and sum to old financing total. `tco-lease.spec.ts`: buyout uses `leaseEndResidual` not `residualValue`.

10. **Store + hero tests.** `scenario.store.spec.ts`: leaseEndResidualOverride round-trip + snapshot. `hero-summary.data.spec.ts`: per-mode caption assertions.

11. **Build + verify.** `npm run build`, `npm test --watch=false --browsers=ChromeHeadless`, `npx playwright test`. All green.
