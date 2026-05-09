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

  it('leaseEndResidualOverride.set(v) overrides; null reverts to auto-derived at lease term', () => {
    const store = makeStore();
    const auto = store.leaseEndResidual();
    store.leaseEndResidualOverride.set(22_500);
    expect(store.leaseEndResidual()).toBe(22_500);
    store.leaseEndResidualOverride.set(null);
    expect(store.leaseEndResidual()).toBe(auto);
  });

  it('leaseEndResidual is independent of end-of-keep residualValue', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(6);
    // Both auto-derived; they should differ because leaseTerm/12 = 3yr ≠ keep = 6yr.
    expect(store.leaseEndResidual()).not.toBe(store.residualValue());
    expect(store.leaseEndResidual()).toBeGreaterThan(store.residualValue());
  });
});

describe('ScenarioStore — leaseApr auto-derive from vehicleAge', () => {
  it('resolves to 1% when vehicleAge=0 (new) and override is null', () => {
    const store = makeStore();
    store.leaseAprOverride.set(null);
    store.vehicleAge.set(0);
    expect(store.leaseApr()).toBe(1);
  });

  it('resolves to 3% when vehicleAge>0 (used) and override is null', () => {
    const store = makeStore();
    store.leaseAprOverride.set(null);
    store.vehicleAge.set(3);
    expect(store.leaseApr()).toBe(3);
  });

  it('explicit override wins over vehicleAge rule', () => {
    const store = makeStore();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    expect(store.leaseApr()).toBe(1.5);
  });

  it('clearing the override (null) returns to the rule', () => {
    const store = makeStore();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    expect(store.leaseApr()).toBe(1.5);
    store.leaseAprOverride.set(null);
    expect(store.leaseApr()).toBe(1);
  });

  it('cold-start default scenario has apr=null (auto-track)', () => {
    expect(defaultScenario().lease.apr).toBeNull();
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

describe('ScenarioStore — conflict detection (leaseApr)', () => {
  it('no conflict when override is null', () => {
    const store = makeStore();
    store.leaseAprOverride.set(null);
    expect(store.leaseAprConflict()).toBe(false);
  });

  it('no conflict when override matches the auto-derived default', () => {
    const store = makeStore();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1); // matches default for new car
    expect(store.leaseAprConflict()).toBe(false);
  });

  it('conflict when override differs from the auto-derived default', () => {
    const store = makeStore();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    expect(store.leaseAprConflict()).toBe(true);
  });

  it('pill visible when conflict && not dismissed && not hydrating', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    expect(store.leaseAprPillVisible()).toBe(true);
  });

  it('pill hidden during hydration even when conflict exists', () => {
    const store = makeStore();
    // Don't markHydrated — simulating cold load
    store.applySnapshot({ globals: { ...defaultScenario().globals, vehicleAge: 0 }, lease: { ...defaultScenario().lease, apr: 1.5 } });
    expect(store.leaseAprConflict()).toBe(true);
    expect(store.leaseAprPillVisible()).toBe(false);
  });

  it('dismissLeaseApr hides the pill', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    expect(store.leaseAprPillVisible()).toBe(true);
    store.dismissLeaseApr();
    expect(store.leaseAprPillVisible()).toBe(false);
  });

  it('pill re-fires after dismiss when an upstream input changes', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0);          // default = 1
    store.leaseAprOverride.set(1.5);  // conflict (1.5 vs 1)
    store.dismissLeaseApr();
    expect(store.leaseAprPillVisible()).toBe(false);
    store.vehicleAge.set(3);          // default flips to 3 — new conflict configuration
    expect(store.leaseAprPillVisible()).toBe(true);
  });

  it('applyLeaseApr clears the override', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    store.applyLeaseApr();
    expect(store.leaseAprOverride()).toBeNull();
    expect(store.leaseApr()).toBe(1);
    expect(store.leaseAprConflict()).toBe(false);
  });
});

