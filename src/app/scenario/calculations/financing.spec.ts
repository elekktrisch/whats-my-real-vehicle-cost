import { financePayment, leasePayment } from './financing';

describe('leasePayment', () => {
  it('subtracts down payment from cap cost for adjusted cap cost', () => {
    const r = leasePayment({
      capCost: 40000,
      downPayment: 5000,
      residualValue: 20000,
      apr: 4.5,
      termMonths: 36,
    });
    expect(r.adjustedCapCost).toBe(35000);
  });

  it('money factor is APR / 2400', () => {
    const r = leasePayment({
      capCost: 30000,
      downPayment: 0,
      residualValue: 15000,
      apr: 2.4,
      termMonths: 36,
    });
    expect(r.moneyFactor).toBeCloseTo(0.001, 6);
  });

  it('depreciation fee splits adjusted cap cost minus residual evenly across the term', () => {
    const r = leasePayment({
      capCost: 30000,
      downPayment: 0,
      residualValue: 12000,
      apr: 0,
      termMonths: 36,
    });
    expect(r.depreciationFee).toBeCloseTo(500, 6);
  });

  it('monthly payment is depreciation fee + finance fee', () => {
    const r = leasePayment({
      capCost: 30000,
      downPayment: 0,
      residualValue: 12000,
      apr: 4.5,
      termMonths: 36,
    });
    expect(r.monthlyPayment).toBeCloseTo(r.depreciationFee + r.financeFee, 10);
  });

  it('higher APR yields a higher monthly payment', () => {
    const low = leasePayment({
      capCost: 30000,
      downPayment: 0,
      residualValue: 10000,
      apr: 1.0,
      termMonths: 36,
    });
    const high = leasePayment({
      capCost: 30000,
      downPayment: 0,
      residualValue: 10000,
      apr: 8.0,
      termMonths: 36,
    });
    expect(high.monthlyPayment).toBeGreaterThan(low.monthlyPayment);
  });
});

describe('financePayment', () => {
  it('returns principal / term when APR is zero', () => {
    expect(financePayment({ principal: 36000, apr: 0, termMonths: 60 })).toBeCloseTo(600, 6);
  });

  it('returns a value greater than principal/term when APR > 0', () => {
    const flat = financePayment({ principal: 30000, apr: 0, termMonths: 60 });
    const interest = financePayment({ principal: 30000, apr: 6, termMonths: 60 });
    expect(interest).toBeGreaterThan(flat);
  });

  it('amortizes a 30000 loan over 60 mo at 6% APR to ~580', () => {
    const m = financePayment({ principal: 30000, apr: 6, termMonths: 60 });
    expect(m).toBeGreaterThan(575);
    expect(m).toBeLessThan(585);
  });
});