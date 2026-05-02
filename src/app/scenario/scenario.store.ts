import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { LOCALE_CONFIG, fuelEfficiencyDefault, fuelPriceDefault } from './locale.config';
import { LEASE_END_DEFAULTS, defaultScenario } from './scenario.defaults';
import type {
  CostBreakdown,
  LeaseEndChoice,
  Locale,
  Powertrain,
  ScenarioSnapshot,
  Tab,
} from './scenario.types';
import { backDeriveMsrp } from './calculations/msrp';
import { categorize, categoryMultipliers } from './calculations/category';
import { leasePayment } from './calculations/financing';
import { recommendTab } from './calculations/recommendation';
import { costPerDistance, effectiveMonthly, tcoBreakdown } from './calculations/tco';
import { STORAGE_KEY, toLocalStorage, toQueryParams } from './scenario.serializer';

export type TcoSlot =
  | 'insurance'
  | 'maintenance'
  | 'fuelEfficiency'
  | 'fuelPrice'
  | 'homeChargerInstall';

@Injectable({ providedIn: 'root' })
export class ScenarioStore {
  private readonly initial = defaultScenario();

  readonly locale = signal<Locale>(this.initial.globals.locale);
  readonly powertrain = signal<Powertrain>(this.initial.globals.powertrain);
  readonly purchasePrice = signal(this.initial.globals.purchasePrice);
  readonly residualValue = signal(this.initial.globals.residualValue);
  readonly vehicleAge = signal(this.initial.globals.vehicleAge);
  readonly annualMileage = signal(this.initial.globals.annualMileage);
  readonly keepDuration = signal(this.initial.globals.keepDuration);
  readonly downPayment = signal(this.initial.globals.downPayment);
  readonly activeTab = signal<Tab>(this.initial.globals.activeTab);

  readonly leaseApr = signal(this.initial.lease.apr);
  readonly leaseTerm = signal(this.initial.lease.leaseTerm);
  private readonly _leaseEndOverride = signal<LeaseEndChoice | null>(null);
  private readonly _dispositionFeeOverride = signal<number | null>(this.initial.lease.dispositionFee);
  private readonly _mileageOverageRateOverride = signal<number | null>(
    this.initial.lease.mileageOverageRate,
  );
  private readonly _excessWearOverride = signal<number | null>(this.initial.lease.excessWearEstimate);
  private readonly _buyoutFeeOverride = signal<number | null>(this.initial.lease.buyoutFee);

  readonly financeApr = signal(this.initial.finance.apr);
  readonly loanTerm = signal(this.initial.finance.loanTerm);

  readonly opportunityCostRate = signal(this.initial.cash.opportunityCostRate);

  private readonly _insuranceOverride = signal<number | null>(this.initial.overrides.insurance);
  private readonly _maintenanceOverride = signal<number | null>(this.initial.overrides.maintenance);
  private readonly _fuelEfficiencyOverride = signal<number | null>(
    this.initial.overrides.fuelEfficiency,
  );
  private readonly _fuelPriceOverride = signal<number | null>(this.initial.overrides.fuelPrice);
  private readonly _homeChargerOverride = signal<number | null>(
    this.initial.overrides.homeChargerInstall,
  );

  readonly hasHydrated = signal(false);
  private readonly _isHydrating = signal(false);
  readonly isHydrating = this._isHydrating.asReadonly();

  readonly msrp = computed(() => backDeriveMsrp(this.purchasePrice(), this.vehicleAge()));
  readonly vehicleCategory = computed(() => categorize(this.msrp(), this.locale()));
  readonly categoryMultipliers = computed(() => categoryMultipliers(this.vehicleCategory()));
  readonly localeConfig = computed(() => LOCALE_CONFIG[this.locale()]);

