import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { LOCALE_CONFIG, fuelEfficiencyDefault, fuelPriceDefault } from './locale.config';
import { LEASE_END_DEFAULTS, defaultScenario } from './scenario.defaults';
import type {
  ChargerStatus,
  CostBreakdown,
  LeaseEndChoice,
  Locale,
  Powertrain,
  ScenarioSnapshot,
  Tab,
} from './scenario.types';
import { backDeriveMsrp } from './calculations/msrp';
import { depreciationFactor } from './calculations/depreciation';
import { categorize, categoryMultipliers } from './calculations/category';
import { leasePayment } from './calculations/financing';
import { maintenanceK } from './calculations/maintenance';
import { recommendTab } from './calculations/recommendation';
import { costPerDistance, effectiveMonthly, tcoBreakdown } from './calculations/tco';
import { setupAutosave } from './scenario.persistence';

@Injectable({ providedIn: 'root' })
export class ScenarioStore {
  private readonly initial = defaultScenario();

  readonly locale = signal<Locale>(this.initial.globals.locale);
  readonly powertrain = signal<Powertrain>(this.initial.globals.powertrain);
  readonly purchasePrice = signal(this.initial.globals.purchasePrice);
  // Override-pattern: each `xOverride` is a `WritableSignal<T | null>` where
  // `null` means "auto-derive from defaults". The corresponding public
  // computed (e.g. `insurance`) returns override ?? default.
  readonly residualValueOverride = signal<number | null>(this.initial.globals.residualValue);
  readonly vehicleAge = signal(this.initial.globals.vehicleAge);
  readonly annualMileage = signal(this.initial.globals.annualMileage);
  readonly keepDuration = signal(this.initial.globals.keepDuration);
  readonly activeTab = signal<Tab>(this.initial.globals.activeTab);
  readonly chargerStatus = signal<ChargerStatus>(this.initial.globals.chargerStatus);
  readonly solar = signal(this.initial.globals.solar);

  readonly leaseApr = signal(this.initial.lease.apr);
  readonly leaseTerm = signal(this.initial.lease.leaseTerm);
  readonly leaseDownPayment = signal(this.initial.lease.downPayment);
  readonly leaseEndChoiceOverride = signal<LeaseEndChoice | null>(null);
  readonly dispositionFeeOverride = signal<number | null>(this.initial.lease.dispositionFee);
  readonly mileageOverageRateOverride = signal<number | null>(
    this.initial.lease.mileageOverageRate,
  );
  readonly excessWearOverride = signal<number | null>(this.initial.lease.excessWearEstimate);
  readonly buyoutFeeOverride = signal<number | null>(this.initial.lease.buyoutFee);
  readonly earlyTerminationFeeOverride = signal<number | null>(
    this.initial.lease.earlyTerminationFee,
  );
  // Residual at end of LEASE TERM (used as buyout price when the user buys
  // out). Distinct from `residualValue` (end-of-keep) which drives asset
  // display and finance/cash depreciation.
  readonly leaseEndResidualOverride = signal<number | null>(this.initial.lease.leaseEndResidual);

  readonly financeApr = signal(this.initial.finance.apr);
  readonly loanTerm = signal(this.initial.finance.loanTerm);
  readonly financeDownPayment = signal(this.initial.finance.downPayment);
  readonly opportunityCostRate = signal(this.initial.cash.opportunityCostRate);

  readonly insuranceOverride = signal<number | null>(this.initial.overrides.insurance);
  readonly fuelEfficiencyOverride = signal<number | null>(this.initial.overrides.fuelEfficiency);
  readonly fuelPriceOverride = signal<number | null>(this.initial.overrides.fuelPrice);

  // Autosave gate — true once APP_INITIALIZER finishes (cold or warm boot).
  readonly hasHydrated = signal(false);
  // Splash skip seam — true if the URL carried user state, or once engaged.
  readonly hasReturningState = signal(false);
  private readonly _isHydrating = signal(false);
  readonly isHydrating = this._isHydrating.asReadonly();

