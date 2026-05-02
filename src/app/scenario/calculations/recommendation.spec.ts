import { recommendTab } from './recommendation';

describe('recommendTab', () => {
  it('UC1 — short keep + low miles → Lease', () => {
    const rec = recommendTab({
      purchasePrice: 42000,
      downPayment: 5000,
      keepDuration: 3,
      annualMileage: 12000,
      locale: 'US',
    });
    expect(rec.tab).toBe('lease');
  });

  it('UC2 — long keep → Finance', () => {
    const rec = recommendTab({
      purchasePrice: 15000,
      downPayment: 3000,
      keepDuration: 5,
      annualMileage: 15000,
      locale: 'EU',
    });
    expect(rec.tab).toBe('finance');
  });

  it('UC3 — down payment ≥ 80% of price → Cash', () => {
    const rec = recommendTab({
      purchasePrice: 40000,
      downPayment: 40000,
      keepDuration: 7,
      annualMileage: 10000,
      locale: 'US',
    });
    expect(rec.tab).toBe('cash');
  });

  it('cash recommendation reason mentions cash', () => {
    const rec = recommendTab({
      purchasePrice: 40000,
      downPayment: 40000,
      keepDuration: 7,
      annualMileage: 10000,
      locale: 'US',
    });
    expect(rec.reason.toLowerCase()).toContain('cash');
  });

  it('high mileage flips a short keep from Lease to Finance', () => {
    const rec = recommendTab({
      purchasePrice: 35000,
      downPayment: 4000,
      keepDuration: 3,
      annualMileage: 25000,
      locale: 'US',
    });
    expect(rec.tab).toBe('finance');
  });
});