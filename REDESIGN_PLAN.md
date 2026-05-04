# Redesign Plan

Single source of truth for the in-flight redesign. Supersedes the old phase 1–8 plan.

**Plan owner:** roman
**Last updated:** 2026-05-04
**Status:** designed (UX + structure locked in via /grill-me); implementation not started.

## Thesis

Collapse splash → wizard → three-tab journey into a single comparison-first page. All three financing modes are visible at once via a sticky comparison strip; the focused mode's chart and sliders sit below. Wizard disappears as a route — its inputs become regular controls on the same page. Every redundant slider that can be derived gets demoted to an auto-calculated read-only display. URL becomes the only persistence channel, encoded as a single JSON param.

## UX — locked-in decisions

### Page shape

- **Layout pattern:** Option C (hybrid). Compact 3-column comparison strip up top + focused detail view for one mode below. Comparison is always visible; detail is one mode at a time.
- **Comparison strip = tab control (C1).** The three mode cards are clickable. Tapping a card makes it the focused mode. No separate `tab-strip` molecule.
- **Strip card composition (ii):** mode name + "best" badge (if recommended) + Total / Monthly / Per-distance numbers + cumulative-TCO sparkline. Non-active cards show a delta to the recommended ("+$32 / mo").
- **Sparkline scale:** shared across all three (`max(leaseTotal, financeTotal, cashTotal)`). The recommended card's line is literally the lowest.
- **Sticky strip (S3):** strip alone sticks; header (logo + locale + basic/advanced toggle) scrolls away. 24px gradient fade band at the strip's bottom (`linear-gradient(to bottom, surface 0%, surface 70%, transparent 100%)`).
- **Shrink on scroll (F2):** past ~250px scroll desktop / ~120px mobile, sparklines fade out and padding tightens; cards collapse to `Monthly + Per-distance + delta` (drop the Total row, keep per-distance — it's the cross-tab apples-to-apples figure).
- **Recommendation explanation:** one-line locale-aware sentence anchored under the recommended card, just above the focused detail view. Updates live as inputs change.
- **Below the strip (order O1):** chart → mode-specific sliders → global controls (basic block, then advanced block when toggle is on). Mode-specific lives next to the chart that reflects it; globals live at the bottom because they affect all three sticky cards equally.

### Wizard + splash

- **Wizard (W4):** deleted entirely. The 7 wizard inputs become regular controls on the comparison page. `WizardPage` component and `/wizard` route both removed. Explanatory copy from each wizard question migrates to tooltips on the corresponding control via the existing `info-badge` atom.
- **Splash:** kept as-is for now. No content redesign. "Get started" navigates to `/` with a default scenario in the URL JSON.
- **Routes (D1):** single `/` route. Splash renders when there are no params; comparison page renders otherwise (or when default JSON is loaded).

### Controls

- **Basic / Advanced toggle:** one **global** toggle in the header. Default = basic. Persisted in URL (`adv=1` or as a field inside the JSON blob — see Persistence). Per-section toggles rejected (creates inconsistent state).
- **Basic tier:** MSRP, vehicle age, annual mileage, keep duration, powertrain, locale, opportunity-cost rate; per-mode down payment, APR (lease + finance), lease term.
- **Advanced tier:** insurance (slider override), residual value, all lease-end fees (disposition, mileage overage, excess wear, buyout, early termination), fuel efficiency, fuel price, EV setup (home-charger toggle + solar toggle).
- **Maintenance:** **no slider.** Auto-calculated from the curve below. Displayed as a read-only labeled row in the running-costs section, mode-aware text:
  - Cash / finance: `"Maintenance: $X/yr (year 1) → $Y/yr (year N)"`
  - Lease renew: `"Maintenance: $X/yr (resets each cycle)"`
  - Lease buyout: `"Maintenance: flat during lease → $X/yr (year 1 owned)"`
- **Home charger:** **toggle**, not slider. Two states: "Install" (use locale flat default $1500 US / €1200 EU) and "Already have / not installing" (cost = 0). EV-only.
- **Solar:** **toggle**, EV-only, basic tier. Single 85/15 home/public charging split. Solar on → home charging cost ≈ 0; effective electricity = 15% of grid rate. Disabled when home charger is N/A (with tooltip "Solar charging requires a home charger").

## Model changes (calc layer)

### Maintenance curve

- **Shape:** linear. `maintenanceAt(ageYears) = base × (1 + k × ageYears)`.
- **Drivers:** `(category × powertrain)` lookup table for k:
  - ICE: economy 0.05 / mid 0.08 / luxury 0.12
  - EV: ICE × 0.6 (drivetrain low; brakes/tires/fluids still apply)
  - Hybrid: ICE × 0.85
- **Base level:** unchanged from today (`msrp × locale_baseline × category_multiplier`).
- **Lease-cycle reset:** in lease renew mode, the `ageYears` clock resets at every cycle boundary (each cycle starts a new car). The maintenance band in the chart will show a sawtooth. In lease-buyout mode, maintenance is flat through the lease term then begins climbing from year 1 of the owned tail.
- **No special-casing per mode.** A shared `buildOwnedMonthsSeries` helper computes insurance + maintenance + fuel for any owned-months window with a starting age; `leaseTco` calls it once per cycle (rolling) or once for the owned tail (buyout); `financeTco` and `cashTco` call it once for the full keep duration.

### Solar (EV)

- New input: `solar: boolean` (basic tier).
- New input: `homeChargerInstalled: boolean` (replaces today's `homeChargerInstall` slider).
- Effective electricity cost in `fuel.ts` for EVs:
  - `homeChargerInstalled = false`: charging cost = grid rate (no home-charging benefit).
  - `homeChargerInstalled = true`, `solar = false`: charging cost = grid rate.
  - `homeChargerInstalled = true`, `solar = true`: charging cost = 15% of grid rate (assumes 85% home-from-solar, 15% public).
- Home charger one-time install cost: $1500 US / €1200 EU when `homeChargerInstalled = true`, else 0. Folded into the maintenance bucket on month 0 (current behavior preserved).

## Software-structure changes

### New components

- `shared/atoms/tco-sparkline/` — small SVG polyline atom; takes a `MonthlyTcoPoint[]` and a `yMax`; emits a tiny line. `aria-hidden="true"`.
- `shared/molecules/mode-card/` — single mode's strip card. Numbers + sparkline + best-badge + delta. Tablist member (`role="tab"`).
- `shared/molecules/comparison-strip/` — sticky wrapper around 3 `mode-card`s, gradient fade, F2 shrink behavior, tablist semantics. Iterates `MODES: Tab[] = ['lease', 'finance', 'cash']`.
- `shared/molecules/ev-setup/` — bundles home-charger toggle + solar toggle. Visible when powertrain = EV.
- `shared/molecules/basic-advanced-toggle/` — header-mounted toggle.
- `features/mode-detail-view/` — R2 container. Reads `store.activeTab()`; mounts the matching field component (`lease-fields` / `finance-fields` / `cash-fields`); renders the chart and the global-controls block. Replaces today's `TabPage` switch-on-tab block.
- Per-mode field components — slim, only the slider groups unique to each mode. Lease keeps its `lease-end-section` molecule.

### Deleted / consolidated

- `pages/wizard-page/` — gone.
- `pages/tab-page/` — replaced by a `pages/comparison-page/` (or rolled into `app.ts`'s render-state for `/`).
- `shared/molecules/tab-strip/` — gone (mode cards are the tab control).
- `shared/molecules/tab-hero/` — gone (strip subsumes it).
- `shared/molecules/kpi-bar/` — gone (strip subsumes the KPIs).
- `features/lease-tab/`, `features/finance-tab/`, `features/cash-tab/` — replaced by thinner per-mode field components under `features/mode-detail-view/`.
- `features/chart/tco-chart-desktop/` — renamed to `features/chart/tco-chart/`, with responsive options (D2, no separate mobile component).

### Store changes

- New writable signals: `solar`, `homeChargerInstalled`, `basicMode`.
- New computed: `sparklineYMax = computed(() => Math.max(leaseTotal(), financeTotal(), cashTotal()))`.
- Removed signal: `_homeChargerInstallOverride` (replaced by `homeChargerInstalled` boolean).
- Removed signal: `_maintenanceOverride` (maintenance is fully derived now).
- **Per-mode inputs stay split** (`leaseDownPayment`, `financeDownPayment`; cash uses `purchasePrice`). Not collapsed into `Record<Tab, ...>` — keeps the model honest about cash's different shape.

### Persistence (URL-only, single JSON param)

- **Drop localStorage entirely.** No `whatsmycost.v1` key, no `toLocalStorage` / `fromLocalStorage`, no migration path. URL is the only state.
- **Single JSON param.** `?s=<encoded-json>` instead of per-field short keys. Encoding: `encodeURIComponent(JSON.stringify(snapshot))`. Roughly halves `scenario.serializer.ts`.
- **Schema-versioned outer wrapper.** `?s=<encoded-json>` where the JSON is `{ v: 2, ...snapshot }`. Unknown versions render defaults; unknown fields are ignored. Keeps the format extensible without a migration ceremony.
- **`activeTab` lives inside the JSON.** No separate route.
- **`adv` lives inside the JSON** (`basicMode: false`). Sharing an advanced URL retains advanced view.

### Routes

```ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app.shell').then((m) => m.AppShell),
  },
  { path: '**', redirectTo: '' },
];
```

`AppShell` reads URL params; renders splash if none, comparison page otherwise.

## Accessibility (WCAG 2.2 AA target)

Skill installed: `addyosmani/web-quality-skills@accessibility`. Use it during Phase G implementation as the canonical reference.

### Specific WCAG 2.2 success criteria addressed

| Criterion | Where it bites in this redesign | Plan |
|---|---|---|
| **1.1.1** Non-text content | Sparkline, "best" badge SVG | Sparkline `aria-hidden="true"`; badge needs `aria-label="recommended"` or visually-hidden text |
| **1.4.3** Contrast (Min) AA 4.5:1 | Dim/quiet treatment on non-active cards; gradient fade text zone | Audit; nudge only failing tokens |
| **1.4.11** Non-text contrast 3:1 | Sparkline stroke vs surface; focus rings | Pick stroke colors against `bg-surface` |
| **2.1.1** Keyboard | Mode cards, basic/advanced toggle, EV-setup toggles | All native `<button>` or proper tablist semantics |
| **2.4.7** Focus visible | All new interactive elements | Tailwind `focus-visible:ring-2 ring-offset-1` |
| **2.4.11** Focus not obscured (new in 2.2) | **Sticky strip + gradient fade** — focused element scrolled under the strip would hide | `:focus-visible { scroll-margin-top: <strip-height + 24px>; }` |
| **2.5.7** Dragging movements (new in 2.2) | Slider drag | Native `<input type="range">` already keyboard-arrow operable; no work needed |
| **2.5.8** Target size (new in 2.2) | Mode cards on mobile (M1 compact); EV-setup toggles | All interactives ≥ 24×24 px; mode card target zone ≥ 44×44 |
| **3.2.3** Consistent navigation | Removing tabs but keeping their state in URL | Strip ordering matches every render |
| **4.1.2** Name, role, value | Mode cards, sparklines, charts | Tablist semantics; `aria-label` on chart canvas; visually-hidden table |
| **4.1.3** Status messages | Recommendation flips when inputs change | `aria-live="polite"` region next to recommendation text |
| **2.3.3** Animation from interactions | F2 shrink animation, gradient fade transition | `prefers-reduced-motion: reduce` skips them |

### Concrete changes

- **Tablist semantics on strip (Sem1):** `<div role="tablist">` containing 3 `<button role="tab" aria-selected aria-controls="modepanel-N">`. Detail view is `<section role="tabpanel" id="modepanel-N" aria-labelledby="modetab-N">`. Roving tabindex; arrow keys move focus among cards; Enter/Space activates.
- **Sparkline `aria-hidden="true"`** — numbers carry the truth.
- **Chart accessibility (Ch3):** visually-hidden `<table>` mirroring the chart series, always rendered (sr-only). Plus `aria-label` summary on the canvas.
- **Tooltip behavior:** `info-badge` opens on focus + Esc-close + `aria-describedby` link. Use Angular CDK `Overlay` + `cdkTrapFocus`.
- **Focus rings:** Tailwind `focus-visible:ring-2 ring-offset-1` against existing tokens.
- **`prefers-reduced-motion`:** single CSS block disables F2 shrink animation, gradient fade transition, chart series transitions.
- **Live region:** one `aria-live="polite"` element next to the recommendation explanation. Updates when `recommendedTab()` flips.
- **Skip link** (2.4.1): hidden-by-default "Skip to main content" link before the header; jumps to the comparison strip's container.
- **`<html lang="en">`** verified in `index.html` (locale-detected text content currently US-default; v1.1 i18n is separate).

### Font-size + contrast policy

- **Floor:** 12px (Tailwind `text-xs`). No text smaller anywhere in production rendering.
- **Targeted bumps from current state:**
  - Tooltip body text → `text-sm` (14px).
  - Chart.js axes + legend → `font: { size: 13 }` in chart options.
  - Slider readout *value* → bumped (kept the unit suffix at current size).
  - Dim card secondary text → both bigger and higher-contrast (most likely contrast failure point).
- **Contrast audit at AA (4.5:1 normal, 3:1 large + UI graphics).** Not AAA. No palette restyle — fix only specific failing token pairs. Likely failures: dim card text and any text sitting in the gradient fade zone (mitigation: keep readable text *above* the fade band).
- **No font-size toggle** (browser zoom handles it).

## Phase plan + skill mapping

Skills installed and applicable: `simplify`, `angular-developer`, `angular-signals`, `atomic-design-atoms`, `tailwind-design-system`, `frontend-design`, `accessibility` (WCAG 2.2). Invoke each at the corresponding phase via the Skill tool.

### Phase A — Calc layer foundation
**Skill:** `simplify` (review redundancy at end).

- Add age-curving maintenance to `tco.ts` (linear, category × powertrain table).
- Lease-cycle reset for renew mode; flat-then-climb for buyout.
- Add solar logic to `fuel.ts` (EV-only, 85/15 split, gated on home-charger present).
- Replace `homeChargerInstall` slider with `homeChargerInstalled` boolean throughout calc layer.
- Extract `buildOwnedMonthsSeries` helper (insurance + maintenance + fuel for an owned-months window with starting age).
- Spec coverage in `*.spec.ts` files: maintenance curve at three ages, lease-cycle reset, solar on/off, charger off (solar disabled), helper composition.

**Risk:** low. Pure functions, isolated tests. **Forced order:** must precede B.

### Phase B — Store + serializer simplification
**Skills:** `angular-signals`, `simplify`.

- Add `solar`, `homeChargerInstalled`, `basicMode` writable signals.
- Add `sparklineYMax` computed.
- Remove `_maintenanceOverride` and `_homeChargerInstallOverride` signals.
- Drop `toLocalStorage` / `fromLocalStorage`; remove the per-field URL key map.
- Replace with single `?s=<encoded-json>` param. Add outer `{ v: 2, ...snapshot }` wrapper.
- Update the autosave effect to write only the URL.
- Specs: round-trip JSON, version-mismatch falls back to defaults, sparklineYMax updates.

**Risk:** medium. URL contract changes; existing user-shared URLs become inert (acceptable).

### Phase C — New atoms + molecules
**Skills:** `atomic-design-atoms`, `frontend-design`, `tailwind-design-system`.

- New atom: `tco-sparkline` (SVG polyline, `aria-hidden`).
- New molecule: `mode-card` (numbers + sparkline + delta + best-badge; tablist member).
- New molecule: `comparison-strip` (3 cards + sticky wrapper + gradient fade + F2 shrink + tablist).
- New molecule: `ev-setup` (charger toggle + solar toggle, gated on `powertrain === 'EV'`).
- New molecule: `basic-advanced-toggle` (header-mounted).
- Maintenance display row (mode-aware copy, info-icon tooltip).

**Risk:** low. Presentational, fixture-data testable.

### Phase D — `ModeDetailView` + page assembly
**Skills:** `angular-developer`, `frontend-design`.

- New container `mode-detail-view` reads `store.activeTab()`; mounts the matching field component.
- Per-mode field components: `lease-fields`, `finance-fields`, `cash-fields`. Lease keeps `lease-end-section`. Each receives `(role="tabpanel")` semantics from the parent.
- New `comparison-page` (or extended `app.shell`) lays out: header → comparison-strip → recommendation line → chart → mode-fields → global controls (basic, then advanced when toggle on).
- Splash variant rendered when URL has no params.

**Risk:** medium — largest visible churn. Keep behind a feature branch through E.

### Phase E — Route consolidation + deletions
**Skill:** `simplify`.

- Routes file: single `/` route + wildcard.
- Delete `pages/wizard-page/`, `pages/tab-page/`.
- Delete `shared/molecules/tab-strip/`, `shared/molecules/tab-hero/`, `shared/molecules/kpi-bar/`.
- Delete `features/lease-tab/`, `features/finance-tab/`, `features/cash-tab/`.
- Wire the splash button to load defaults into the URL JSON and re-render.

**Risk:** low once D is live. **Forced order:** after D.

### Phase F — Chart consolidation
**Skill:** `angular-developer`.

- Rename `tco-chart-desktop` → `tco-chart`.
- Add Chart.js responsive options for breakpoint-aware ticks/legend/font sizes.
- Add visually-hidden `<table>` mirroring the series (always rendered).
- `aria-label` summary on the canvas.
- Bump axis/legend font to 13–14px.

**Risk:** low. Parallelizable with D.

### Phase G — Accessibility pass
**Skill:** `accessibility` (read it before starting; consult `references/A11Y-PATTERNS.md` from the skill for tablist + live-regions markup). Also `angular-developer` for ARIA in Angular templates.

- Tablist semantics on `comparison-strip` and child `mode-card`s. Roving tabindex, arrow-key navigation.
- `aria-hidden` on sparklines.
- Tooltip focus-trigger + Esc-close on `info-badge` (CDK Overlay).
- `aria-live="polite"` region next to recommendation explanation.
- `prefers-reduced-motion` CSS block.
- Focus-visible rings on all new interactives.
- `scroll-margin-top` on focusable elements equal to the sticky strip's height + 24px (WCAG 2.4.11 — focus not obscured).
- Target size sweep: every interactive ≥ 24×24 px (WCAG 2.5.8).
- Skip link.
- 12 px font floor; targeted bumps (tooltip body, chart axes, slider readout, dim card text).
- Contrast audit at WCAG AA: only nudge specific failing token pairs.

**Risk:** low. Each change is self-contained.

### Phase H — Mobile responsive
**Skills:** `tailwind-design-system`, `frontend-design`.

- Comparison strip: try **M1** (3 compact columns) at <600 px viewport; **fallback to M2** (horizontal carousel with peek-edge) if cards crush below readable.
- Mobile-tuned F2: sparkline hidden, threshold ~120 px, fade band 16 px, shrunk row = monthly + delta only.
- Verify slider stacking under existing Tailwind responsive utilities; don't over-engineer.
- He1 inline header (logo abbreviated, locale + advanced toggle as compact icons).
- Responsive `tco-chart` options.

**Risk:** medium. M1↔M2 fallback decision happens visually after implementing.

## Cross-cutting

- `simplify` skill at the end of each phase as a redundancy review pass before merging.
- `accessibility` skill referenced throughout — not just in Phase G — whenever new interactive UI is built.
- Each phase ships behind the existing CI flow (lint + test). Phase D + E land together on a feature branch to avoid a half-migrated `master`.

## Open items

- **Mobile M1↔M2 decision** — visual judgment after Phase H prototype.
- **Splash content refresh** — parked, not in scope for this redesign.
- **Contrast audit results** — concrete token nudges identified during Phase G.
- **Chart's role on mobile** — keep stacked-area or simplify to a line chart? Defer to Phase H.

## What this plan supersedes

- `ARCHITECTURE.md` "Progress" section (phases 1–6 history).
- `ARCHITECTURE.md` "Suggested build order" section.
- `ARCHITECTURE.md` "Migration map" (current → target table).
- `CLAUDE.md` "Status" section (phases 1–7 narrative).

Those sections have been removed and replaced with pointers to this file.