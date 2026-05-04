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
      chargerStatus: 'none' as const,
      solar: false,
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
      chargerStatus: 'none' as const,
      solar: false,
    });
    const ev = fuelCostOverYears({
      efficiency: 3.5,
      fuelPrice: 0.16,
      annualMileage: 12000,
      years: 3,
      powertrain: 'EV',
      locale: 'US',
      chargerStatus: 'none' as const,
      solar: false,
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
      chargerStatus: 'none' as const,
      solar: false,
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
        chargerStatus: 'none' as const,
        solar: false,
      }),
    ).toBe(0);
  });

  it('US EV: solar with home charger drops cost to 15% of grid (85/15 split)', () => {
    const base = {
      efficiency: 3.5,
      fuelPrice: 0.16,
      annualMileage: 12000,
      years: 3,
      powertrain: 'EV' as const,
      locale: 'US' as const,
    };
    const grid = fuelCostOverYears({ ...base, chargerStatus: 'installed' as const, solar: false });
    const solar = fuelCostOverYears({ ...base, chargerStatus: 'installed' as const, solar: true });
    expect(solar).toBeCloseTo(grid * 0.15, 4);
  });

  it('EU EV: solar with home charger drops cost to 15% of grid', () => {
    const base = {
      efficiency: 17,
      fuelPrice: 0.32,
      annualMileage: 15000,
      years: 5,
      powertrain: 'EV' as const,
      locale: 'EU' as const,
    };
    const grid = fuelCostOverYears({ ...base, chargerStatus: 'installed' as const, solar: false });
    const solar = fuelCostOverYears({ ...base, chargerStatus: 'installed' as const, solar: true });
    expect(solar).toBeCloseTo(grid * 0.15, 4);
  });

  it('solar without home charger has no effect (gating)', () => {
    const base = {
      efficiency: 3.5,
      fuelPrice: 0.16,
      annualMileage: 12000,
      years: 3,
      powertrain: 'EV' as const,
      locale: 'US' as const,
    };
    const offOff = fuelCostOverYears({ ...base, chargerStatus: 'none' as const, solar: false });
    const onOff = fuelCostOverYears({ ...base, chargerStatus: 'none' as const, solar: true });
    expect(onOff).toBeCloseTo(offOff, 4);
  });

  it('solar flag is ignored for ICE (no electricity)', () => {
    const base = {
      efficiency: 28,
      fuelPrice: 3.5,
      annualMileage: 12000,
      years: 3,
      powertrain: 'ICE' as const,
      locale: 'US' as const,
    };
    const noSolar = fuelCostOverYears({ ...base, chargerStatus: 'none' as const, solar: false });
    const withSolar = fuelCostOverYears({ ...base, chargerStatus: 'installed' as const, solar: true });
    expect(withSolar).toBeCloseTo(noSolar, 4);
  });
});