  private insuranceDefault = computed(() => {
    const cfg = this.localeConfig();
    return this.purchasePrice() * cfg.insuranceRate * this.categoryMultipliers().insurance;
  });
  private maintenanceDefault = computed(() => {
    const baseRate = this.powertrain() === 'EV' ? 0.007 : 0.015;
    const ageFactor = 1 + this.vehicleAge() * 0.1;
    return this.msrp() * baseRate * ageFactor * this.categoryMultipliers().maintenance;
  });
  private fuelEfficiencyDefaultSignal = computed(() =>
    fuelEfficiencyDefault(this.locale(), this.powertrain()),
  );
  private fuelPriceDefaultSignal = computed(() =>
    fuelPriceDefault(this.locale(), this.powertrain()),
  );
  private homeChargerDefault = computed(() => 0);

  readonly insurance = computed(() => this._insuranceOverride() ?? this.insuranceDefault());
  readonly maintenance = computed(() => this._maintenanceOverride() ?? this.maintenanceDefault());
  readonly fuelEfficiency = computed(
    () => this._fuelEfficiencyOverride() ?? this.fuelEfficiencyDefaultSignal(),
  );
  readonly fuelPrice = computed(() => this._fuelPriceOverride() ?? this.fuelPriceDefaultSignal());
  readonly homeChargerInstall = computed(
    () => this._homeChargerOverride() ?? this.homeChargerDefault(),
  );

  readonly recommendedTab = computed(() =>
    recommendTab({
      purchasePrice: this.purchasePrice(),
      downPayment: this.downPayment(),
      keepDuration: this.keepDuration(),
      annualMileage: this.annualMileage(),
      locale: this.locale(),
    }),
  );

  readonly leaseEndChoice = computed<LeaseEndChoice>(() => {
    const override = this._leaseEndOverride();
    if (override) return override;
    return this.keepDuration() * 12 > this.leaseTerm() ? 'buyOut' : 'handBack';
  });

  readonly dispositionFee = computed(
    () => this._dispositionFeeOverride() ?? LEASE_END_DEFAULTS.dispositionFee,
  );
  readonly mileageOverageRate = computed(
    () => this._mileageOverageRateOverride() ?? LEASE_END_DEFAULTS.mileageOverageRate,
  );
  readonly excessWearEstimate = computed(
    () => this._excessWearOverride() ?? LEASE_END_DEFAULTS.excessWearEstimate,
  );
  readonly buyoutFee = computed(() => this._buyoutFeeOverride() ?? LEASE_END_DEFAULTS.buyoutFee);

