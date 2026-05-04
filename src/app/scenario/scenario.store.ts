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
import { depreciationFactor } from './calculations/depreciation';
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
  private readonly _residualValueOverride = signal<number | null>(
    this.initial.globals.residualValue,
  );
  readonly vehicleAge = signal(this.initial.globals.vehicleAge);
  readonly annualMileage = signal(this.initial.globals.annualMileage);
  readonly keepDuration = signal(this.initial.globals.keepDuration);
  readonly activeTab = signal<Tab>(this.initial.globals.activeTab);

  readonly leaseApr = signal(this.initial.lease.apr);
  readonly leaseTerm = signal(this.initial.lease.leaseTerm);
  readonly leaseDownPayment = signal(this.initial.lease.downPayment);
  private readonly _leaseEndOverride = signal<LeaseEndChoice | null>(null);
  private readonly _dispositionFeeOverride = signal<number | null>(this.initial.lease.dispositionFee);
  private readonly _mileageOverageRateOverride = signal<number | null>(
    this.initial.lease.mileageOverageRate,
  );
  private readonly _excessWearOverride = signal<number | null>(this.initial.lease.excessWearEstimate);
  private readonly _buyoutFeeOverride = signal<number | null>(this.initial.lease.buyoutFee);
  private readonly _earlyTerminationFeeOverride = signal<number | null>(
    this.initial.lease.earlyTerminationFee,
  );

  readonly financeApr = signal(this.initial.finance.apr);
  readonly loanTerm = signal(this.initial.finance.loanTerm);
  readonly financeDownPayment = signal(this.initial.finance.downPayment);

  /** The active tab's down payment, for components that need a single value
   * tied to the current tab (vehicle context bar, hero, recommendation). Cash
   * tab returns purchasePrice since cash purchase ties up the full amount. */
  readonly activeDownPayment = computed(() => {
    const tab = this.activeTab();
    if (tab === 'lease') return this.leaseDownPayment();
    if (tab === 'finance') return this.financeDownPayment();
    return this.purchasePrice();
  });
  setActiveDownPayment(value: number): void {
    const tab = this.activeTab();
    if (tab === 'lease') this.leaseDownPayment.set(value);
    else if (tab === 'finance') this.financeDownPayment.set(value);
    // cash: noop — driven by purchase price
  }

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

  /** Autosave gate — true once APP_INITIALIZER finishes, regardless of cold/warm boot. */
  readonly hasHydrated = signal(false);
  /** Splash skip seam — true only if URL or localStorage carried user state. */
  readonly hasReturningState = signal(false);
  private readonly _isHydrating = signal(false);
  readonly isHydrating = this._isHydrating.asReadonly();

  readonly msrp = computed(() => backDeriveMsrp(this.purchasePrice(), this.vehicleAge()));
  readonly vehicleCategory = computed(() => categorize(this.msrp(), this.locale()));
  readonly categoryMultipliers = computed(() => categoryMultipliers(this.vehicleCategory()));
  readonly localeConfig = computed(() => LOCALE_CONFIG[this.locale()]);

  /** What the car is expected to be worth at the end of the keep period. */
  private readonly residualValueDefault = computed(() => {
    const endAge = this.vehicleAge() + this.keepDuration();
    return Math.round(this.msrp() * depreciationFactor(endAge));
  });
  readonly residualValue = computed(
    () => this._residualValueOverride() ?? this.residualValueDefault(),
  );
  setResidualValue(value: number | null): void {
    this._residualValueOverride.set(value);
  }

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
  /** Default approximates a typical lessor's early-exit table: a share of the
   * full depreciation (purchasePrice − residualValue) proportional to how much
   * of the lease term remains. Zero when keep ≥ term (no early exit). */
  private readonly earlyTerminationFeeDefault = computed(() => {
    const term = this.leaseTerm();
    const keepMonths = this.keepDuration() * 12;
    if (keepMonths >= term) return 0;
    const remainingFraction = (term - keepMonths) / term;
    const totalDepreciation = Math.max(this.purchasePrice() - this.residualValue(), 0);
    return remainingFraction * totalDepreciation;
  });
  /** Hard cap so the slider can't exceed 90% of the financed portion. The
   * lease's own down payment is what's relevant here (slider lives in the
   * lease-end-section). */
  readonly earlyTerminationFeeMax = computed(() =>
    Math.max(0.9 * (this.purchasePrice() - this.leaseDownPayment()), 0),
  );
  readonly earlyTerminationFee = computed(() => {
    const override = this._earlyTerminationFeeOverride();
    const value = override ?? this.earlyTerminationFeeDefault();
    return Math.min(value, this.earlyTerminationFeeMax());
  });

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
      earlyTerminationFee: this.earlyTerminationFee(),
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
      maintenanceAnnual: this.maintenance(),
      fuelEfficiency: this.fuelEfficiency(),
      fuelPrice: this.fuelPrice(),
      homeChargerInstall: this.homeChargerInstall(),
      categoryMultipliers: this.categoryMultipliers(),
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

  /**
   * Drop every running-cost override so the next read returns the locale/powertrain
   * default. Called when the user switches US/EU or ICE/EV — the existing override
   * (e.g. $2000 US insurance, 28 mpg, $3.5/gal) is meaningless under the new combo.
   */
  clearRunningCostOverrides(): void {
    this._insuranceOverride.set(null);
    this._maintenanceOverride.set(null);
    this._fuelEfficiencyOverride.set(null);
    this._fuelPriceOverride.set(null);
    this._homeChargerOverride.set(null);
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
  setEarlyTerminationFee(value: number | null): void {
    this._earlyTerminationFeeOverride.set(value);
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
      this._residualValueOverride.set(merged.globals.residualValue);
      this.vehicleAge.set(merged.globals.vehicleAge);
      this.annualMileage.set(merged.globals.annualMileage);
      this.keepDuration.set(merged.globals.keepDuration);
      this.activeTab.set(merged.globals.activeTab);

      this.leaseApr.set(merged.lease.apr);
      this.leaseTerm.set(merged.lease.leaseTerm);
      this.leaseDownPayment.set(merged.lease.downPayment);
      this._leaseEndOverride.set(merged.lease.leaseEndChoice);
      this._dispositionFeeOverride.set(merged.lease.dispositionFee);
      this._mileageOverageRateOverride.set(merged.lease.mileageOverageRate);
      this._excessWearOverride.set(merged.lease.excessWearEstimate);
      this._buyoutFeeOverride.set(merged.lease.buyoutFee);
      this._earlyTerminationFeeOverride.set(merged.lease.earlyTerminationFee);

      this.financeApr.set(merged.finance.apr);
      this.loanTerm.set(merged.finance.loanTerm);
      this.financeDownPayment.set(merged.finance.downPayment);
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
        // Persist null when the user is on the auto-derived default — keeps
        // URLs short and lets the curve update if the user changes age/keep.
        residualValue: this._residualValueOverride(),
        vehicleAge: this.vehicleAge(),
        annualMileage: this.annualMileage(),
        keepDuration: this.keepDuration(),
        activeTab: this.activeTab(),
      },
      lease: {
        apr: this.leaseApr(),
        leaseTerm: this.leaseTerm(),
        downPayment: this.leaseDownPayment(),
        leaseEndChoice: this._leaseEndOverride(),
        dispositionFee: this._dispositionFeeOverride(),
        mileageOverageRate: this._mileageOverageRateOverride(),
        excessWearEstimate: this._excessWearOverride(),
        buyoutFee: this._buyoutFeeOverride(),
        earlyTerminationFee: this._earlyTerminationFeeOverride(),
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
        insurance: this._insuranceOverride(),
        maintenance: this._maintenanceOverride(),
        fuelEfficiency: this._fuelEfficiencyOverride(),
        fuelPrice: this._fuelPriceOverride(),
        homeChargerInstall: this._homeChargerOverride(),
      },
    };
  }

  markHydrated(opts: { hadReturningState: boolean } = { hadReturningState: false }): void {
    this.hasReturningState.set(opts.hadReturningState);
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

    // Cross-field invariants: down payments and any residual override can
    // never exceed the purchase price. Re-clamp whenever purchase price moves
    // down. We clamp the OVERRIDE only (the auto-derived default is always
    // ≤ price by construction since depreciationFactor ≤ 1).
    effect(() => {
      const price = this.purchasePrice();
      if (this.isHydrating()) return;
      if (this.leaseDownPayment() > price) this.leaseDownPayment.set(price);
      if (this.financeDownPayment() > price) this.financeDownPayment.set(price);
      const residualOverride = this._residualValueOverride();
      if (residualOverride !== null && residualOverride > price) {
        this._residualValueOverride.set(price);
      }
    });

    // Re-track the auto-derived residual whenever its drivers change. Without
    // this, a user-set residual (say 20k for a 5-yr keep) would stay frozen
    // even after the user bumped keep to 10 yr. Baseline lets us distinguish
    // "first run after hydration" from "user actually changed an input".
    let residualBaseline: { price: number; age: number; keep: number } | null = null;
    effect(() => {
      const price = this.purchasePrice();
      const age = this.vehicleAge();
      const keep = this.keepDuration();
      if (this.isHydrating() || !this.hasHydrated()) return;
      if (residualBaseline === null) {
        residualBaseline = { price, age, keep };
        return;
      }
      if (
        price !== residualBaseline.price ||
        age !== residualBaseline.age ||
        keep !== residualBaseline.keep
      ) {
        this._residualValueOverride.set(null);
        residualBaseline = { price, age, keep };
      }
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