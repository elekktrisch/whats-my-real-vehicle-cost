# WhatsMyVehicleCost — Product Vision

## What this app is

A **total-cost-of-ownership (TCO) educator** for people considering buying a specific car. The user answers a few questions about the vehicle and their plans, and the app shows them what that car will *really* cost them over the years they plan to keep it — financing cost, depreciation, fuel/electricity, insurance, and maintenance, all on one chart.

The headline insight the app exists to deliver: **the monthly payment is not the cost.** Effective $/month including everything is often dramatically different from the financing payment alone, and changes the lease-vs-finance-vs-cash answer in ways most shoppers don't see.

## Target user

A consumer comparison-shopping a specific car (or a few). Has a candidate vehicle in mind, knows roughly its purchase price, wants to understand what they're really signing up for. Markets: **US and EU** (Germany defaults for EU).

## Top-level flow

```
Splash → Wizard (6 Q) → Tab UI (Lease | Finance | Cash, one active)
```

- **Splash** — short intro card explaining what the app does, "Get started" button
- **Wizard** — single scrollable page, 6 questions, recommends and auto-selects a tab on submit with reasoning shown ("We picked Lease because…")
- **Tab UI** — financing controls at top, TCO inputs below, KPI cards + chart at bottom
- User can switch tabs at any time; globals carry over
- "Edit answers" button in header re-opens wizard with current values; "Start over" link inside wizard wipes all state

## Wizard — 6 questions, one page

| # | Question | Range | Drives |
|---|---|---|---|
| 1 | How long do you plan to keep the car? | 1–10 yr | Chart horizon, tab recommendation |
| 2 | Annual mileage | 5k–25k | Tab recommendation, fuel cost |
| 3 | Vehicle purchase price | locale-defaulted | Cap cost, insurance baseline |
| 4 | Estimated residual value | locale-defaulted | Lease residual, depreciation curve |
| 5 | Initial down payment / cash available | $0–$80k | Tab recommendation (enables Cash) |
| 6 | Vehicle age | 0–10 yr | MSRP back-derivation, maintenance |

**Tab-recommendation logic:**
- Cash available ≥ ~80% of purchase price → **Cash**
- Keep-duration ≤ 3 yr **AND** annual mileage ≤ 12k → **Lease**
- Otherwise → **Finance**

User can override the recommendation by clicking a different tab.

## Data architecture: globals vs. per-tab

**Global vehicle context** (set in wizard, editable above tabs, carries across tab switches):
- Locale (US / EU)
- Powertrain (ICE / EV) — toggle in header
- Vehicle age
- Purchase price
- Residual value
- Annual mileage
- Keep-duration
- Down payment

**Per-tab financing inputs:**
- Lease: APR (rendered as money factor in US, Leasingfaktor in EU), lease term, lease-end choice
- Finance: APR, loan term
- Cash: expected investment return (0–10%, default 5%) — drives opportunity-cost line in TCO

**Per-tab TCO inputs** (defaults derived from globals; user can override on tab):
- Insurance / yr
- Maintenance / yr
- Fuel or electricity (price per unit + efficiency)
- Home charger install (EV only, visible by default, $0 or ~$1500/€1200)

## Lease-end mechanics

The Lease tab includes an "End of lease" section, **auto-derived** from keep-duration vs. lease term and overrideable:

- If keep-duration ≤ lease term → **Hand back** auto-selected
  - Sliders: disposition fee, mileage overage rate, expected excess wear/tear ($0–$3000, with tooltip "≈$500–$1500 typical 3-yr wear; $2000+ with kids/pets/city parking")
- If keep-duration > lease term → **Buy out** auto-selected
  - Buyout fee slider; residual (already in globals) becomes the buyout price
  - Buyout assumed paid in cash (no buyout-loan modeling in v1)
  - Chart extends past lease-end with continued ownership costs (no more lease payments)

Flipping the toggle adjusts keep-duration to stay logically consistent.

## TCO model — 5 cost categories

| Category | Source | Notes |
|---|---|---|
| Depreciation / Lease cost | Financing math | Different per tab |
| Financing cost | APR / money factor / opportunity cost | Different per tab |
| Fuel or electricity | Price × efficiency × mileage | Powertrain-conditional input |
| Insurance | `purchase_price × {0.05 US, 0.04 EU} × categoryMult` | Annual |
| Maintenance | `MSRP × {1.5% ICE, 0.7% EV} × (1 + age × 0.1) × categoryMult` | Annual |

**MSRP back-derivation:**
```
if age == 0:  msrp = purchase_price
else:         msrp = purchase_price / depreciationFactor(age)
              // typical curve: ~20% yr1, 15%/yr yr2-5, 10%/yr after
```

