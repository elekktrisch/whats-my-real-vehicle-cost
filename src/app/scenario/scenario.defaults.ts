import type { Locale, ScenarioSnapshot, TcoOverrides } from './scenario.types';
import { detectLocaleFromBrowser } from './locale.config';

const EMPTY_OVERRIDES: TcoOverrides = {
  insurance: null,
  maintenance: null,
  fuelEfficiency: null,
  fuelPrice: null,
  homeChargerInstall: null,
};

export function defaultScenario(localeOverride?: Locale): ScenarioSnapshot {
  const locale = localeOverride ?? detectLocaleFromBrowser();
  const isUS = locale === 'US';
  return {
    globals: {
      locale,
      powertrain: 'ICE',
      purchasePrice: isUS ? 35000 : 30000,
      residualValue: isUS ? 17500 : 15000,
      vehicleAge: 0,
      annualMileage: isUS ? 12000 : 15000,
      keepDuration: 5,
      downPayment: isUS ? 5000 : 4000,
      activeTab: 'lease',
    },
    lease: {
      apr: 4.5,
      leaseTerm: 36,
      leaseEndChoice: 'handBack',
      dispositionFee: null,
      mileageOverageRate: null,
      excessWearEstimate: null,
      buyoutFee: null,
    },
    finance: {
      apr: 6.0,
      loanTerm: 60,
    },
    cash: {
      opportunityCostRate: 0.05,
    },
    overrides: {
      lease: { ...EMPTY_OVERRIDES },
      finance: { ...EMPTY_OVERRIDES },
      cash: { ...EMPTY_OVERRIDES },
    },
  };
}

export const LEASE_END_DEFAULTS = {
  dispositionFee: 395,
  mileageOverageRate: 0.25,
  excessWearEstimate: 800,
  buyoutFee: 300,
};