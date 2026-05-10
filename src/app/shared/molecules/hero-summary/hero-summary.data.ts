import { financePayment } from '../../../scenario/calculations/financing';
import { fuelCostOverYears } from '../../../scenario/calculations/fuel';
import { maintenanceAt } from '../../../scenario/calculations/maintenance';
import { formatCompactCurrency, formatCurrency } from '../../../scenario/region.config';
import type { ScenarioStore } from '../../../scenario/scenario.store';

/** Translator function injected from the component layer. */
export type TFn = (key: string, params?: Record<string, unknown>) => string;

export interface BreakdownItem {
  label: string;
  amount: string;
  detail?: string;
}

export interface HeroData {
  outOfPocket: string;
  outOfPocketCaption: string;
  outOfPocketCaptionMobile: string;
  breakdown: BreakdownItem[];
  asset: string;
  assetCaption: string;
  assetCaptionMobile: string;
  retainsAsset: boolean;
}

function compactMoney(v: number, store: ScenarioStore): string {
  return formatCompactCurrency(v, store.formatContext());
}

interface RunningCosts {
  insurance: number;
  maintenance: number;
  fuel: number;
  total: number;
}

function runningCostsOverKeep(store: ScenarioStore): RunningCosts {
  const keep = store.keepDuration();
  const insurance = store.insurance() * keep;
  const ctx = store.maintenanceContext();
  const midAge = store.vehicleAge() + keep / 2;
  const maintenance = maintenanceAt(ctx, midAge) * keep;
  const fuel = fuelCostOverYears({
    efficiency: store.fuelEfficiency(),
    fuelPrice: store.fuelPrice(),
    annualMileage: store.annualMileage(),
    years: keep,
    powertrain: store.powertrain(),
    region: store.region(),
    chargerStatus: store.chargerStatus(),
    solar: store.solar(),
  });
  return { insurance, maintenance, fuel, total: insurance + maintenance + fuel };
}

function homeChargerInstall(store: ScenarioStore): number {
  if (store.powertrain() !== 'EV' || store.chargerStatus() !== 'buying') return 0;
  return store.regionConfig().defaultHomeChargerInstall;
}

function runningCostItems(
  rc: RunningCosts,
  fmt: (v: number) => string,
  store: ScenarioStore,
  t: TFn,
): BreakdownItem[] {
  return [
    { label: t('hero.line.insurance'), amount: fmt(rc.insurance) },
    { label: t('hero.line.maintenance'), amount: fmt(rc.maintenance) },
    {
      label: t(store.powertrain() === 'EV' ? 'hero.line.electricity' : 'hero.line.fuel'),
      amount: fmt(rc.fuel),
    },
  ];
}

// Short year-range captions explain when the cash actually flows out, not
// just the keep duration.
function captionYear1(t: TFn): { full: string; mobile: string } {
  return { full: t('hero.cap.year1'), mobile: t('hero.cap.year1Mobile') };
}
function captionYearRange(t: TFn, through: number): { full: string; mobile: string } {
  return {
    full: t('hero.cap.yearRange', { through }),
    mobile: t('hero.cap.yearRangeMobile', { through }),
  };
}