**Vehicle category** (derived from MSRP, drives multipliers):

| MSRP band (US / EU) | Category | Maintenance × | Insurance × |
|---|---|---|---|
| <$35k / <€30k | Economy | 1.0 | 1.0 |
| $35–70k / €30–60k | Mid | 1.3 | 1.2 |
| >$70k / >€60k | Luxury | 1.8 | 1.5 |

**Explicitly out of scope for v1:** registration fees (too noisy), separate sales tax (folded into purchase price as all-in), battery replacement (too speculative), tire replacement separately (folded into maintenance), EV-specific depreciation curve (residual slider lets the user handle it), PHEV (not modeled — Hybrid users select ICE and dial in their MPG).

## Locale strategy — US + EU

**Auto-detected from `navigator.language` on first load**, persisted with the rest of state, exposed as a header toggle.

| Dimension | US | EU (Germany defaults) |
|---|---|---|
| Currency | $ before number | € after number, comma decimals |
| Distance | miles | kilometers |
| ICE efficiency | MPG | L/100km |
| EV efficiency | miles/kWh | kWh/100km |
| Fuel price | $/gal | €/L |
| Electricity | $/kWh | €/kWh |
| Lease label | "Money factor" | "Leasingfaktor" |
| Insurance baseline | 5% of purchase price | 4% of purchase price |

Underlying lease math is identical (money factor = APR/2400); only labels differ.

Two more locales (UK, France/Italy) deferred. EU = Germany defaults is acknowledged as an approximation.

## Output: KPI cards + chart

**Three KPI cards, above the chart:**
1. **Total cost over X years** — headline TCO
2. **Effective $/month** — TCO ÷ months (the cross-tab apples-to-apples comparison)
3. **Cost per mile/km** — TCO ÷ total distance

**Chart (desktop):** stacked-area cumulative TCO over keep-duration. X = months, Y = cumulative spend, layers = the 5 TCO categories + lease-end fees as a step. Vertical marker at lease-end on Lease tab. No layer toggle in v1.

**Chart (mobile, ≤768px):** different visualization — a simple cumulative-cost line + a separate 100%-stacked-bar showing where the money goes. Stacked area is unreadable on phones.

## Persistence and shareability

- **localStorage** stores the full state blob (wizard answers + tab tweaks + locale + powertrain + active tab). Returning users land where they left off.
- **URL hash** carries every parameter (`/?tab=lease&price=34000&residual=15000&age=2&...`). URL is the source of truth on load; localStorage just remembers the last URL.
- **Sharing a configuration** is the headline benefit — paste a URL, recipient sees the exact same scenario.
- **Edit answers** button re-opens the wizard with current values; **Start over** link inside wizard resets.
- Splash is shown on first visit only (or after reset).

## Mobile

**Mobile-first, staged.** The app must work on a phone — most traffic will be link-shared from forums and group chats, hitting the app on mobile.

- Splash, wizard, KPI cards: mobile-first vertical layouts
- Tab UI sliders: stack one per row on mobile, columns ≥768px
- Locale + powertrain toggles collapse into a hamburger menu on mobile
- Chart swaps to the line+bar mobile composition below 768px
- Slider component reused as-is for v1; revisit if touch UX is genuinely bad

## Internationalization

- **v1 is English-only UI** with locale-aware numbers, currency, and units.
- Code structured *as if* i18n is coming: user-facing strings centralized so adding German is mechanical.
- German UI added in v1.1 if EU traffic warrants it.

## What survives from the current code

- Angular 20 standalone components, signals where useful, FormsModule + ngModel
- Chart.js + ng2-charts (chart definition rewrites for stacked-area)
- Tailwind utility classes, existing color palette and typography
- `SliderControl`, `KpiCard`, `InfoBadge` shared components — extended, not replaced
- `LeaseTab` — extended with TCO inputs section + lease-end section; financing math kept

## What gets scrapped or rebuilt

- Current "Lease Debt vs Vehicle Value" line chart — replaced by stacked-area TCO chart
- "Coming soon" placeholders for Finance and Cash tabs — built out as full tabs
- Tab UI shell — gets a wizard layered in front, splash before that, edit/reset header controls
- Single root component `app.ts` holding all state — refactored to support a state model that a wizard, three tabs, and URL-sync can all share

## Open assumptions to validate

1. **Lease math is identical US vs EU**, only labels differ. Worth verifying with a German lease example before locking in. German "Schlussrate" / balloon structures may behave differently from US closed-end leases.
2. **Browser-locale auto-detect** as the first-load default is right. Users on travel or with non-default browser locales may get the wrong locale; the visible toggle handles override.