# Use Cases

Five concrete user journeys that together exercise the meaningful branches of the design in [PRODUCT.md](./PRODUCT.md). Each one drives implementation order and maps to an end-to-end test.

---

## 1. First-time US visitor, new EV

**Persona:** 32-year-old in Austin, TX, considering a new Tesla Model 3.

**Goal:** Decide whether a 3-year lease is cheaper than financing once fuel savings and opportunity cost are counted.

**Flow:**
1. Lands on splash. Locale auto-detected as **US**. Clicks "Get started."
2. Wizard:
   - Keep-duration: **3 yr**
   - Mileage: **12,000 mi/yr**
   - Purchase price: **$42,000**
   - Residual value: **$25,000**
   - Down payment: **$5,000**
   - Vehicle age: **0 (new)**
3. Submits → tab recommendation: **Lease** ("Picked Lease because you plan to keep the car 3 years and drive 12k mi/yr").
4. On Lease tab, flips the **EV** toggle in the header. Fuel input flips to miles/kWh + $/kWh; maintenance default halves; home-charger install row appears (default $0).
5. End-of-lease section auto-set to **Hand back** (keep-duration = lease term).
6. Plays with the electricity-price slider ($0.12/kWh → $0.20/kWh) and watches the "Effective $/month" KPI move ~$15.
7. Switches to the Finance tab to compare — same TCO inputs carry over, only the financing math changes.

**Insight delivered:** Even with EV fuel savings, the down payment's opportunity cost lifts the *effective* monthly above the sticker lease payment — and the Finance tab shows similar effective $/mo despite a much larger headline payment.

---

## 2. EU user shopping a 4-year-old used VW Golf

**Persona:** 28-year-old in Munich looking at a 4-year-old used Golf for €15,000.

**Goal:** Confirm that buying a used car is actually cheaper over 5 years than buying new.

**Flow:**
1. Splash. Locale auto-detected as **EU** (€, km, comma decimals).
2. Wizard:
   - Keep-duration: **5 yr**
   - Mileage: **15,000 km/yr**
   - Purchase price: **€15,000**
   - Residual value: **€8,000**
   - Down payment: **€3,000**
   - Vehicle age: **4 yr**
3. App back-derives **MSRP ≈ €25,000** from age-4 depreciation curve. Categorizes as **Economy** (multipliers 1.0 / 1.0).
4. Tab recommendation: **Finance** ("Picked Finance because you plan to keep the car 5 years").
5. Insurance default = €15,000 × 4% = **€600/yr**. Maintenance default = €25,000 × 1.5% × age-factor (1 + 4×0.1 = 1.4) = **€525/yr**.
6. Lease tab labels read **"Leasingfaktor"** instead of "Money factor." Math underneath is identical.
7. User dials maintenance up to €800/yr (older car, conservative estimate). KPI cards update.

**Insight delivered:** Used car saves heavily on depreciation and financing, but maintenance is meaningfully higher than for a new car — the gap is real but smaller than the sticker-price difference suggests.

---

## 3. Cash-rich buyer testing opportunity cost

**Persona:** 45-year-old with $50k in savings, considering a $40,000 Toyota RAV4 (cash purchase looks like a no-brainer).

**Goal:** Verify that paying cash is actually optimal, or discover that financing wins once invested-cash returns are counted.

**Flow:**
1. US locale. Wizard:
   - Keep-duration: **7 yr**
   - Mileage: **10,000 mi/yr**
   - Purchase price: **$40,000**
   - Residual value: **$14,000**
   - Down payment / cash available: **$40,000**
   - Vehicle age: **0**
2. Tab recommendation: **Cash** ("Picked Cash because you have enough on hand to cover the purchase").
3. Cash tab shows opportunity-cost slider, default **5%**.
4. User drags the slider:
   - At **0%** → Cash total cost is the lowest of the three tabs (no financing, no opportunity cost).
   - At **5%** → opportunity-cost line on the stacked-area chart grows visibly; Cash and Finance now roughly tied.
   - At **8%** → opportunity-cost line dominates; Finance is meaningfully cheaper in effective $/mo.
