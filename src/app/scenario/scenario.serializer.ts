import type {
  CashInputs,
  FinanceInputs,
  Globals,
  LeaseEndChoice,
  LeaseInputs,
  Locale,
  Powertrain,
  ScenarioSnapshot,
  Tab,
  TcoOverrides,
} from './scenario.types';

export const STORAGE_KEY = 'whatsmycost.v1';

/**
 * URL key choices: short but readable. activeTab is intentionally NOT serialized
 * to query params — it lives in the route path (`/lease | /finance | /cash`).
 */
function n(s: string | null | undefined): number | undefined {
  if (s === null || s === undefined || s === '') return undefined;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : undefined;
}

function i(s: string | null | undefined): number | undefined {
  const v = n(s);
  return v === undefined ? undefined : Math.round(v);
}

function setNum(q: Record<string, string>, key: string, v: number): void {
  q[key] = String(v);
}

function setOpt(q: Record<string, string>, key: string, v: number | null): void {
  if (v !== null) q[key] = String(v);
}

export function toQueryParams(snap: ScenarioSnapshot): Record<string, string> {
  const q: Record<string, string> = {};
  const g = snap.globals;
  q['l'] = g.locale;
  q['p'] = g.powertrain;
  setNum(q, 'price', g.purchasePrice);
  setNum(q, 'residual', g.residualValue);
  setNum(q, 'age', g.vehicleAge);
  setNum(q, 'mileage', g.annualMileage);
  setNum(q, 'keep', g.keepDuration);

  setNum(q, 'leaseApr', snap.lease.apr);
  setNum(q, 'leaseTerm', snap.lease.leaseTerm);
  setNum(q, 'leaseDown', snap.lease.downPayment);
  if (snap.lease.leaseEndChoice) q['leaseEnd'] = snap.lease.leaseEndChoice;
  setOpt(q, 'disp', snap.lease.dispositionFee);
  setOpt(q, 'milRate', snap.lease.mileageOverageRate);
  setOpt(q, 'wear', snap.lease.excessWearEstimate);
  setOpt(q, 'bo', snap.lease.buyoutFee);
  setOpt(q, 'etf', snap.lease.earlyTerminationFee);

  setNum(q, 'finApr', snap.finance.apr);
  setNum(q, 'loan', snap.finance.loanTerm);
  setNum(q, 'finDown', snap.finance.downPayment);
  setNum(q, 'opp', snap.cash.opportunityCostRate);

  setOpt(q, 'ins', snap.overrides.insurance);
  setOpt(q, 'maint', snap.overrides.maintenance);
  setOpt(q, 'eff', snap.overrides.fuelEfficiency);
  setOpt(q, 'fuel', snap.overrides.fuelPrice);
  setOpt(q, 'charger', snap.overrides.homeChargerInstall);

  return q;
}

export function fromQueryParams(params: URLSearchParams): Partial<ScenarioSnapshot> {
  const snap: Partial<ScenarioSnapshot> = {};

  const globals: Partial<Globals> = {};
  const l = params.get('l');
  if (l === 'US' || l === 'EU') globals.locale = l;
  const p = params.get('p');
  if (p === 'ICE' || p === 'EV') globals.powertrain = p;
  const purchasePrice = n(params.get('price'));
  if (purchasePrice !== undefined) globals.purchasePrice = purchasePrice;
  const residualValue = n(params.get('residual'));
  if (residualValue !== undefined) globals.residualValue = residualValue;
  const vehicleAge = i(params.get('age'));
  if (vehicleAge !== undefined) globals.vehicleAge = vehicleAge;
  const annualMileage = n(params.get('mileage'));
  if (annualMileage !== undefined) globals.annualMileage = annualMileage;
  const keepDuration = n(params.get('keep'));
  if (keepDuration !== undefined) globals.keepDuration = keepDuration;
  if (Object.keys(globals).length > 0) snap.globals = globals as Globals;

  const lease: Partial<LeaseInputs> = {};
  const leaseApr = n(params.get('leaseApr'));
  if (leaseApr !== undefined) lease.apr = leaseApr;
  const leaseTerm = i(params.get('leaseTerm'));
  if (leaseTerm !== undefined) lease.leaseTerm = leaseTerm;
  const leaseDown = n(params.get('leaseDown'));
  if (leaseDown !== undefined) lease.downPayment = leaseDown;
  const leaseEnd = params.get('leaseEnd');
  if (leaseEnd === 'handBack' || leaseEnd === 'buyOut')
    lease.leaseEndChoice = leaseEnd as LeaseEndChoice;
  const disp = n(params.get('disp'));
  if (disp !== undefined) lease.dispositionFee = disp;
  const milRate = n(params.get('milRate'));
  if (milRate !== undefined) lease.mileageOverageRate = milRate;
  const wear = n(params.get('wear'));
  if (wear !== undefined) lease.excessWearEstimate = wear;
  const bo = n(params.get('bo'));
  if (bo !== undefined) lease.buyoutFee = bo;
  const etf = n(params.get('etf'));
  if (etf !== undefined) lease.earlyTerminationFee = etf;
  if (Object.keys(lease).length > 0) snap.lease = lease as LeaseInputs;

  const finance: Partial<FinanceInputs> = {};
  const finApr = n(params.get('finApr'));
  if (finApr !== undefined) finance.apr = finApr;
  const loan = i(params.get('loan'));
  if (loan !== undefined) finance.loanTerm = loan;
  const finDown = n(params.get('finDown'));
  if (finDown !== undefined) finance.downPayment = finDown;
  if (Object.keys(finance).length > 0) snap.finance = finance as FinanceInputs;

  const cash: Partial<CashInputs> = {};
  const opp = n(params.get('opp'));
  if (opp !== undefined) cash.opportunityCostRate = opp;
  if (Object.keys(cash).length > 0) snap.cash = cash as CashInputs;

  const overrides: Partial<TcoOverrides> = {};
  const ins = n(params.get('ins'));
  if (ins !== undefined) overrides.insurance = ins;
  const maint = n(params.get('maint'));
  if (maint !== undefined) overrides.maintenance = maint;
  const eff = n(params.get('eff'));
  if (eff !== undefined) overrides.fuelEfficiency = eff;
  const fuel = n(params.get('fuel'));
  if (fuel !== undefined) overrides.fuelPrice = fuel;
  const charger = n(params.get('charger'));
  if (charger !== undefined) overrides.homeChargerInstall = charger;
  if (Object.keys(overrides).length > 0) snap.overrides = overrides as TcoOverrides;

  return snap;
}

/** localStorage round-trip uses straight JSON — includes activeTab. */
export function toLocalStorage(snap: ScenarioSnapshot): string {
  return JSON.stringify(snap);
}

export function fromLocalStorage(raw: string | null): Partial<ScenarioSnapshot> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<ScenarioSnapshot>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function tabFromPath(pathname: string): Tab | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg === 'lease' || seg === 'finance' || seg === 'cash') return seg;
  return null;
}

/** Did the URL or localStorage carry any user-set state? Used by SplashPage skip rule. */
export function hasAnyParams(query: URLSearchParams, lsRaw: string | null): boolean {
  if (lsRaw && lsRaw.length > 0) return true;
  for (const _ of query.keys()) return true;
  return false;
}

export type { Powertrain, Locale };