  readonly msrp = computed(() => backDeriveMsrp(this.purchasePrice(), this.vehicleAge()));
  readonly vehicleCategory = computed(() => categorize(this.msrp(), this.locale()));
  readonly categoryMultipliers = computed(() => categoryMultipliers(this.vehicleCategory()));
  readonly localeConfig = computed(() => LOCALE_CONFIG[this.locale()]);
  readonly currencyPrefix = computed(() => {
    const cfg = this.localeConfig();
    return cfg.currencyAfter ? '' : cfg.currencySymbol;
  });
  readonly currencySuffix = computed(() => {
    const cfg = this.localeConfig();
    return cfg.currencyAfter ? ' ' + cfg.currencySymbol : '';
  });

  private readonly residualValueDefault = computed(() => {
    const endAge = this.vehicleAge() + this.keepDuration();
    return Math.round(this.msrp() * depreciationFactor(endAge));
  });
  readonly residualValue = computed(
    () => this.residualValueOverride() ?? this.residualValueDefault(),
  );
  setResidualValue(value: number | null): void {
    this.residualValueOverride.set(value);
  }

  private insuranceDefault = computed(() => {
    const cfg = this.localeConfig();
    return this.purchasePrice() * cfg.insuranceRate * this.categoryMultipliers().insurance;
  });
  // Year-0 base; the age curve is applied per-month in the calc layer via
  // `maintenanceAt` and `maintenanceK`. Maintenance has no override slot —
  // it's a fully-derived display.
  readonly maintenance = computed(() => {
    const baseRate = this.powertrain() === 'EV' ? 0.007 : 0.015;
    return this.msrp() * baseRate * this.categoryMultipliers().maintenance;
  });
  // Heavy drivers wear cars out faster — scale the age-curve coefficient by
  // annualMileage / nominal so the maintenance band steepens. Year-0 base
  // stays MSRP-driven (calendar items still apply at low mileage).
  private readonly mileageFactor = computed(() => {
    const nominal = this.locale() === 'US' ? 12000 : 15000;
    return Math.max(this.annualMileage() / nominal, 0);
  });
  readonly maintenanceK = computed(
    () => maintenanceK(this.vehicleCategory(), this.powertrain()) * this.mileageFactor(),
  );
  private fuelEfficiencyDefaultSignal = computed(() =>
    fuelEfficiencyDefault(this.locale(), this.powertrain()),
  );
  private fuelPriceDefaultSignal = computed(() =>
    fuelPriceDefault(this.locale(), this.powertrain()),
  );

  readonly insurance = computed(() => this.insuranceOverride() ?? this.insuranceDefault());
  readonly fuelEfficiency = computed(
    () => this.fuelEfficiencyOverride() ?? this.fuelEfficiencyDefaultSignal(),
  );
  readonly fuelPrice = computed(() => this.fuelPriceOverride() ?? this.fuelPriceDefaultSignal());

  readonly recommendedTab = computed(() => {
    const annualMiles = this.annualMileage();
    const years = this.keepDuration();
    return recommendTab({
      costPerDistance: {
        lease: costPerDistance(this.leaseBreakdown(), annualMiles, years),
        finance: costPerDistance(this.financeBreakdown(), annualMiles, years),
        cash: costPerDistance(this.cashBreakdown(), annualMiles, years),
      },
      locale: this.locale(),
      distanceUnit: this.localeConfig().distanceUnit,
    });
  });

  readonly leaseEndChoice = computed<LeaseEndChoice>(() => {
    const override = this.leaseEndChoiceOverride();
    if (override) return override;
    return this.keepDuration() * 12 > this.leaseTerm() ? 'buyOut' : 'handBack';
  });