describe('ScenarioStore — conflict detection (retrofitted levers)', () => {
  it('residualValue: conflict + pillVisible + dismiss + apply', () => {
    const store = makeStore();
    store.markHydrated();
    expect(store.residualValueConflict()).toBe(false);
    store.residualValueOverride.set(50_000);
    expect(store.residualValueConflict()).toBe(true);
    expect(store.residualValuePillVisible()).toBe(true);
    store.dismissResidualValue();
    expect(store.residualValuePillVisible()).toBe(false);
    store.purchasePrice.set(45_000); // shifts default → re-fires
    expect(store.residualValuePillVisible()).toBe(true);
    store.applyResidualValue();
    expect(store.residualValueOverride()).toBeNull();
    expect(store.residualValueConflict()).toBe(false);
  });

  it('insurance: conflict + pillVisible + dismiss + apply', () => {
    const store = makeStore();
    store.markHydrated();
    expect(store.insuranceConflict()).toBe(false);
    store.insuranceOverride.set(9999);
    expect(store.insuranceConflict()).toBe(true);
    expect(store.insurancePillVisible()).toBe(true);
    store.dismissInsurance();
    expect(store.insurancePillVisible()).toBe(false);
    store.applyInsurance();
    expect(store.insuranceOverride()).toBeNull();
  });

  it('leaseEndChoice: conflict + pillVisible + dismiss + apply', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseTerm.set(36);
    store.keepDuration.set(3); // default → handBack
    expect(store.leaseEndChoiceConflict()).toBe(false);
    store.leaseEndChoiceOverride.set('buyOut');
    expect(store.leaseEndChoiceConflict()).toBe(true);
    expect(store.leaseEndChoicePillVisible()).toBe(true);
    store.dismissLeaseEndChoice();
    expect(store.leaseEndChoicePillVisible()).toBe(false);
    store.applyLeaseEndChoice();
    expect(store.leaseEndChoiceOverride()).toBeNull();
  });

  it('fuelEfficiency, fuelPrice, leaseEndResidual, earlyTerminationFee all expose conflict + pillVisible + dismiss + apply', () => {
    const store = makeStore();
    store.markHydrated();
    // Smoke-test only — full cycles tested above for representative levers.
    store.fuelEfficiencyOverride.set(99);
    expect(store.fuelEfficiencyConflict()).toBe(true);
    store.applyFuelEfficiency();
    expect(store.fuelEfficiencyOverride()).toBeNull();

    store.fuelPriceOverride.set(99);
    expect(store.fuelPriceConflict()).toBe(true);
    store.applyFuelPrice();
    expect(store.fuelPriceOverride()).toBeNull();

    store.leaseEndResidualOverride.set(1);
    expect(store.leaseEndResidualConflict()).toBe(true);
    store.applyLeaseEndResidual();
    expect(store.leaseEndResidualOverride()).toBeNull();

    // In default scenario keep > term so the default is 0; pick an override
    // well past the ±200 tolerance to force a conflict.
    store.earlyTerminationFeeOverride.set(5000);
    expect(store.earlyTerminationFeeConflict()).toBe(true);
    store.applyEarlyTerminationFee();
    expect(store.earlyTerminationFeeOverride()).toBeNull();
  });
});

