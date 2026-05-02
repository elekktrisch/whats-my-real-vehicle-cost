import { fuelCostOverYears } from './fuel';

describe('fuelCostOverYears', () => {
  it('US ICE: 12k mi/yr × 3yr × $3.50/gal at 28 mpg ≈ $4500', () => {
    const cost = fuelCostOverYears({
      efficiency: 28,
      fuelPrice: 3.5,
      annualMileage: 12000,
      years: 3,
      powertrain: 'ICE',
      locale: 'US',
    });
    expect(cost).toBeGreaterThan(4400);
    expect(cost).toBeLessThan(4600);
  });

  it('US EV: cheaper than equivalent ICE for same mileage', () => {
    const ice = fuelCostOverYears({
      efficiency: 28,
      fuelPrice: 3.5,
      annualMileage: 12000,
      years: 3,
      powertrain: 'ICE',
      locale: 'US',
    });
    const ev = fuelCostOverYears({
      efficiency: 3.5,
      fuelPrice: 0.16,
      annualMileage: 12000,
      years: 3,
      powertrain: 'EV',
      locale: 'US',
    });
    expect(ev).toBeLessThan(ice);
  });

  it('EU ICE: 15k km/yr × 5yr × €1.75/L at 6.5 L/100km ≈ €8500', () => {
    const cost = fuelCostOverYears({
      efficiency: 6.5,
      fuelPrice: 1.75,
      annualMileage: 15000,
      years: 5,
      powertrain: 'ICE',
      locale: 'EU',
    });
    expect(cost).toBeGreaterThan(8000);
    expect(cost).toBeLessThan(9000);
  });

  it('returns 0 when years is 0', () => {
    expect(
      fuelCostOverYears({
        efficiency: 28,
        fuelPrice: 3.5,
        annualMileage: 12000,
        years: 0,
        powertrain: 'ICE',
        locale: 'US',
      }),
    ).toBe(0);
  });
});