import type { CostBreakdown } from '../scenario.types';
import { opportunityCostMonthly } from './opportunity';
import {
  TcoBaseInputs,
  allocateSeries,
  buildOwnedMonthsSeries,
  fuelTotalForMonths,
  homeChargerInstallCost,
  summarize,
} from './tco-shared';

export interface CashTcoInputs extends TcoBaseInputs {
  tab: 'cash';
  opportunityCostRate: number;
}

/**
 * Cash-purchase TCO accumulator.
 *
 * The user pays `purchasePrice` upfront in month 1, no loan. Depreciation
 * is straight-line from `purchasePrice` to `residualValue` over the keep
 * horizon. There's no interest-and-fees layer (it's structurally zero), but
 * `opportunityCost` is the headline insight: the full purchase price stops
 * earning `opportunityCostRate` from month 1, compounding monthly. That
 * line is what makes the chart for "cash buyer testing opportunity cost".
 */
export function cashTco(input: CashTcoInputs): CostBreakdown {
  const totalMonths = Math.max(Math.round(input.keepDurationYears * 12), 1);
  const totalDepreciation = Math.max(input.purchasePrice - input.residualValue, 0);
  const perMonthDepreciation = totalDepreciation / totalMonths;
  const opportunity = opportunityCostMonthly(
    input.purchasePrice,
    input.opportunityCostRate,
    totalMonths,
  );

  const fuelTotal = fuelTotalForMonths(input, totalMonths);
  const monthlyFuel = totalMonths > 0 ? fuelTotal / totalMonths : 0;
  const monthlyInsurance = input.insuranceAnnual / 12;
  const inc = buildOwnedMonthsSeries({
    startAgeYears: input.vehicleAge,
    durationMonths: totalMonths,
    monthlyFuel,
    monthlyInsurance,
    maintenanceBase: input.maintenanceBase,
    maintenanceK: input.maintenanceK,
  });

  const series = allocateSeries(totalMonths);
  const chargerInstall = homeChargerInstallCost(input);
  series[0].maintenance = chargerInstall;
  // Charger install fires at month 0 alongside the maintenance-bucket entry.
  series[0].cashOut = chargerInstall;

  for (let m = 1; m <= totalMonths; m++) {
    const i = m - 1;
    const prev = series[m - 1];
    series[m].fuel = prev.fuel + inc.fuel[i];
    series[m].insurance = prev.insurance + inc.insurance[i];
    series[m].maintenance = prev.maintenance + inc.maintenance[i];
    series[m].depreciationOrLease = prev.depreciationOrLease + perMonthDepreciation;
    // Cash mode has no real interest or fees — pure opportunity cost.
    series[m].interestAndFees = 0;
    series[m].opportunityCost = opportunity[m];
    // Cash flow: full purchase at month 1, then running costs each month.
    const purchaseThisMonth = m === 1 ? input.purchasePrice : 0;
    series[m].cashOut =
      prev.cashOut + purchaseThisMonth + inc.fuel[i] + inc.insurance[i] + inc.maintenance[i];
  }

  return summarize(series);
}
