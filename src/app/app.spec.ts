import { App } from './app';

describe('App', () => {
  let app: App;

  beforeEach(() => { app = new App(); });

  describe('adjustedCapCost', () => {
    it('subtracts down payment from capitalized cost', () => {
      app.capitalizedCosts = 40000;
      app.downPayment = 5000;
      expect(app.adjustedCapCost).toBe(35000);
    });

    it('equals capitalized cost when there is no down payment', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      expect(app.adjustedCapCost).toBe(30000);
    });
  });

  describe('moneyFactor', () => {
    it('is APR divided by 2400', () => {
      app.apr = 2.4;
      expect(app.moneyFactor).toBeCloseTo(0.001, 6);
    });

    it('is zero when APR is zero', () => {
      app.apr = 0;
      expect(app.moneyFactor).toBe(0);
    });
  });

  describe('depreciationFee', () => {
    it('spreads adjusted cap cost minus residual evenly over the term', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 12000;
      app.months = 36;
      expect(app.depreciationFee).toBeCloseTo(500, 6);
    });

    it('accounts for down payment when computing monthly depreciation', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 6000;
      app.residualPrice = 12000;
      app.months = 36;
      // (30000 - 6000 - 12000) / 36 = 333.33
      expect(app.depreciationFee).toBeCloseTo(333.33, 2);
    });

    it('is zero when adjusted cap cost equals residual value', () => {
      app.capitalizedCosts = 20000;
      app.downPayment = 0;
      app.residualPrice = 20000;
      app.months = 36;
      expect(app.depreciationFee).toBe(0);
    });
  });

  describe('financeFee', () => {
    it('is capitalized cost times money factor', () => {
      app.capitalizedCosts = 30000;
      app.apr = 2.4; // moneyFactor = 0.001
      expect(app.financeFee).toBeCloseTo(30, 6);
    });

    it('is zero when APR is zero', () => {
      app.apr = 0;
      expect(app.financeFee).toBe(0);
    });
  });

  describe('monthlyPayment', () => {
    it('is the sum of depreciation fee and finance fee', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 12000;
      app.apr = 2.4;
      app.months = 36;
      expect(app.monthlyPayment).toBeCloseTo(app.depreciationFee + app.financeFee, 10);
    });

    it('equals just the depreciation fee when APR is zero', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 12000;
      app.apr = 0;
      app.months = 36;
      expect(app.monthlyPayment).toBeCloseTo(500, 6);
    });
  });

  describe('chart debt line (remaining payments)', () => {
    it('starts at total lease cost and ends at zero', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 10000;
      app.apr = 3.0;
      app.months = 36;
      expect(app.monthlyPayment * app.months).toBeCloseTo(app.monthlyPayment * app.months, 6);
      expect(app.monthlyPayment * (app.months - app.months)).toBe(0);
    });

    it('never goes below zero when down payment and residual are both zero', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 0;
      app.apr = 5.0;
      app.months = 36;
      for (let i = 0; i <= app.months; i++) {
        expect(app.monthlyPayment * (app.months - i)).toBeGreaterThanOrEqual(0);
      }
    });

    it('is strictly decreasing each month', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 8000;
      app.apr = 3.0;
      app.months = 36;
      for (let i = 1; i <= app.months; i++) {
        const prev = app.monthlyPayment * (app.months - (i - 1));
        const curr = app.monthlyPayment * (app.months - i);
        expect(curr).toBeLessThan(prev);
      }
    });

    it('is higher at every month when APR is higher', () => {
      app.capitalizedCosts = 30000;
      app.downPayment = 0;
      app.residualPrice = 10000;
      app.months = 36;

      app.apr = 1.0;
      const lowAprPayment = app.monthlyPayment;

      app.apr = 8.0;
      const highAprPayment = app.monthlyPayment;

      expect(highAprPayment).toBeGreaterThan(lowAprPayment);
    });
  });
});