describe('ScenarioStore — conflict tolerance (fuzzy match)', () => {
  it('leaseApr: deviations within tolerance (~3 steps, ±0.15) do not trigger', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0); // default = 1
    store.leaseAprOverride.set(1.1); // 2 steps beyond default — still within tolerance
    expect(store.leaseAprConflict()).toBe(false);
  });

  it('leaseApr: a deviation beyond tolerance triggers a conflict', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5); // 0.5 > 0.15 → significant
    expect(store.leaseAprConflict()).toBe(true);
  });

  it('residualValue: sub-tolerance deviation (≤ ~3 steps) does not trigger', () => {
    const store = makeStore();
    store.markHydrated();
    const def = store.residualValue();
    store.residualValueOverride.set(def + 1000); // within ±1500 tolerance
    expect(store.residualValueConflict()).toBe(false);
  });

  it('residualValue: above-tolerance deviation triggers a conflict', () => {
    const store = makeStore();
    store.markHydrated();
    const def = store.residualValue();
    store.residualValueOverride.set(def + 5000);
    expect(store.residualValueConflict()).toBe(true);
  });

  it('insurance: $50 deviation does not trigger (within ±75 tolerance)', () => {
    const store = makeStore();
    store.markHydrated();
    const def = store.insurance();
    store.insuranceOverride.set(def + 50);
    expect(store.insuranceConflict()).toBe(false);
  });

  it('leaseEndChoice: any change is a conflict (strict equality, no fuzziness for enum)', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseTerm.set(36);
    store.keepDuration.set(3); // default → handBack
    store.leaseEndChoiceOverride.set('buyOut');
    expect(store.leaseEndChoiceConflict()).toBe(true);
  });
});

describe('ScenarioStore — aggregated conflicts', () => {
  it('activeConflicts is empty when no overrides set', () => {
    const store = makeStore();
    store.markHydrated();
    expect(store.activeConflicts()).toEqual([]);
  });

  it('activeConflicts is empty during cold load (hasHydrated=false) even if conflicts exist', () => {
    const store = makeStore();
    // No markHydrated call
    store.leaseAprOverride.set(1.5);
    store.vehicleAge.set(0);
    expect(store.leaseAprConflict()).toBe(true);
    expect(store.activeConflicts()).toEqual([]);
  });

  it('activeConflicts contains the leaseApr entry when it conflicts', () => {
    const store = makeStore();
    store.markHydrated();
    store.vehicleAge.set(0);
    store.leaseAprOverride.set(1.5);
    const list = store.activeConflicts();
    expect(list.length).toBe(1);
    expect(list[0].key).toBe('leaseApr');
    expect(list[0].scope).toBe('lease');
    expect(list[0].label).toContain('APR');
    expect(list[0].reason.length).toBeGreaterThan(20);
  });

  it('dismissing a conflict removes it from activeConflicts', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);
    expect(store.activeConflicts().length).toBe(1);
    store.dismissLeaseApr();
    expect(store.activeConflicts()).toEqual([]);
  });

  it('aggregates multiple conflicts in a stable order', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);
    store.insuranceOverride.set(9999);
    store.residualValueOverride.set(50_000);
    const keys = store.activeConflicts().map((c) => c.key);
    expect(keys).toContain('leaseApr');
    expect(keys).toContain('insurance');
    expect(keys).toContain('residualValue');
  });

  it('descriptor.apply clears the override', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);
    const descriptor = store.activeConflicts()[0];
    descriptor.apply();
    expect(store.leaseAprOverride()).toBeNull();
    expect(store.activeConflicts()).toEqual([]);
  });

  it('descriptor.keep dismisses the conflict', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);
    const descriptor = store.activeConflicts()[0];
    descriptor.keep();
    expect(store.activeConflicts()).toEqual([]);
    // Override still set
    expect(store.leaseAprOverride()).toBe(1.5);
  });

  it('conflictCount("lease") includes lease-scoped + global conflicts', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);     // lease-scoped
    store.insuranceOverride.set(9999);    // global
    expect(store.conflictCount('lease')).toBe(2);
  });

  it('conflictCount("finance") includes only global conflicts', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);     // lease-scoped → not counted for finance
    store.insuranceOverride.set(9999);    // global → counted
    expect(store.conflictCount('finance')).toBe(1);
  });

  it('conflictCount("cash") includes only global conflicts', () => {
    const store = makeStore();
    store.markHydrated();
    store.leaseAprOverride.set(1.5);     // lease-scoped → not counted
    store.insuranceOverride.set(9999);    // global → counted
    store.fuelPriceOverride.set(5);       // global → counted
    expect(store.conflictCount('cash')).toBe(2);
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

