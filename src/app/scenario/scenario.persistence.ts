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