export function leaseHeroData(store: ScenarioStore, t: TFn): HeroData {
  const ctx = store.formatContext();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, ctx, 0);

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
    const leaseEndResidual = store.leaseEndResidual();
    const buyout = leaseEndResidual + store.buyoutFee() + earlyExit;

    items.push({ label: t('hero.line.downPayment', { count: 1 }), amount: fmt(initialDp) });
    items.push({
      label: t('hero.line.leasePayments'),
      amount: fmt(monthlySum),
      detail: t('hero.detail.monthlyTimes', {
        amount: fmt(monthlyLease),
        months: leasePeriod,
      }),
    });
    const buyoutDetailParts = [t('hero.detail.residual', { amount: fmt(leaseEndResidual) })];
    if (store.buyoutFee())
      buyoutDetailParts.push(t('hero.detail.fee', { amount: fmt(store.buyoutFee()) }));
    if (earlyExit > 0)
      buyoutDetailParts.push(t('hero.detail.earlyExit', { amount: fmt(earlyExit) }));
    items.push({
      label: t('hero.line.buyout'),
      amount: fmt(buyout),
      detail: buyoutDetailParts.join(' + '),
    });
    total = initialDp + monthlySum + buyout;
  } else {
    const cycles = Math.max(Math.ceil(keepMonths / term), 1);
    const downSum = cycles * initialDp;
    const monthlySum = monthlyLease * keepMonths;
    const handbackFee = store.dispositionFee() + store.excessWearEstimate();
    const handbackSum = cycles * handbackFee;

    items.push({
      label: t('hero.line.downPayment', { count: cycles }),
      amount: fmt(downSum),
      detail:
        cycles > 1
          ? t('hero.detail.cyclesTimes', { cycles, amount: fmt(initialDp) })
          : undefined,
    });
    items.push({
      label: t('hero.line.leasePayments'),
      amount: fmt(monthlySum),
      detail: t('hero.detail.monthlyTimes', {
        amount: fmt(monthlyLease),
        months: keepMonths,
      }),
    });
    items.push({
      label: t('hero.line.handbackFee', { count: cycles }),
      amount: fmt(handbackSum),
      detail:
        cycles > 1
          ? t('hero.detail.cyclesTimes', { cycles, amount: fmt(handbackFee) })
          : undefined,
    });
    total = downSum + monthlySum + handbackSum;
  }

  items.push(...runningCostItems(rc, fmt, store, t));
  total += rc.total;
  const charger = homeChargerInstall(store);
  if (charger > 0) {
    items.push({ label: t('hero.line.chargerInstall'), amount: fmt(charger) });
    total += charger;
  }

  const through = choice === 'buyOut' ? termYears : keep;
  const cap = captionYearRange(t, through);
  const asset = choice === 'buyOut' ? fmt(store.residualValue()) : fmt(0);
  const assetCaption =
    choice === 'buyOut'
      ? t('hero.assetCaption.afterYearsBoughtOut', { years: keep, term: termYears })
      : t('hero.assetCaption.afterYearsReturned', { years: keep });
  const assetCaptionMobile =
    choice === 'buyOut'
      ? t('hero.assetCaption.afterYearsBoughtOutMobile', { years: keep })
      : t('hero.assetCaption.afterYearsReturnedMobile', { years: keep });

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

export function financeHeroData(store: ScenarioStore, t: TFn): HeroData {
  const ctx = store.formatContext();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, ctx, 0);

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
  if (downSum > 0)
    items.push({ label: t('hero.line.downPayment', { count: 1 }), amount: fmt(downSum) });
  items.push({
    label: t('hero.line.loanPayments'),
    amount: fmt(monthlySum),
    detail: t('hero.detail.monthlyTimes', { amount: fmt(monthly), months: loanMonths }),
  });
  items.push(...runningCostItems(rc, fmt, store, t));
  const charger = homeChargerInstall(store);
  if (charger > 0) {
    items.push({ label: t('hero.line.chargerInstall'), amount: fmt(charger) });
  }

  const total = downSum + monthlySum + rc.total + charger;
  const cap =
    downSum > 0
      ? captionYear1(t)
      : captionYearRange(t, Math.max(Math.round(loanMonths / 12), 1));

  return {
    outOfPocket: fmt(total),
    outOfPocketCaption: cap.full,
    outOfPocketCaptionMobile: cap.mobile,
    breakdown: items,
    asset: fmt(store.residualValue()),
    assetCaption: t('hero.assetCaption.afterYears', { years: keep }),
    assetCaptionMobile: t('hero.assetCaption.afterYearsMobile', { years: keep }),
    retainsAsset: true,
  };
}

export function cashHeroData(store: ScenarioStore, t: TFn): HeroData {
  const ctx = store.formatContext();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, ctx, 0);

  const purchase = store.purchasePrice();
  const rc = runningCostsOverKeep(store);

  const items: BreakdownItem[] = [
    { label: t('hero.line.purchasePrice'), amount: fmt(purchase) },
    ...runningCostItems(rc, fmt, store, t),
  ];
  const charger = homeChargerInstall(store);
  if (charger > 0) {
    items.push({ label: t('hero.line.chargerInstall'), amount: fmt(charger) });
  }

  const total = purchase + rc.total + charger;
  const cap = captionYear1(t);

  return {
    outOfPocket: fmt(total),
    outOfPocketCaption: cap.full,
    outOfPocketCaptionMobile: cap.mobile,
    breakdown: items,
    asset: fmt(store.residualValue()),
    assetCaption: t('hero.assetCaption.afterYears', { years: keep }),
    assetCaptionMobile: t('hero.assetCaption.afterYearsMobile', { years: keep }),
    retainsAsset: true,
  };
}

// Suppress unused imports warning for compactMoney — it's a helper kept for
// callers that may want it. (Currently no external caller; left for parity.)
void compactMoney;
