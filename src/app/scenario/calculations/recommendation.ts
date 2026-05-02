import type { Tab } from '../scenario.types';

export interface RecommendationInputs {
  purchasePrice: number;
  downPayment: number;
  keepDuration: number;
  annualMileage: number;
  locale: 'US' | 'EU';
}

export interface Recommendation {
  tab: Tab;
  reason: string;
}

export function recommendTab(input: RecommendationInputs): Recommendation {
  const milesCap = input.locale === 'US' ? 12000 : 15000;
  const distanceLabel = input.locale === 'US' ? 'mi/yr' : 'km/yr';

  if (input.purchasePrice > 0 && input.downPayment / input.purchasePrice >= 0.8) {
    return {
      tab: 'cash',
      reason: 'Picked Cash because you have enough on hand to cover the purchase.',
    };
  }
  if (input.keepDuration <= 3 && input.annualMileage <= milesCap) {
    return {
      tab: 'lease',
      reason: `Picked Lease because you plan to keep the car ${input.keepDuration} year${
        input.keepDuration === 1 ? '' : 's'
      } and drive ${input.annualMileage.toLocaleString()} ${distanceLabel}.`,
    };
  }
  return {
    tab: 'finance',
    reason: `Picked Finance because you plan to keep the car ${input.keepDuration} year${
      input.keepDuration === 1 ? '' : 's'
    }.`,
  };
}