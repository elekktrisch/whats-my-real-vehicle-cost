import { effect } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import type { ScenarioStore } from './scenario.store';
import { URL_PARAM, encodeSnapshot } from './scenario.serializer';
import type { ScenarioSnapshot } from './scenario.types';

export function setupAutosave(store: ScenarioStore, router: Router, location: Location): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  effect(() => {
    const snap = store.snapshot();
    if (store.isHydrating() || !store.hasHydrated() || !store.hasReturningState()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => persist(snap, router, location), 200);
  });

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
