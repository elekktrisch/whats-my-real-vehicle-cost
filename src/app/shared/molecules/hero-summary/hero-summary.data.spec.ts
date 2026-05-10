import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { cashHeroData, financeHeroData, leaseHeroData } from './hero-summary.data';
import { provideTranslocoTesting } from '../../../../test-helpers/transloco-testing';

function makeStore(): ScenarioStore {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), ...provideTranslocoTesting()],
  });
  return TestBed.inject(ScenarioStore);
}

describe('leaseHeroData', () => {
  it('renew lease (1 cycle): includes Down + Lease + Handback + running costs', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(3);
    store.leaseEndChoiceOverride.set('handBack');

    const data = leaseHeroData(store);
    const labels = data.breakdown.map((b) => b.label);
    expect(labels).toContain('Down payment');
    expect(labels).toContain('Lease payments');
    expect(labels).toContain('Handback fee');
    expect(labels).toContain('Insurance');
    expect(labels).toContain('Maintenance');
    expect(labels).toContain('Fuel');
    expect(data.outOfPocketCaption).toBe('mainly years 1-3');
    expect(data.outOfPocketCaptionMobile).toBe('yrs 1-3');
  });

  it('renew lease (multi-cycle): pluralizes labels and shows cycle count in detail', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(6);
    store.leaseEndChoiceOverride.set('handBack');
    store.leaseDownPayment.set(5_000);

    const data = leaseHeroData(store);
    const down = data.breakdown.find((b) => b.label === 'Down payments');
    expect(down).toBeTruthy();
    expect(down?.detail).toMatch(/2 ×/);
    expect(data.breakdown.find((b) => b.label === 'Handback fees')).toBeTruthy();
  });

  it('buyout: breakdown lists Down + Lease + Buyout', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(5);
    store.leaseEndChoiceOverride.set('buyOut');

    const data = leaseHeroData(store);
    const labels = data.breakdown.map((b) => b.label);
    expect(labels).toContain('Down payment');
    expect(labels).toContain('Lease payments');
    expect(labels).toContain('Buyout');
    expect(data.assetCaption).toMatch(/bought out at year/);
  });

  it('buyout + early exit: detail mentions early-exit penalty', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(2);
    store.leaseEndChoiceOverride.set('buyOut');
    store.earlyTerminationFeeOverride.set(500);

    const data = leaseHeroData(store);
    const buyout = data.breakdown.find((b) => b.label === 'Buyout');
    expect(buyout?.detail).toMatch(/early-exit/);
  });

  it('retainsAsset: false on handback, true on buyout', () => {
    const store = makeStore();
    store.leaseEndChoiceOverride.set('handBack');
    expect(leaseHeroData(store).retainsAsset).toBe(false);
    store.leaseEndChoiceOverride.set('buyOut');
    expect(leaseHeroData(store).retainsAsset).toBe(true);
  });

  it('caption: lease-renew uses keep duration', () => {
    const store = makeStore();
    store.leaseEndChoiceOverride.set('handBack');
    store.keepDuration.set(6);
    const data = leaseHeroData(store);
    expect(data.outOfPocketCaption).toBe('mainly years 1-6');
    expect(data.outOfPocketCaptionMobile).toBe('yrs 1-6');
  });

  it('caption: lease-buyout uses lease term in years', () => {
    const store = makeStore();
    store.leaseEndChoiceOverride.set('buyOut');
    store.leaseTerm.set(36);
    store.keepDuration.set(5);
    const data = leaseHeroData(store);
    expect(data.outOfPocketCaption).toBe('mainly years 1-3');
    expect(data.outOfPocketCaptionMobile).toBe('yrs 1-3');
  });
});

describe('financeHeroData', () => {
  it('breakdown lists Down + Loan + running costs', () => {
    const store = makeStore();
    store.financeDownPayment.set(5_000);
    store.loanTerm.set(60);
    store.keepDuration.set(5);

    const data = financeHeroData(store);
    const labels = data.breakdown.map((b) => b.label);
    expect(labels).toContain('Down payment');
    expect(labels).toContain('Loan payments');
    expect(labels).toContain('Insurance');
    expect(data.outOfPocket).toBeTruthy();
  });

  it('zero down payment: skips the Down line', () => {
    const store = makeStore();
    store.financeDownPayment.set(0);

    const data = financeHeroData(store);
    expect(data.breakdown.find((b) => b.label === 'Down payment')).toBeUndefined();
    expect(data.breakdown.find((b) => b.label === 'Loan payments')).toBeTruthy();
  });

  it('caption: non-zero down payment → year 1', () => {
    const store = makeStore();
    store.financeDownPayment.set(5_000);
    const data = financeHeroData(store);
    expect(data.outOfPocketCaption).toBe('mainly year 1');
    expect(data.outOfPocketCaptionMobile).toBe('yr 1');
  });

  it('caption: zero down payment → years 1-{loanYears}', () => {
    const store = makeStore();
    store.financeDownPayment.set(0);
    store.loanTerm.set(60);
    const data = financeHeroData(store);
    expect(data.outOfPocketCaption).toBe('mainly years 1-5');
    expect(data.outOfPocketCaptionMobile).toBe('yrs 1-5');
  });
});

describe('cashHeroData', () => {
  it('breakdown lists Purchase + running costs', () => {
    const store = makeStore();
    store.purchasePrice.set(28_000);
    store.keepDuration.set(7);

    const data = cashHeroData(store);
    const labels = data.breakdown.map((b) => b.label);
    expect(labels[0]).toBe('Purchase price');
    expect(labels).toContain('Insurance');
  });

  it('caption: cash → year 1 regardless of keep', () => {
    const store = makeStore();
    store.keepDuration.set(7);
    const data = cashHeroData(store);
    expect(data.outOfPocketCaption).toBe('mainly year 1');
    expect(data.outOfPocketCaptionMobile).toBe('yr 1');
  });
});