5. Switches to Finance tab — APR 6%, sees that with their $40k invested at 8% they come out ahead.

**Insight delivered:** "Pay cash to avoid debt" stops being mathematically true once your expected investment return clears the loan APR — the app makes the crossover concrete and adjustable.

---

## 4. Lease then buy out at end

**Persona:** 38-year-old who wants the low monthly cash flow of a lease but plans to keep the car for 6 years.

**Goal:** Model the full 6-year cost of leasing for 36 months and then buying out the residual.

**Flow:**
1. Wizard:
   - Keep-duration: **6 yr**
   - Mileage: **10,000 mi/yr**
   - Purchase price: **$35,000**
   - Residual value: **$18,000**
   - Down payment: **$4,000**
   - Vehicle age: **0**
2. Tab recommendation: **Finance** (keep > 3 yr).
3. User overrides — clicks **Lease** tab to model what they actually want.
4. End-of-lease section auto-detects keep-duration (6 yr) > lease term (36 mo) → auto-selects **Buy out**. Buyout fee defaults to $300; buyout price = $18,000 (the residual).
5. Chart extends across all 72 months:
   - Months 0–36: lease payment + insurance + fuel + maintenance layers.
   - Month 36: visible step from the $18,300 buyout payment.
   - Months 36–72: no financing layer (cash buyout assumed); insurance + fuel + maintenance continue.
6. Switches to Finance tab to compare 6-year totals.

**Insight delivered:** Lease-then-buyout is meaningfully more expensive than straight financing because the lease's money-factor charge is paid on top of eventually owning the car — but the lower monthly cash flow in years 1–3 is real and visible on the chart.

---

## 5. Sharing a configuration

**Persona:** A user has just configured a thoughtful TCO scenario for the car they want and wants to discuss it with their spouse.

**Goal:** Send the exact scenario to a second person without screenshots or accounts.

**Flow:**
1. User has configured the Cash tab with their actual numbers ($42k EV, $22k residual, etc.).
2. Notices the URL has updated with all parameters: `/?tab=cash&price=42000&residual=22000&age=0&mileage=10000&keep=5&down=42000&powertrain=ev&locale=us&oppcost=0.05&...`
3. Copies the URL into a WhatsApp message.
4. Spouse opens the link on their phone:
   - Splash is **not** shown (URL has full state, not first-visit).
   - **Mobile layout** — KPI cards stack vertically, chart is the line + 100%-stacked-bar mobile composition.
   - Identical numbers to what the sender saw.
5. Spouse drags the maintenance slider higher to be conservative. Their URL now drifts from the sender's.
6. Spouse hits "Edit answers" to re-open the wizard with the current values pre-filled and tweak keep-duration.

**Insight delivered:** The URL is the configuration. A scenario travels as a single link — no signup, no save button, no "share" feature to build. Two people can converge on the right numbers by sharing URLs back and forth.

---

## Coverage map

| Branch from PRODUCT.md | Covered by |
|---|---|
| Splash → wizard → tab flow | UC1, UC2, UC3, UC4 |
| Locale auto-detect (US / EU) | UC1, UC2 |
| Powertrain toggle (ICE / EV) | UC1, UC5 |
| Tab recommendation logic — Lease / Finance / Cash | UC1, UC2, UC3 |
| User overriding tab recommendation | UC4 |
| MSRP back-derivation from age | UC2 |
| Vehicle category multipliers | UC2 |
| Lease-end: hand back vs. buy out | UC1 (hand back), UC4 (buy out) |
| Cash opportunity-cost line | UC3 |
| Stacked-area chart (desktop) | UC1, UC3, UC4 |
| Mobile chart composition | UC5 |
| URL hash sharing | UC5 |
| Edit-answers flow | UC5 |
| Effective $/month as cross-tab comparison | UC1, UC3 |