  readonly dispositionFee = computed(
    () => this.dispositionFeeOverride() ?? LEASE_END_DEFAULTS.dispositionFee,
  );
  readonly mileageOverageRate = computed(
    () => this.mileageOverageRateOverride() ?? LEASE_END_DEFAULTS.mileageOverageRate,
  );
  readonly excessWearEstimate = computed(
    () => this.excessWearOverride() ?? LEASE_END_DEFAULTS.excessWearEstimate,
  );
  readonly buyoutFee = computed(() => this.buyoutFeeOverride() ?? LEASE_END_DEFAULTS.buyoutFee);
  // Default approximates a typical lessor's early-exit table — a share of
  // total depreciation proportional to remaining lease term. 0 when keep ≥ term.
  private readonly earlyTerminationFeeDefault = computed(() => {
    const term = this.leaseTerm();
    const keepMonths = this.keepDuration() * 12;
    if (keepMonths >= term) return 0;
    const remainingFraction = (term - keepMonths) / term;
    const totalDepreciation = Math.max(this.purchasePrice() - this.residualValue(), 0);
    return remainingFraction * totalDepreciation;
  });
  // Cap at 90% of the financed portion so the slider can't exceed it.
  readonly earlyTerminationFeeMax = computed(() =>
    Math.max(0.9 * (this.purchasePrice() - this.leaseDownPayment()), 0),
  );
  readonly earlyTerminationFee = computed(() => {
    const override = this.earlyTerminationFeeOverride();
    const value = override ?? this.earlyTerminationFeeDefault();
    return Math.min(value, this.earlyTerminationFeeMax());
  });

  // Auto-derived residual at end of LEASE TERM (not end of keep).
  // Used as buyout price.
  private readonly leaseEndResidualDefault = computed(() => {
    const endAge = this.vehicleAge() + this.leaseTerm() / 12;
    return Math.round(this.msrp() * depreciationFactor(endAge));
  });
  readonly leaseEndResidual = computed(
    () => this.leaseEndResidualOverride() ?? this.leaseEndResidualDefault(),
  );

  readonly leasePaymentDetails = computed(() =>
    leasePayment({
      capCost: this.purchasePrice(),
      downPayment: this.leaseDownPayment(),
      residualValue: this.residualValue(),
      apr: this.leaseApr(),
      termMonths: this.leaseTerm(),
      locale: this.locale(),
    }),
  );

