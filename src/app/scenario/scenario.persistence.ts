import { effect } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import type { ScenarioStore } from './scenario.store';
import { URL_PARAM, encodeSnapshot } from './scenario.serializer';
import type { ScenarioSnapshot } from './scenario.types';

// Wires up the three side-effects that keep the store coherent with the
// outside world: URL autosave, cross-field clamping (down payments + residual
// override ≤ purchase price), and residual-baseline tracking (drop a stale
// override when its drivers change).
//
// Must be called from the store constructor so `effect()` picks up the
// surrounding injection context.
export function setupAutosave(store: ScenarioStore, router: Router, location: Location): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Gated on hasReturningState so a fresh visitor's URL doesn't silently get
  // `?s=<defaults>` (which would skip splash on reload).
  effect(() => {
    const snap = store.snapshot();
    if (store.isHydrating() || !store.hasHydrated() || !store.hasReturningState()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => persist(snap, router, location), 200);
  });

  // Auto-derived residual default needs no clamp — depreciationFactor ≤ 1
  // keeps it bounded by construction, so we only clamp the override.
  effect(() => {
    const price = store.purchasePrice();
    if (store.isHydrating()) return;
    if (store.leaseDownPayment() > price) store.leaseDownPayment.set(price);
    if (store.financeDownPayment() > price) store.financeDownPayment.set(price);
    const residualOverride = store.residualValueOverride();
    if (residualOverride !== null && residualOverride > price) {
      store.setResidualValue(price);
    }
  });

  // Drop stale residual override when its drivers change. Baseline lets us
  // distinguish "first run after hydration" from "user actually changed an input".
  let residualBaseline: { price: number; age: number; keep: number } | null = null;
  effect(() => {
    const price = store.purchasePrice();
    const age = store.vehicleAge();
    const keep = store.keepDuration();
    if (store.isHydrating() || !store.hasHydrated()) return;
    if (residualBaseline === null) {
      residualBaseline = { price, age, keep };
      return;
    }
    if (
      price !== residualBaseline.price ||
      age !== residualBaseline.age ||
      keep !== residualBaseline.keep
    ) {
      store.setResidualValue(null);
      residualBaseline = { price, age, keep };
    }
  });
}

function persist(snap: ScenarioSnapshot, router: Router, location: Location): void {
  try {
    const tree = router.parseUrl(router.url);
    tree.queryParams = { [URL_PARAM]: encodeSnapshot(snap) };
    location.replaceState(router.serializeUrl(tree));
  } catch {
    // router/location not ready
  }
}
