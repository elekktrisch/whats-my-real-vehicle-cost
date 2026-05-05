import { financePayment } from '../../../scenario/calculations/financing';
import { formatCurrency } from '../../../scenario/locale.config';
import type { ScenarioStore } from '../../../scenario/scenario.store';

export interface HeroData {
  /** Total non-recurring cash out across all events: every lease-cycle
   * down payment, plus the buyout in lease-buyout mode, plus the loan/cash
   * down payment. The "lump sums" the user has to write checks for. */
  down: string;
  /** Sub-line under `down` explaining what's in the sum. */
  downCaption: string;
  /** null for cash (no recurring payment). */
  monthly: string | null;
  /** Months the recurring payment runs for. Cash → 0. */
  termMonths: number;
  asset: string;
  assetCaption: string;
}

export function leaseHeroData(store: ScenarioStore): HeroData {
  const locale = store.locale();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, locale, 0);

  const lease = store.leasePaymentDetails();
  const monthly = lease.depreciationFee + lease.financeFee;
  const choice = store.leaseEndChoice();
  const term = store.leaseTerm();
  const termYears = Math.round(term / 12);
  const keepMonths = Math.max(keep * 12, 1);
  const initialDp = store.leaseDownPayment();

  let totalUpfront: number;
  let downCaption: string;
  if (choice === 'buyOut') {
    const earlyExit = keepMonths < term ? store.earlyTerminationFee() : 0;
    const buyout = store.residualValue() + store.buyoutFee() + earlyExit;
    totalUpfront = initialDp + buyout;
    downCaption =
      earlyExit > 0
        ? `${fmt(initialDp)} down + ${fmt(buyout)} buyout (incl. early-exit penalty)`
        : `${fmt(initialDp)} down + ${fmt(buyout)} buyout`;
  } else {
    // Final partial cycle is modeled as the user signing a shorter last lease,
    // so ceil(keep/term) is the number of cycles incl. that partial one.
    const cycles = Math.max(Math.ceil(keepMonths / term), 1);
    totalUpfront = cycles * initialDp;
    downCaption =
      cycles > 1
        ? `${cycles} × ${fmt(initialDp)} downpayment (one per cycle)`
        : 'initial downpayment';
  }

  return {
    down: fmt(totalUpfront),
    downCaption,
    monthly: fmt(monthly),
    termMonths: term,
    // residualValue() is already evaluated at vehicleAge + keepDuration, which
    // covers both the buyout-then-own tail and additional renew cycles.
    asset: choice === 'buyOut' ? fmt(store.residualValue()) : fmt(0),
    assetCaption:
      choice === 'buyOut'
        ? `after ${keep} years (bought out at year ${termYears})`
        : `after ${keep} years (vehicle returned)`,
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

  return {
    down: fmt(store.financeDownPayment()),
    downCaption: 'initial downpayment',
    monthly: fmt(monthly),
    termMonths: store.loanTerm(),
    asset: fmt(store.residualValue()),
    assetCaption: `after ${keep} years`,
  };
}

export function cashHeroData(store: ScenarioStore): HeroData {
  const locale = store.locale();
  const keep = store.keepDuration();
  const fmt = (v: number) => formatCurrency(v, locale, 0);

  return {
    down: fmt(store.purchasePrice()),
    downCaption: 'full purchase price',
    monthly: fmt(0),
    termMonths: 0,
    asset: fmt(store.residualValue()),
    assetCaption: `after ${keep} years`,
  };
}
