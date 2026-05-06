import type { Locale, ScenarioSnapshot, TcoOverrides } from './scenario.types';
import { detectLocaleFromBrowser } from './locale.config';

const EMPTY_OVERRIDES: TcoOverrides = {
  insurance: null,
  fuelEfficiency: null,
  fuelPrice: null,
};

export function defaultScenario(localeOverride?: Locale): ScenarioSnapshot {
  const locale = localeOverride ?? detectLocaleFromBrowser();
  const isUS = locale === 'US';
  return {
    globals: {
      locale,
      powertrain: 'ICE',
      purchasePrice: isUS ? 35000 : 30000,
      residualValue: null, // auto-derived from msrp × depreciationFactor(end-of-keep age)
      vehicleAge: 0,
      annualMileage: isUS ? 12000 : 15000,
      keepDuration: 5,
      activeTab: 'lease',
      chargerStatus: 'buying',
      solar: true,
    },
    lease: {
      apr: 3.0,
      leaseTerm: 48,
      downPayment: isUS ? 10000 : 8000,
      leaseEndChoice: null,
      dispositionFee: null,
      mileageOverageRate: null,
      excessWearEstimate: null,
      buyoutFee: null,
      earlyTerminationFee: null,
      leaseEndResidual: null,
    },
    finance: {
      apr: 9.0,
      loanTerm: 60,
      downPayment: 0,
    },
    cash: {
      opportunityCostRate: 0.05,
    },
    overrides: { ...EMPTY_OVERRIDES },
  };
}

export const LEASE_END_DEFAULTS = {
  dispositionFee: 395,
  mileageOverageRate: 0.25,
  excessWearEstimate: 800,
  buyoutFee: 300,
};
