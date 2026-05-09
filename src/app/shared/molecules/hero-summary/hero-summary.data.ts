import { financePayment } from '../../../scenario/calculations/financing';
import { fuelCostOverYears } from '../../../scenario/calculations/fuel';
import { formatCompactCurrency, formatCurrency } from '../../../scenario/locale.config';
import type { ScenarioStore } from '../../../scenario/scenario.store';

export interface BreakdownItem {
  label: string;
  // Pre-formatted currency.
  amount: string;
  // Optional sub-text under the label, e.g. "$450 × 36 mo" or "3 × $5,000".
  detail?: string;
}

export interface HeroData {
  // Big headline number — total cash-out over the keep duration. Sums every
  // check the user writes: down payments, monthly lease/loan payments, handback
  // fees, buyout, plus running costs (insurance + maintenance + fuel).
  outOfPocket: string;
  outOfPocketCaption: string;
  outOfPocketCaptionMobile: string;
  // Per-line breakdown shown in the [+ Details] disclosure.
  breakdown: BreakdownItem[];
  // Asset side
  asset: string;
  assetCaption: string;
  assetCaptionMobile: string;
  // false on lease-renew (vehicle returned, asset value = 0); drives the
  // dimmed car.png treatment.
  retainsAsset: boolean;
}

// Compact-currency helper for mobile captions. Sub-1000 values render as
// whole numbers here (hero never shows cents); the money pipe uses the
// 2-decimal variant for templates.
function compactMoney(v: number, store: ScenarioStore): string {
  return formatCompactCurrency(v, store.locale());
}

interface RunningCosts {
  insurance: number;
  maintenance: number;
  fuel: number;
  total: number;
}

// Insurance + maintenance + fuel totals over the keep horizon. Calls into the
// existing fuel calc rather than reading from `store.<mode>Breakdown()` so we
// can be honest about "this is fuel cost during the years you actually drive
// the car" without picking up depreciation/opportunity-cost layers that are
// in the breakdown but aren't cash flows.
function runningCostsOverKeep(store: ScenarioStore): RunningCosts {
  const keep = store.keepDuration();
  const insurance = store.insurance() * keep;
  const maintenance = store.maintenance() * keep;
  const fuel = fuelCostOverYears({
    efficiency: store.fuelEfficiency(),
    fuelPrice: store.fuelPrice(),
    annualMileage: store.annualMileage(),
    years: keep,
    powertrain: store.powertrain(),
    locale: store.locale(),
    chargerStatus: store.chargerStatus(),
    solar: store.solar(),
  });
  return { insurance, maintenance, fuel, total: insurance + maintenance + fuel };
}

// One-time home-charger install (EV + buying). The chart buckets this under
// maintenance at month 0; in the hero we surface it as its own line so the
// user can see exactly where the charger cost lands.
function homeChargerInstall(store: ScenarioStore): number {
  if (store.powertrain() !== 'EV' || store.chargerStatus() !== 'buying') return 0;
  return store.localeConfig().defaultHomeChargerInstall;
}

function runningCostItems(
  rc: RunningCosts,
  fmt: (v: number) => string,
  store: ScenarioStore,
): BreakdownItem[] {
  return [
    { label: 'Insurance', amount: fmt(rc.insurance) },
    { label: 'Maintenance', amount: fmt(rc.maintenance) },
    {
      label: store.powertrain() === 'EV' ? 'Electricity' : 'Fuel',
      amount: fmt(rc.fuel),
    },
  ];
}

// Short year-range captions explain when the cash actually flows out, not
// just the keep duration. Format: "year N" / "yrs 1-N" so the caption fits
// in the hero column on mobile.
function captionYear1(): { full: string; mobile: string } {
  return { full: 'mainly year 1', mobile: 'yr 1' };
}
function captionYearRange(through: number): { full: string; mobile: string } {
  return { full: `mainly years 1-${through}`, mobile: `yrs 1-${through}` };
}