  readonly leaseBreakdown = computed<CostBreakdown>(() =>
    tcoBreakdown({
      tab: 'lease',
      locale: this.locale(),
      powertrain: this.powertrain(),
      purchasePrice: this.purchasePrice(),
      residualValue: this.residualValue(),
      vehicleAge: this.vehicleAge(),
      annualMileage: this.annualMileage(),
      keepDurationYears: this.keepDuration(),
      downPayment: this.leaseDownPayment(),
      insuranceAnnual: this.insurance(),
      maintenanceBase: this.maintenance(),
      maintenanceK: this.maintenanceK(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      chargerStatus: this.chargerStatus(),
      solar: this.solar(),
      apr: this.leaseApr(),
      leaseTermMonths: this.leaseTerm(),
      leaseEndChoice: this.leaseEndChoice(),
      dispositionFee: this.dispositionFee(),
      mileageOverageRate: this.mileageOverageRate(),
      excessWearEstimate: this.excessWearEstimate(),
      buyoutFee: this.buyoutFee(),
      earlyTerminationFee: this.earlyTerminationFee(),
      leaseEndResidual: this.leaseEndResidual(),
      opportunityCostRate: this.opportunityCostRate(),
    }),
  );

  readonly financeBreakdown = computed<CostBreakdown>(() =>
    tcoBreakdown({
      tab: 'finance',
      locale: this.locale(),
      powertrain: this.powertrain(),
      purchasePrice: this.purchasePrice(),
      residualValue: this.residualValue(),
      vehicleAge: this.vehicleAge(),
      annualMileage: this.annualMileage(),
      keepDurationYears: this.keepDuration(),
      downPayment: this.financeDownPayment(),
      insuranceAnnual: this.insurance(),
      maintenanceBase: this.maintenance(),
      maintenanceK: this.maintenanceK(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      chargerStatus: this.chargerStatus(),
      solar: this.solar(),
      apr: this.financeApr(),
      loanTermMonths: this.loanTerm(),
      opportunityCostRate: this.opportunityCostRate(),
    }),
  );

  readonly cashBreakdown = computed<CostBreakdown>(() =>
    tcoBreakdown({
      tab: 'cash',
      locale: this.locale(),
      powertrain: this.powertrain(),
      purchasePrice: this.purchasePrice(),
      residualValue: this.residualValue(),
      vehicleAge: this.vehicleAge(),
      annualMileage: this.annualMileage(),
      keepDurationYears: this.keepDuration(),
      // Cash purchase ties up the FULL price, not a "down payment" — pass 0 so
      // any downstream code that adds it doesn't double-count.
      downPayment: 0,
      insuranceAnnual: this.insurance(),
      maintenanceBase: this.maintenance(),
      maintenanceK: this.maintenanceK(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      chargerStatus: this.chargerStatus(),
      solar: this.solar(),
      opportunityCostRate: this.opportunityCostRate(),
    }),
  );

  readonly effectiveMonthly = (tab: Tab): Signal<number> =>
    computed(() => effectiveMonthly(this.breakdownFor(tab)(), this.keepDuration()));
  readonly costPerDistance = (tab: Tab): Signal<number> =>
    computed(() =>
      costPerDistance(this.breakdownFor(tab)(), this.annualMileage(), this.keepDuration()),
    );

  private breakdownFor(tab: Tab): Signal<CostBreakdown> {
    if (tab === 'lease') return this.leaseBreakdown;
    if (tab === 'finance') return this.financeBreakdown;
    return this.cashBreakdown;
  }

  // Drop running-cost overrides on locale/powertrain change — the previous
  // values (e.g. $2000 US insurance, 28 mpg) are meaningless under the new combo.
  clearRunningCostOverrides(): void {
    this.insuranceOverride.set(null);
    this.fuelEfficiencyOverride.set(null);
    this.fuelPriceOverride.set(null);
  }

  setLocale(v: Locale): void {
    if (this.locale() === v) return;
    this.locale.set(v);
    this.clearRunningCostOverrides();
  }

  setPowertrain(v: Powertrain): void {
    if (this.powertrain() === v) return;
    this.powertrain.set(v);
    this.clearRunningCostOverrides();
  }

  // 'none' also disables solar — solar without a home charger has no effect.
  setChargerStatus(value: ChargerStatus): void {
    this.chargerStatus.set(value);
    if (value === 'none') this.solar.set(false);
  }

  setLeaseEndChoice(value: LeaseEndChoice | null): void {
    this.leaseEndChoiceOverride.set(value);
  }

  applySnapshot(snap: Partial<ScenarioSnapshot>): void {
    const merged: ScenarioSnapshot = {
      globals: { ...this.initial.globals, ...(snap.globals ?? {}) },
      lease: { ...this.initial.lease, ...(snap.lease ?? {}) },
      finance: { ...this.initial.finance, ...(snap.finance ?? {}) },
      cash: { ...this.initial.cash, ...(snap.cash ?? {}) },
      overrides: { ...this.initial.overrides, ...(snap.overrides ?? {}) },
    };
    this._isHydrating.set(true);
    try {
      this.locale.set(merged.globals.locale);
      this.powertrain.set(merged.globals.powertrain);
      this.purchasePrice.set(merged.globals.purchasePrice);
      this.residualValueOverride.set(merged.globals.residualValue);
      this.vehicleAge.set(merged.globals.vehicleAge);
      this.annualMileage.set(merged.globals.annualMileage);
      this.keepDuration.set(merged.globals.keepDuration);
      this.activeTab.set(merged.globals.activeTab);
      this.chargerStatus.set(merged.globals.chargerStatus);
      this.solar.set(merged.globals.solar);

      this.leaseApr.set(merged.lease.apr);
      this.leaseTerm.set(merged.lease.leaseTerm);
      this.leaseDownPayment.set(merged.lease.downPayment);
      this.leaseEndChoiceOverride.set(merged.lease.leaseEndChoice);
      this.dispositionFeeOverride.set(merged.lease.dispositionFee);
      this.mileageOverageRateOverride.set(merged.lease.mileageOverageRate);
      this.excessWearOverride.set(merged.lease.excessWearEstimate);
      this.buyoutFeeOverride.set(merged.lease.buyoutFee);
      this.earlyTerminationFeeOverride.set(merged.lease.earlyTerminationFee);
      this.leaseEndResidualOverride.set(merged.lease.leaseEndResidual);

      this.financeApr.set(merged.finance.apr);
      this.loanTerm.set(merged.finance.loanTerm);
      this.financeDownPayment.set(merged.finance.downPayment);
      this.opportunityCostRate.set(merged.cash.opportunityCostRate);

      this.insuranceOverride.set(merged.overrides.insurance);
      this.fuelEfficiencyOverride.set(merged.overrides.fuelEfficiency);
      this.fuelPriceOverride.set(merged.overrides.fuelPrice);
    } finally {
      this._isHydrating.set(false);
    }
  }

  snapshot(): ScenarioSnapshot {
    return {
      globals: {
        locale: this.locale(),
        powertrain: this.powertrain(),
        purchasePrice: this.purchasePrice(),
        // Persist null on auto-derived; keeps URLs short and lets the curve
        // update if age/keep change.
        residualValue: this.residualValueOverride(),
        vehicleAge: this.vehicleAge(),
        annualMileage: this.annualMileage(),
        keepDuration: this.keepDuration(),
        activeTab: this.activeTab(),
        chargerStatus: this.chargerStatus(),
        solar: this.solar(),
      },
      lease: {
        apr: this.leaseApr(),
        leaseTerm: this.leaseTerm(),
        downPayment: this.leaseDownPayment(),
        leaseEndChoice: this.leaseEndChoiceOverride(),
        dispositionFee: this.dispositionFeeOverride(),
        mileageOverageRate: this.mileageOverageRateOverride(),
        excessWearEstimate: this.excessWearOverride(),
        buyoutFee: this.buyoutFeeOverride(),
        earlyTerminationFee: this.earlyTerminationFeeOverride(),
        leaseEndResidual: this.leaseEndResidualOverride(),
      },
      finance: {
        apr: this.financeApr(),
        loanTerm: this.loanTerm(),
        downPayment: this.financeDownPayment(),
      },
      cash: {
        opportunityCostRate: this.opportunityCostRate(),
      },
      overrides: {
        insurance: this.insuranceOverride(),
        fuelEfficiency: this.fuelEfficiencyOverride(),
        fuelPrice: this.fuelPriceOverride(),
      },
    };
  }

  markHydrated(opts: { hadReturningState: boolean } = { hadReturningState: false }): void {
    this.hasReturningState.set(opts.hadReturningState);
    this.hasHydrated.set(true);
  }

  // Splash → comparison: unblocks autosave (writes `?s=<defaults>` on next
  // tick) and tells AppShell to swap to the comparison page. Also seeds
  // activeTab to the recommended mode so the user lands on the "best" one
  // by default — they can override by clicking another card.
  engage(): void {
    this.activeTab.set(this.recommendedTab().tab);
    this.hasReturningState.set(true);
  }

  reset(): void {
    this.applySnapshot(defaultScenario());
    this.hasReturningState.set(false);
    try {
      const tree = this.router.parseUrl(this.router.url);
      tree.queryParams = {};
      this.location.replaceState(this.router.serializeUrl(tree));
    } catch {
      // router/location not ready; URL clear skipped — non-fatal.
    }
  }

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  constructor() {
    setupAutosave(this, this.router, this.location);
  }
}
