import { tcoBreakdown } from './tco';
import { maintenanceK } from './maintenance';

const usFinanceShared = {
  tab: 'finance' as const,
  locale: 'US' as const,
  powertrain: 'ICE' as const,
  purchasePrice: 35000,
  residualValue: 17500,
  vehicleAge: 0,
  annualMileage: 12000,
  keepDurationYears: 5,
  downPayment: 5000,
  insuranceAnnual: 1750,
  maintenanceBase: 525,
  maintenanceK: 0,
  fuelEfficiency: 28,
  fuelPrice: 3.5,
  chargerStatus: 'none' as const,
  solar: false,
  apr: 6,
  loanTermMonths: 60,
};

describe('financeTco', () => {
  it('applies compounded opportunity cost on every cash outflow (down + loan payments)', () => {
    const noOpp = tcoBreakdown({ ...usFinanceShared, opportunityCostRate: 0 });
    const withOpp = tcoBreakdown({ ...usFinanceShared, opportunityCostRate: 0.08 });
    // Opp on the down alone is a strict lower bound; full opp also includes
    // each monthly loan payment (each $X paid stops earning returns).
    const oppOnDownAlone =
      usFinanceShared.downPayment * (Math.pow(1.08, usFinanceShared.keepDurationYears) - 1);
    expect(withOpp.totals.opportunityCost - noOpp.totals.opportunityCost).toBeGreaterThan(
      oppOnDownAlone,
    );
    // Real interest is unchanged across the two opportunity-cost rates.
    expect(withOpp.totals.interestAndFees).toBeCloseTo(noOpp.totals.interestAndFees, 4);
  });

  it('100% down ≈ cash for the same scenario (same capital tied up)', () => {
    const shared = {
      locale: 'US' as const,
      powertrain: 'ICE' as const,
      purchasePrice: 35000,
      residualValue: 17500,
      vehicleAge: 0,
      annualMileage: 12000,
      keepDurationYears: 10,
      insuranceAnnual: 1750,
      maintenanceBase: 525,
      maintenanceK: 0,
      fuelEfficiency: 28,
      fuelPrice: 3.5,
      chargerStatus: 'none' as const,
      solar: false,
      opportunityCostRate: 0.05,
    };
    const finance = tcoBreakdown({
      ...shared,
      tab: 'finance',
      downPayment: 35000,
      apr: 6,
      loanTermMonths: 60,
    });
    const cash = tcoBreakdown({
      ...shared,
      tab: 'cash',
      downPayment: 0,
    });
    expect(finance.total).toBeGreaterThan(cash.total * 0.9);
    expect(finance.total).toBeLessThan(cash.total * 1.1);
  });
});

describe('financeTco — maintenance age curve', () => {
  it('vehicleAge shifts the curve forward (older car → more maintenance)', () => {
    const young = tcoBreakdown({
      ...usFinanceShared,
      vehicleAge: 0,
      residualValue: 14000,
      maintenanceK: maintenanceK('mid', 'ICE'),
      opportunityCostRate: 0,
    });
    const old = tcoBreakdown({
      ...usFinanceShared,
      vehicleAge: 5,
      residualValue: 14000,
      maintenanceK: maintenanceK('mid', 'ICE'),
      opportunityCostRate: 0,
    });
    expect(old.totals.maintenance).toBeGreaterThan(young.totals.maintenance);
  });
});