  readonly leasePaymentDetails = computed(() =>
    leasePayment({
      capCost: this.purchasePrice(),
      downPayment: this.downPayment(),
      residualValue: this.residualValue(),
      apr: this.leaseApr(),
      termMonths: this.leaseTerm(),
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
      downPayment: this.downPayment(),
      insuranceAnnual: this.insurance(),
      maintenanceAnnual: this.maintenance(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      homeChargerInstall: this.homeChargerInstall(),
      categoryMultipliers: this.categoryMultipliers(),
      apr: this.leaseApr(),
      leaseTermMonths: this.leaseTerm(),
      leaseEndChoice: this.leaseEndChoice(),
      dispositionFee: this.dispositionFee(),
      mileageOverageRate: this.mileageOverageRate(),
      excessWearEstimate: this.excessWearEstimate(),
      buyoutFee: this.buyoutFee(),
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
      downPayment: this.downPayment(),
      insuranceAnnual: this.insurance(),
      maintenanceAnnual: this.maintenance(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      homeChargerInstall: this.homeChargerInstall(),
      categoryMultipliers: this.categoryMultipliers(),
      apr: this.financeApr(),
      loanTermMonths: this.loanTerm(),
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
      downPayment: this.downPayment(),
      insuranceAnnual: this.insurance(),
      maintenanceAnnual: this.maintenance(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      homeChargerInstall: this.homeChargerInstall(),
      categoryMultipliers: this.categoryMultipliers(),
      opportunityCostRate: this.opportunityCostRate(),
    }),
  );

  readonly breakdownForActiveTab = computed<CostBreakdown>(() => {
    const tab = this.activeTab();
    if (tab === 'lease') return this.leaseBreakdown();
    if (tab === 'finance') return this.financeBreakdown();
    return this.cashBreakdown();
  });

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

  setOverride(slot: TcoSlot, value: number | null): void {
    const map: Record<TcoSlot, ReturnType<typeof signal<number | null>>> = {
      insurance: this._insuranceOverride,
      maintenance: this._maintenanceOverride,
      fuelEfficiency: this._fuelEfficiencyOverride,
      fuelPrice: this._fuelPriceOverride,
      homeChargerInstall: this._homeChargerOverride,
    };
    map[slot].set(value);
  }

  setLeaseEndChoice(value: LeaseEndChoice | null): void {
    this._leaseEndOverride.set(value);
  }
  setDispositionFee(value: number | null): void {
    this._dispositionFeeOverride.set(value);
  }
  setMileageOverageRate(value: number | null): void {
    this._mileageOverageRateOverride.set(value);
  }
  setExcessWearEstimate(value: number | null): void {
    this._excessWearOverride.set(value);
  }
  setBuyoutFee(value: number | null): void {
    this._buyoutFeeOverride.set(value);
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
      this.residualValue.set(merged.globals.residualValue);
      this.vehicleAge.set(merged.globals.vehicleAge);
      this.annualMileage.set(merged.globals.annualMileage);
      this.keepDuration.set(merged.globals.keepDuration);
      this.downPayment.set(merged.globals.downPayment);
      this.activeTab.set(merged.globals.activeTab);

      this.leaseApr.set(merged.lease.apr);
      this.leaseTerm.set(merged.lease.leaseTerm);
      this._leaseEndOverride.set(merged.lease.leaseEndChoice);
      this._dispositionFeeOverride.set(merged.lease.dispositionFee);
      this._mileageOverageRateOverride.set(merged.lease.mileageOverageRate);
      this._excessWearOverride.set(merged.lease.excessWearEstimate);
      this._buyoutFeeOverride.set(merged.lease.buyoutFee);

      this.financeApr.set(merged.finance.apr);
      this.loanTerm.set(merged.finance.loanTerm);
      this.opportunityCostRate.set(merged.cash.opportunityCostRate);

      this._insuranceOverride.set(merged.overrides.insurance);
      this._maintenanceOverride.set(merged.overrides.maintenance);
      this._fuelEfficiencyOverride.set(merged.overrides.fuelEfficiency);
      this._fuelPriceOverride.set(merged.overrides.fuelPrice);
      this._homeChargerOverride.set(merged.overrides.homeChargerInstall);
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
        residualValue: this.residualValue(),
        vehicleAge: this.vehicleAge(),
        annualMileage: this.annualMileage(),
        keepDuration: this.keepDuration(),
        downPayment: this.downPayment(),
        activeTab: this.activeTab(),
      },
      lease: {
        apr: this.leaseApr(),
        leaseTerm: this.leaseTerm(),
        leaseEndChoice: this._leaseEndOverride(),
        dispositionFee: this._dispositionFeeOverride(),
        mileageOverageRate: this._mileageOverageRateOverride(),
        excessWearEstimate: this._excessWearOverride(),
        buyoutFee: this._buyoutFeeOverride(),
      },
      finance: {
        apr: this.financeApr(),
        loanTerm: this.loanTerm(),
      },
      cash: {
        opportunityCostRate: this.opportunityCostRate(),
      },
      overrides: {
        insurance: this._insuranceOverride(),
        maintenance: this._maintenanceOverride(),
        fuelEfficiency: this._fuelEfficiencyOverride(),
        fuelPrice: this._fuelPriceOverride(),
        homeChargerInstall: this._homeChargerOverride(),
      },
    };
  }

  markHydrated(): void {
    this.hasHydrated.set(true);
  }

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  constructor() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    effect(() => {
      const snap = this.snapshot();
      if (this.isHydrating() || !this.hasHydrated()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => this.persist(snap), 200);
    });
  }

  private persist(snap: ScenarioSnapshot): void {
    try {
      localStorage.setItem(STORAGE_KEY, toLocalStorage(snap));
    } catch {
      // storage unavailable (private mode, quota); silent.
    }
    try {
      const tree = this.router.parseUrl(this.router.url);
      tree.queryParams = toQueryParams(snap);
      this.location.replaceState(this.router.serializeUrl(tree));
    } catch {
      // router/location not ready; URL sync skipped.
    }
  }
}