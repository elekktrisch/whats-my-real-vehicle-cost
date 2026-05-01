# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start       # dev server at http://localhost:4200
npm run build   # production build
npm run watch   # build in watch mode
npm test        # unit tests via Karma/Jasmine
```

## Architecture

Single-page Angular 20 app (standalone components, no NgModules) that calculates car lease payments client-side.

**Single root component** (`src/app/app.ts`) handles all state and logic — no child components. State lives directly on the component class; Angular signals are used minimally (just the app title). Inputs use two-way binding via `[(ngModel)]` with `FormsModule`.

**Lease calculation** is purely formula-based (no API):
- Adjusted cap cost → residual → depreciation fee → finance fee → monthly payment
- Chart updates are debounced 200ms via `setTimeout` to avoid excessive re-renders

**Chart**: `chart.js` + `ng2-charts` renders two line series ("Lease Debt Over Time", "Car Value Over Time")

**Tabs**: Three tabs (Lease, Financing, Cash) toggled with `@if`. Only the Lease tab is implemented; Financing and Cash are placeholders.

**Tooltips**: Pure CSS using `data-tooltip` attributes and `::after` pseudo-elements — no JS tooltip library.

**Styling**: Component-scoped SCSS at `src/app/app.scss`; global styles at `src/styles.scss`. Prettier is configured (100-char lines, single quotes) — run `npx prettier --write .` to format.