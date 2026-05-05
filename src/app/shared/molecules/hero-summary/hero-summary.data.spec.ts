import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ScenarioStore } from '../../../scenario/scenario.store';
import { cashHeroData, financeHeroData, leaseHeroData } from './hero-summary.data';

function makeStore(): ScenarioStore {
  TestBed.configureTestingModule({
    providers: [provideRouter([])],
  });
  return TestBed.inject(ScenarioStore);
}

describe('leaseHeroData', () => {
  it('renew lease (1 cycle): downCaption is "initial downpayment"', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(3);
    store.leaseEndChoiceOverride.set('handBack');
    store.leaseDownPayment.set(4_000);

    const data = leaseHeroData(store);
    expect(data.downCaption).toBe('initial downpayment');
    expect(data.termMonths).toBe(36);
    expect(data.asset).toContain('0'); // handback → asset = $0
  });

  it('renew lease (multi-cycle): downCaption shows N × down', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(6); // 2 cycles
    store.leaseEndChoiceOverride.set('handBack');
    store.leaseDownPayment.set(5_000);

    const data = leaseHeroData(store);
    expect(data.downCaption).toMatch(/2 ×/);
    expect(data.downCaption).toMatch(/one per cycle/);
    expect(data.assetCaption).toMatch(/vehicle returned/);
  });

  it('renew lease (partial final cycle): rounded up to ceil(keep/term)', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(5); // 60 mo, ceil(60/36) = 2 cycles
    store.leaseEndChoiceOverride.set('handBack');

    const data = leaseHeroData(store);
    expect(data.downCaption).toMatch(/2 ×/);
  });

  it('buyout: downCaption shows down + buyout', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(5);
    store.leaseEndChoiceOverride.set('buyOut');

    const data = leaseHeroData(store);
    expect(data.downCaption).toMatch(/down/);
    expect(data.downCaption).toMatch(/buyout/);
    expect(data.assetCaption).toMatch(/bought out at year/);
  });

  it('buyout + early exit (keep < term): caption mentions early-exit penalty', () => {
    const store = makeStore();
    store.leaseTerm.set(36);
    store.keepDuration.set(2); // 24 mo < 36
    store.leaseEndChoiceOverride.set('buyOut');
    store.earlyTerminationFeeOverride.set(500);

    const data = leaseHeroData(store);
    expect(data.downCaption).toMatch(/early-exit penalty/);
  });
});

describe('financeHeroData', () => {
  it('returns down + monthly + asset for the keep duration', () => {
    const store = makeStore();
    store.purchasePrice.set(35_000);
    store.financeDownPayment.set(5_000);
    store.financeApr.set(6);
    store.loanTerm.set(60);
    store.keepDuration.set(5);

    const data = financeHeroData(store);
    expect(data.downCaption).toBe('initial downpayment');
    expect(data.termMonths).toBe(60);
    expect(data.monthly).toBeTruthy();
    expect(data.assetCaption).toMatch(/after 5 years/);
  });

  it('zero down payment is valid', () => {
    const store = makeStore();
    store.financeDownPayment.set(0);

    const data = financeHeroData(store);
    expect(data.down).toBeTruthy();
    expect(data.termMonths).toBeGreaterThan(0);
  });
});

describe('cashHeroData', () => {
  it('down = full purchase price; no monthly term', () => {
    const store = makeStore();
    store.purchasePrice.set(28_000);
    store.keepDuration.set(7);

    const data = cashHeroData(store);
    expect(data.downCaption).toBe('full purchase price');
    expect(data.termMonths).toBe(0);
    expect(data.assetCaption).toMatch(/after 7 years/);
  });
});