export function leaseHeroData(store: ScenarioStore): HeroData {
  const locale = store.locale();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, locale, 0);

  const lease = store.leasePaymentDetails();
  const monthlyLease = lease.depreciationFee + lease.financeFee;
  const choice = store.leaseEndChoice();
  const term = store.leaseTerm();
  const termYears = Math.round(term / 12);
  const keepMonths = Math.max(keep * 12, 1);
  const initialDp = store.leaseDownPayment();
  const rc = runningCostsOverKeep(store);

  const items: BreakdownItem[] = [];
  let total = 0;

  if (choice === 'buyOut') {
    const leasePeriod = Math.min(term, keepMonths);
    const monthlySum = monthlyLease * leasePeriod;
    const earlyExit = keepMonths < term ? store.earlyTerminationFee() : 0;
    // Buyout uses the lease-END residual (price at month=term), NOT the
    // end-of-keep residual (which drives the asset display + owned-tail
    // depreciation).
    const leaseEndResidual = store.leaseEndResidual();
    const buyout = leaseEndResidual + store.buyoutFee() + earlyExit;

    items.push({ label: 'Down payment', amount: fmt(initialDp) });
    items.push({
      label: 'Lease payments',
      amount: fmt(monthlySum),
      detail: `${fmt(monthlyLease)} × ${leasePeriod} mo`,
    });
    const buyoutDetailParts = [`${fmt(leaseEndResidual)} residual`];
    if (store.buyoutFee()) buyoutDetailParts.push(`${fmt(store.buyoutFee())} fee`);
    if (earlyExit > 0) buyoutDetailParts.push(`${fmt(earlyExit)} early-exit`);
    items.push({
      label: 'Buyout',
      amount: fmt(buyout),
      detail: buyoutDetailParts.join(' + '),
    });
    total = initialDp + monthlySum + buyout;
  } else {
    // Renew lease — N cycles, each a fresh down + handback at boundary.
    const cycles = Math.max(Math.ceil(keepMonths / term), 1);
    const downSum = cycles * initialDp;
    const monthlySum = monthlyLease * keepMonths;
    const handbackFee = store.dispositionFee() + store.excessWearEstimate();
    const handbackSum = cycles * handbackFee;

    items.push({
      label: cycles > 1 ? 'Down payments' : 'Down payment',
      amount: fmt(downSum),
      detail: cycles > 1 ? `${cycles} × ${fmt(initialDp)}` : undefined,
    });
    items.push({
      label: 'Lease payments',
      amount: fmt(monthlySum),
      detail: `${fmt(monthlyLease)} × ${keepMonths} mo`,
    });
    items.push({
      label: cycles > 1 ? 'Handback fees' : 'Handback fee',
      amount: fmt(handbackSum),
      detail: cycles > 1 ? `${cycles} × ${fmt(handbackFee)}` : undefined,
    });
    total = downSum + monthlySum + handbackSum;
  }

  items.push(...runningCostItems(rc, fmt, store));
  total += rc.total;
  const charger = homeChargerInstall(store);
  if (charger > 0) {
    items.push({ label: 'Home charger install', amount: fmt(charger) });
    total += charger;
  }

  // Lease pays through the lease term (buyout) or the entire keep (renew —
  // monthly + cycle spikes throughout).
  const through = choice === 'buyOut' ? termYears : keep;
  const cap = captionYearRange(through);
  const asset = choice === 'buyOut' ? fmt(store.residualValue()) : fmt(0);
  const assetCaption =
    choice === 'buyOut'
      ? `after ${keep} years (bought out at year ${termYears})`
      : `after ${keep} years (vehicle returned)`;
  const assetCaptionMobile =
    choice === 'buyOut' ? `after ${keep} yr · bought out` : `after ${keep} yr · returned`;

  return {
    outOfPocket: fmt(total),
    outOfPocketCaption: cap.full,
    outOfPocketCaptionMobile: cap.mobile,
    breakdown: items,
    asset,
    assetCaption,
    assetCaptionMobile,
    retainsAsset: choice === 'buyOut',
  };
}

export function financeHeroData(store: ScenarioStore): HeroData {
  const locale = store.locale();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, locale, 0);

  const principal = Math.max(store.purchasePrice() - store.financeDownPayment(), 0);
  const monthly = financePayment({
    principal,
    apr: store.financeApr(),
    termMonths: store.loanTerm(),
  });
  const keepMonths = Math.max(keep * 12, 1);
  const loanMonths = Math.min(store.loanTerm(), keepMonths);
  const monthlySum = monthly * loanMonths;
  const downSum = store.financeDownPayment();
  const rc = runningCostsOverKeep(store);

  const items: BreakdownItem[] = [];
  if (downSum > 0) items.push({ label: 'Down payment', amount: fmt(downSum) });
  items.push({
    label: 'Loan payments',
    amount: fmt(monthlySum),
    detail: `${fmt(monthly)} × ${loanMonths} mo`,
  });
  items.push(...runningCostItems(rc, fmt, store));
  const charger = homeChargerInstall(store);
  if (charger > 0) {
    items.push({ label: 'Home charger install', amount: fmt(charger) });
  }

  const total = downSum + monthlySum + rc.total + charger;
  // With a non-zero down payment, year 1 = down + 12 monthlies, materially
  // larger than years 2..N. Pure-loan (no down) is a flat stretch.
  const cap =
    downSum > 0
      ? captionYear1()
      : captionYearRange(Math.max(Math.round(loanMonths / 12), 1));

  return {
    outOfPocket: fmt(total),
    outOfPocketCaption: cap.full,
    outOfPocketCaptionMobile: cap.mobile,
    breakdown: items,
    asset: fmt(store.residualValue()),
    assetCaption: `after ${keep} years`,
    assetCaptionMobile: `after ${keep} yr`,
    retainsAsset: true,
  };
}

export function cashHeroData(store: ScenarioStore): HeroData {
  const locale = store.locale();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, locale, 0);

  const purchase = store.purchasePrice();
  const rc = runningCostsOverKeep(store);

  const items: BreakdownItem[] = [
    { label: 'Purchase price', amount: fmt(purchase) },
    ...runningCostItems(rc, fmt, store),
  ];
  const charger = homeChargerInstall(store);
  if (charger > 0) {
    items.push({ label: 'Home charger install', amount: fmt(charger) });
  }

  const total = purchase + rc.total + charger;
  // Cash spends nearly everything in year 1 — running costs spread out
  // but the purchase price spike dominates the cash-out timing.
  const cap = captionYear1();

  return {
    outOfPocket: fmt(total),
    outOfPocketCaption: cap.full,
    outOfPocketCaptionMobile: cap.mobile,
    breakdown: items,
    asset: fmt(store.residualValue()),
    assetCaption: `after ${keep} years`,
    assetCaptionMobile: `after ${keep} yr`,
    retainsAsset: true,
  };
}
