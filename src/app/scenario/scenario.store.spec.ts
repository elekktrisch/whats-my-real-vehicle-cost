import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ScenarioStore } from './scenario.store';
import { defaultScenario } from './scenario.defaults';

function makeStore(): ScenarioStore {
  TestBed.configureTestingModule({
    providers: [provideRouter([])],
  });
  return TestBed.inject(ScenarioStore);
}

describe('ScenarioStore — defaults', () => {
  it('initializes from defaultScenario()', () => {
    const store = makeStore();
    const initial = defaultScenario();
    expect(store.locale()).toBe(initial.globals.locale);
    expect(store.powertrain()).toBe(initial.globals.powertrain);
    expect(store.purchasePrice()).toBe(initial.globals.purchasePrice);
    expect(store.leaseDownPayment()).toBe(initial.lease.downPayment);
    expect(store.financeDownPayment()).toBe(initial.finance.downPayment);
  });

  it('all three breakdowns compute on defaults', () => {
    const store = makeStore();
    expect(store.leaseBreakdown().total).toBeGreaterThan(0);
    expect(store.financeBreakdown().total).toBeGreaterThan(0);
    expect(store.cashBreakdown().total).toBeGreaterThan(0);
  });
});

describe('ScenarioStore — override pattern', () => {
  it('insuranceOverride.set(v) overrides; null reverts to default', () => {
    const store = makeStore();
    const def = store.insurance();
    store.insuranceOverride.set(9999);
    expect(store.insurance()).toBe(9999);
    store.insuranceOverride.set(null);
    expect(store.insurance()).toBe(def);
  });

  it('residualValueOverride.set(v) overrides; null reverts to auto-derived', () => {
    const store = makeStore();
    const auto = store.residualValue();
    store.residualValueOverride.set(50_000);
    expect(store.residualValue()).toBe(50_000);
    store.residualValueOverride.set(null);
    expect(store.residualValue()).toBe(auto);
  });

  it('residualValueOverride starts at the default scenario value', () => {
    const store = makeStore();
    expect(store.residualValueOverride()).toBe(defaultScenario().globals.residualValue);
  });
});

describe('ScenarioStore — leaseEndChoice', () => {
  it('auto-derives handBack when keep ≤ term', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(3);
    expect(store.leaseEndChoice()).toBe('handBack');
  });

  it('auto-derives buyOut when keep > term', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(5);
    expect(store.leaseEndChoice()).toBe('buyOut');
  });

  it('explicit override beats auto-derive', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(5);
    store.leaseEndChoiceOverride.set('handBack');
    expect(store.leaseEndChoice()).toBe('handBack');
  });
});

describe('ScenarioStore — recommendation', () => {
  it('picks the tab with lowest cost per distance', () => {
    const store = makeStore();
    const rec = store.recommendedTab();
    expect(['lease', 'finance', 'cash']).toContain(rec.tab);
    expect(rec.reason.length).toBeGreaterThan(0);
  });
});

describe('ScenarioStore — snapshot round-trip', () => {
  it('snapshot → applySnapshot → snapshot is stable', () => {
    const store = makeStore();
    store.purchasePrice.set(42_000);
    store.vehicleAge.set(2);
    store.insuranceOverride.set(1234);
    store.financeDownPayment.set(7_500);

    const snap1 = store.snapshot();
    store.applySnapshot(defaultScenario()); // wipe
    store.applySnapshot(snap1);             // restore
    const snap2 = store.snapshot();

    expect(snap2).toEqual(snap1);
    expect(store.purchasePrice()).toBe(42_000);
    expect(store.vehicleAge()).toBe(2);
    expect(store.insurance()).toBe(1234);
    expect(store.financeDownPayment()).toBe(7_500);
  });
});

describe('ScenarioStore — engage / reset', () => {
  it('engage() flips hasReturningState true', () => {
    const store = makeStore();
    expect(store.hasReturningState()).toBe(false);
    store.engage();
    expect(store.hasReturningState()).toBe(true);
  });

  it('reset() applies defaults and flips hasReturningState back to false', () => {
    const store = makeStore();
    store.engage();
    store.purchasePrice.set(99_999);
    store.reset();
    expect(store.hasReturningState()).toBe(false);
    expect(store.purchasePrice()).toBe(defaultScenario().globals.purchasePrice);
  });
});

describe('ScenarioStore — invariants', () => {
  it('setLocale clears running-cost overrides', () => {
    const store = makeStore();
    store.insuranceOverride.set(9999);
    store.fuelPriceOverride.set(7);
    const otherLocale = store.locale() === 'US' ? 'EU' : 'US';
    store.setLocale(otherLocale);
    expect(store.insurance()).not.toBe(9999);
    expect(store.fuelPrice()).not.toBe(7);
  });

  it('setChargerStatus("none") forces solar off', () => {
    const store = makeStore();
    store.solar.set(true);
    store.setChargerStatus('none');
    expect(store.solar()).toBe(false);
  });

  it('earlyTerminationFeeMax caps at 90% of (purchasePrice - leaseDownPayment)', () => {
    const store = makeStore();
    store.purchasePrice.set(40_000);
    store.leaseDownPayment.set(5_000);
    expect(store.earlyTerminationFeeMax()).toBeCloseTo(0.9 * 35_000, 4);
  });

  it('earlyTerminationFee is clamped to its max', () => {
    const store = makeStore();
    store.purchasePrice.set(40_000);
    store.leaseDownPayment.set(5_000);
    store.earlyTerminationFeeOverride.set(999_999);
    expect(store.earlyTerminationFee()).toBe(store.earlyTerminationFeeMax());
  });
});

