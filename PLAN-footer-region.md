# Plan — polish region toggle + footer

Outcome of the design grill on 2026-05-10. Captures the structural and visual decisions before implementation so each step can be reviewed independently.

## Decisions

### Structural

- **Region selector moves to the footer**, becoming a peer of Language. Header keeps Powertrain alone on the right.
- **Footer layout** uses `justify-between` with two semantic groups:
  - Left = actions (Reset, Share, GitHub) — page-scoped.
  - Right = preferences (Region, Language) — app-scoped.
- **Mobile (`< sm`)** stacks `flex-col`, actions on top, prefs below, both centered.
- **Splash page** uses the same `<app-footer />` component (no actions). Layout switches from `min-h-[100dvh] flex items-center justify-center` + absolute footer to `min-h-[100dvh] flex flex-col` with a `flex-1` content wrapper centering the card and the footer in normal flow below — page scrolls naturally on short viewports.

### Visual

- **Region + Language harmonized chrome:** font `0.75rem`, button `px-3`, outer `h-9` (36px), inner `h-[30px]` to fit inside `p-[3px]`. Same active/hover treatment.
- **Drop the responsive flag shrink** (`sm:w-[18px] sm:h-[12px]` was rendering smaller on desktop than mobile — backwards). Single size `w-[18px] h-[12px]`.
- **Drop inverted mobile opacity** (`opacity-60 hover:opacity-100 sm:opacity-100`) — replace with plain `text-tx-muted hover:text-tx`.
- **Action buttons keep their `h-9` height** so the two footer groups line up at the same vertical rhythm.
- **GitHub link label shortens** from "View on GitHub" / "Auf GitHub ansehen" to "GitHub".

### Language flags

- EN flag is **region-aware**: US flag when `store.region() === 'US'`, UK flag when `'EU'`. This mirrors the existing `bcp47ForContext` mapping (`en+US → en-US`, `en+EU → en-GB`).
- DE always uses the German flag.
- Same flag shape and size as Region (`w-[18px] h-[12px]` rounded-[2px]).

### Splash page

- Remove the `[REGION] DEFAULTS` pill next to the CTA. Region is now reachable via the footer; the currency symbol on the price input still cues the active region.
- Drop the `splash.regionDefaults` translation keys from `en.ts` and `de.ts`.
- Drop unused imports / interpolation arguments in `splash-page.ts`.

### Accessibility

- Add per-button `aria-label`s to the language selector for screen reader symmetry with the region selector. New keys: `languageSelector.EN` ("English"/"Englisch"), `languageSelector.DE` ("German"/"Deutsch").

## Implementation order

Each step is independently shippable.

1. **Region selector polish** — drop responsive shrink, fix opacity, harmonize chrome (font/padding/heights).
2. **Language selector + flags + aria** — add region-aware EN flag, German flag, per-button aria-labels, harmonize chrome. Catalog updates: `nav.github`, `languageSelector.{EN,DE}`.
3. **Footer restructure** — `justify-between`, action group / pref group, mobile `flex-col` stack, GitHub label change, mount Region inside.
4. **Page header** — drop the `<div class="page-header-toggles">` wrapper; inline `<app-powertrain-selector />`.
5. **Splash page** — remove region pill + dead translation keys + flex-col layout restructure.
