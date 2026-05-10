import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import {
  FormatContext,
  REGION_CONFIG,
  bcp47ForContext,
  fuelEfficiencyDefault,
  fuelPriceDefault,
} from './region.config';
import { LEASE_END_DEFAULTS, defaultScenario } from './scenario.defaults';
import type {
  ChargerStatus,
  CostBreakdown,
  DepreciationCurve,
  Language,
  LeaseEndChoice,
  Region,
  MaintenanceCurve,
  Powertrain,
  ScenarioSnapshot,
  Tab,
} from './scenario.types';
import { writeStoredLanguage } from '../../i18n/detect';
import { backDeriveMsrp } from './calculations/msrp';
import { defaultCurveForPowertrain, depreciationFactor } from './calculations/depreciation';
import { categorize, categoryMultipliers } from './calculations/category';
import { leasePayment } from './calculations/financing';
import {
  MaintenanceContext,
  defaultMaintenanceCurveForPowertrain,
} from './calculations/maintenance';
import { recommendTab } from './calculations/recommendation';
import { costPerDistance, effectiveMonthly, tcoBreakdown } from './calculations/tco';
import { setupAutosave } from './scenario.persistence';
import { ActiveConflict, conflictCountForTab } from './conflicts';
import { formatCurrency } from './region.config';

// Tuple recorded when the user dismisses a conflict pill. The pill stays
// hidden as long as (override, default) match what was dismissed; any
// reactive change to either side re-evaluates and may re-show the pill.
type DismissedAt<T> = { override: T; def: T } | null;

const APR_NEW_CAR = 1.0;
const APR_USED_CAR = 3.0;

@Injectable({ providedIn: 'root' })
export class ScenarioStore {
  private readonly initial = defaultScenario();

  readonly region = signal<Region>(this.initial.globals.region);
  // Language is independent from `region` (which controls units/currency).
  // Detection + persistence live outside the `?s=` snapshot — see
  // PLAN-i18n.md and `setLanguage` below.
  readonly language = signal<Language>('en');
  // Bundle threaded through formatCurrency / formatCompactCurrency. Region
  // picks symbol + placement; language picks number conventions.
  readonly formatContext = computed<FormatContext>(() => ({
    region: this.region(),
    language: this.language(),
  }));
  // Derived BCP-47 for `toLocaleString` callers.
  readonly bcp47 = computed<string>(() => bcp47ForContext(this.formatContext()));
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
  // Curve overrides: null ⇒ use the per-powertrain default. Toggling
  // powertrain leaves an explicit override in place (single global slot).
  readonly depreciationCurveOverride = signal<DepreciationCurve | null>(
    this.initial.globals.depreciationCurve,
  );
  readonly maintenanceCurveOverride = signal<MaintenanceCurve | null>(
    this.initial.globals.maintenanceCurve,
  );

  readonly leaseAprOverride = signal<number | null>(this.initial.lease.apr);
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

  // Lease APR auto-derives from vehicleAge: new cars qualify for promotional
  // ~1% manufacturer financing; used cars run ~3%.
  private readonly leaseAprDefault = computed(() =>
    this.vehicleAge() === 0 ? APR_NEW_CAR : APR_USED_CAR,
  );
  readonly leaseApr = computed(() => this.leaseAprOverride() ?? this.leaseAprDefault());
  // Per-lever tolerances are deliberately much wider than one slider step
  // so the pill only fires when the deviation is materially significant,
  // not for sub-step drift, rounding artefacts, or small judgement nudges.
  // Roughly ~5–10 slider steps / ~5–10% of the typical default.
  private readonly leaseAprBindings = this.bindConflict(
    this.leaseAprOverride,
    () => this.leaseAprDefault(),
    numEq(0.25),
  );
  readonly leaseAprConflict = this.leaseAprBindings.conflict;
  readonly leaseAprPillVisible = this.leaseAprBindings.pillVisible;
  dismissLeaseApr(): void {
    this.leaseAprBindings.dismiss();
  }
  applyLeaseApr(): void {
    this.leaseAprBindings.apply();
  }

  readonly depreciationCurve = computed(
    () => this.depreciationCurveOverride() ?? defaultCurveForPowertrain(this.powertrain()),
  );

  readonly msrp = computed(() =>
    backDeriveMsrp(this.purchasePrice(), this.vehicleAge(), this.depreciationCurve()),
  );
  readonly vehicleCategory = computed(() => categorize(this.msrp(), this.region()));
  readonly categoryMultipliers = computed(() => categoryMultipliers(this.vehicleCategory()));
  readonly regionConfig = computed(() => REGION_CONFIG[this.region()]);
  readonly currencyPrefix = computed(() => {
    const cfg = this.regionConfig();
    return cfg.currencyAfter ? '' : cfg.currencySymbol;
  });
  readonly currencySuffix = computed(() => {
    const cfg = this.regionConfig();
    return cfg.currencyAfter ? ' ' + cfg.currencySymbol : '';
  });

  private readonly residualValueDefault = computed(() => {
    const endAge = this.vehicleAge() + this.keepDuration();
    return Math.round(this.msrp() * depreciationFactor(endAge, this.depreciationCurve()));
  });
  readonly residualValue = computed(
    () => this.residualValueOverride() ?? this.residualValueDefault(),
  );
  setResidualValue(value: number | null): void {
    this.residualValueOverride.set(value);
  }
  private readonly residualValueBindings = this.bindConflict(
    this.residualValueOverride,
    () => this.residualValueDefault(),
    numEq(3000),
  );
  readonly residualValueConflict = this.residualValueBindings.conflict;
  readonly residualValuePillVisible = this.residualValueBindings.pillVisible;
  dismissResidualValue(): void {
    this.residualValueBindings.dismiss();
  }
  applyResidualValue(): void {
    this.residualValueBindings.apply();
  }

  private insuranceDefault = computed(() => {
    const cfg = this.regionConfig();
    return this.purchasePrice() * cfg.insuranceRate * this.categoryMultipliers().insurance;
  });
  // Heavy drivers wear cars out faster — scale every term of the maintenance
  // curve by annualMileage / nominal so the band steepens.
  private readonly mileageFactor = computed(() => {
    const nominal = this.region() === 'US' ? 12000 : 15000;
    return Math.max(this.annualMileage() / nominal, 0);
  });
  readonly maintenanceCurve = computed(
    () =>
      this.maintenanceCurveOverride() ?? defaultMaintenanceCurveForPowertrain(this.powertrain()),
  );
  // Bundle threaded through TCO calculations: msrp × curve(age) × catMult ×
  // mileageFactor is the standard per-year maintenance formula. Lease-warranty
  // branch in tco-lease scales only the growth above year-0 by 0.5.
  readonly maintenanceContext = computed<MaintenanceContext>(() => ({
    msrp: this.msrp(),
    curve: this.maintenanceCurve(),
    categoryMult: this.categoryMultipliers().maintenance,
    mileageFactor: this.mileageFactor(),
  }));
  private fuelEfficiencyDefaultSignal = computed(() =>
    fuelEfficiencyDefault(this.region(), this.powertrain()),
  );
  private fuelPriceDefaultSignal = computed(() =>
    fuelPriceDefault(this.region(), this.powertrain()),
  );

  readonly insurance = computed(() => this.insuranceOverride() ?? this.insuranceDefault());
  readonly fuelEfficiency = computed(
    () => this.fuelEfficiencyOverride() ?? this.fuelEfficiencyDefaultSignal(),
  );
  readonly fuelPrice = computed(() => this.fuelPriceOverride() ?? this.fuelPriceDefaultSignal());

  private readonly insuranceBindings = this.bindConflict(
    this.insuranceOverride,
    () => this.insuranceDefault(),
    numEq(150),
  );
  readonly insuranceConflict = this.insuranceBindings.conflict;
  readonly insurancePillVisible = this.insuranceBindings.pillVisible;
  dismissInsurance(): void {
    this.insuranceBindings.dismiss();
  }
  applyInsurance(): void {
    this.insuranceBindings.apply();
  }

  // Tolerance is unit-dependent (mpg vs L/100km, mi/kWh vs kWh/100km), so
  // the comparator must read powertrain/locale reactively — that's why we
  // close over `this` rather than passing a static epsilon.
  private readonly fuelEfficiencyBindings = this.bindConflict(
    this.fuelEfficiencyOverride,
    () => this.fuelEfficiencyDefaultSignal(),
    numEqDynamic(() => fuelEfficiencyTolerance(this.powertrain(), this.region())),
  );
  readonly fuelEfficiencyConflict = this.fuelEfficiencyBindings.conflict;
  readonly fuelEfficiencyPillVisible = this.fuelEfficiencyBindings.pillVisible;
  dismissFuelEfficiency(): void {
    this.fuelEfficiencyBindings.dismiss();
  }
  applyFuelEfficiency(): void {
    this.fuelEfficiencyBindings.apply();
  }

  private readonly fuelPriceBindings = this.bindConflict(
    this.fuelPriceOverride,
    () => this.fuelPriceDefaultSignal(),
    numEqDynamic(() => fuelPriceTolerance(this.powertrain(), this.region())),
  );
  readonly fuelPriceConflict = this.fuelPriceBindings.conflict;
  readonly fuelPricePillVisible = this.fuelPriceBindings.pillVisible;
  dismissFuelPrice(): void {
    this.fuelPriceBindings.dismiss();
  }
  applyFuelPrice(): void {
    this.fuelPriceBindings.apply();
  }

  readonly recommendedTab = computed(() => {
    const annualMiles = this.annualMileage();
    const years = this.keepDuration();
    return recommendTab({
      costPerDistance: {
        lease: costPerDistance(this.leaseBreakdown(), annualMiles, years),
        finance: costPerDistance(this.financeBreakdown(), annualMiles, years),
        cash: costPerDistance(this.cashBreakdown(), annualMiles, years),
      },
    });
  });

  private readonly leaseEndChoiceDefault = computed<LeaseEndChoice>(() =>
    this.keepDuration() * 12 > this.leaseTerm() ? 'buyOut' : 'handBack',
  );
  readonly leaseEndChoice = computed<LeaseEndChoice>(
    () => this.leaseEndChoiceOverride() ?? this.leaseEndChoiceDefault(),
  );
  private readonly leaseEndChoiceBindings = this.bindConflict<LeaseEndChoice>(
    this.leaseEndChoiceOverride,
    () => this.leaseEndChoiceDefault(),
  );
  readonly leaseEndChoiceConflict = this.leaseEndChoiceBindings.conflict;
  readonly leaseEndChoicePillVisible = this.leaseEndChoiceBindings.pillVisible;
  dismissLeaseEndChoice(): void {
    this.leaseEndChoiceBindings.dismiss();
  }
  applyLeaseEndChoice(): void {
    this.leaseEndChoiceBindings.apply();
  }

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
  private readonly earlyTerminationFeeBindings = this.bindConflict(
    this.earlyTerminationFeeOverride,
    () => this.earlyTerminationFeeDefault(),
    numEq(500),
  );
  readonly earlyTerminationFeeConflict = this.earlyTerminationFeeBindings.conflict;
  readonly earlyTerminationFeePillVisible = this.earlyTerminationFeeBindings.pillVisible;
  dismissEarlyTerminationFee(): void {
    this.earlyTerminationFeeBindings.dismiss();
  }
  applyEarlyTerminationFee(): void {
    this.earlyTerminationFeeBindings.apply();
  }

  // Auto-derived residual at end of LEASE TERM (not end of keep).
  // Used as buyout price.
  private readonly leaseEndResidualDefault = computed(() => {
    const endAge = this.vehicleAge() + this.leaseTerm() / 12;
    return Math.round(this.msrp() * depreciationFactor(endAge, this.depreciationCurve()));
  });
  readonly leaseEndResidual = computed(
    () => this.leaseEndResidualOverride() ?? this.leaseEndResidualDefault(),
  );
  private readonly leaseEndResidualBindings = this.bindConflict(
    this.leaseEndResidualOverride,
    () => this.leaseEndResidualDefault(),
    numEq(3000),
  );
  readonly leaseEndResidualConflict = this.leaseEndResidualBindings.conflict;
  readonly leaseEndResidualPillVisible = this.leaseEndResidualBindings.pillVisible;
  dismissLeaseEndResidual(): void {
    this.leaseEndResidualBindings.dismiss();
  }
  applyLeaseEndResidual(): void {
    this.leaseEndResidualBindings.apply();
  }

  // Lease payment uses the LEASE-END residual (contractual figure at end of
  // lease term), not the end-of-keep residual. Critical when keep > term:
  // with a 4-yr lease and a 10-yr keep, end-of-keep residual is ~$11k while
  // the contract's residual at year 4 is ~$22k — the contract amortizes
  // (capCost − leaseEndResidual), not (capCost − whatever-the-car-is-worth-when-you-eventually-stop-keeping-it).
  readonly leasePaymentDetails = computed(() =>
    leasePayment({
      capCost: this.purchasePrice(),
      downPayment: this.leaseDownPayment(),
      residualValue: this.leaseEndResidual(),
      apr: this.leaseApr(),
      termMonths: this.leaseTerm(),
      region: this.region(),
    }),
  );

  // Shared TCO inputs across all three modes (vehicle context + running-cost
  // knobs + opp-cost rate). Per-mode breakdowns spread this and add their
  // financing-specific fields (down payment, APR, term, lease-end choice…).
  private readonly commonBreakdownArgs = computed(() => ({
    region: this.region(),
    powertrain: this.powertrain(),
    purchasePrice: this.purchasePrice(),
    residualValue: this.residualValue(),
    vehicleAge: this.vehicleAge(),
    annualMileage: this.annualMileage(),
    keepDurationYears: this.keepDuration(),
    insuranceAnnual: this.insurance(),
    maintenance: this.maintenanceContext(),
    fuelEfficiency: this.fuelEfficiency(),
    fuelPrice: this.fuelPrice(),
    chargerStatus: this.chargerStatus(),
    solar: this.solar(),
    opportunityCostRate: this.opportunityCostRate(),
  }));

  readonly leaseBreakdown = computed<CostBreakdown>(() =>
    tcoBreakdown({
      tab: 'lease',
      ...this.commonBreakdownArgs(),
      downPayment: this.leaseDownPayment(),
      apr: this.leaseApr(),
      leaseTermMonths: this.leaseTerm(),
      leaseEndChoice: this.leaseEndChoice(),
      dispositionFee: this.dispositionFee(),
      mileageOverageRate: this.mileageOverageRate(),
      excessWearEstimate: this.excessWearEstimate(),
      buyoutFee: this.buyoutFee(),
      earlyTerminationFee: this.earlyTerminationFee(),
      leaseEndResidual: this.leaseEndResidual(),
    }),
  );

  readonly financeBreakdown = computed<CostBreakdown>(() =>
    tcoBreakdown({
      tab: 'finance',
      ...this.commonBreakdownArgs(),
      downPayment: this.financeDownPayment(),
      apr: this.financeApr(),
      loanTermMonths: this.loanTerm(),
    }),
  );

  readonly cashBreakdown = computed<CostBreakdown>(() =>
    tcoBreakdown({
      tab: 'cash',
      ...this.commonBreakdownArgs(),
      // Cash purchase ties up the FULL price, not a "down payment" — pass 0 so
      // any downstream code that adds it doesn't double-count.
      downPayment: 0,
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

  // Round-trip stashes for running-cost overrides. Toggling ICE↔EV or US↔EU
  // would otherwise discard the user's custom values, since unit-mismatched
  // overrides have to be dropped during the toggle. The stash holds each
  // previous value, keyed by the combo it belongs to, so toggling back
  // restores it. Insurance keys on locale only; fuel keys on (locale, pt).
  private readonly insuranceStash = new Map<Region, number | null>();
  private readonly fuelEffStash = new Map<string, number | null>();
  private readonly fuelPriceStash = new Map<string, number | null>();
  private fuelComboKey(region: Region, pt: Powertrain): string {
    return `${region}|${pt}`;
  }

  setRegion(v: Region): void {
    if (this.region() === v) return;
    const oldRegion = this.region();
    const pt = this.powertrain();
    this.stashInsuranceOverride(oldRegion);
    this.stashFuelOverrides(oldRegion, pt);
    this.region.set(v);
    this.restoreInsuranceOverride(v);
    this.restoreFuelOverrides(v, pt);
  }

  // Updates the active UI language. Syncs to Transloco so templates re-render,
  // and (by default) writes to localStorage so a manual override survives
  // reload. APP_INITIALIZER passes `persist: false` for browser-detected
  // values — only user-initiated flips should write storage.
  setLanguage(v: Language, opts: { persist?: boolean } = { persist: true }): void {
    if (this.language() === v) {
      // Still ensure Transloco is in sync on initial APP_INITIALIZER call.
      if (this.transloco.getActiveLang() !== v) this.transloco.setActiveLang(v);
      return;
    }
    this.language.set(v);
    this.transloco.setActiveLang(v);
    if (opts.persist) writeStoredLanguage(v);
  }

  setPowertrain(v: Powertrain): void {
    if (this.powertrain() === v) return;
    const reg = this.region();
    const oldPt = this.powertrain();
    // Insurance keys on region only — powertrain toggle leaves it alone.
    this.stashFuelOverrides(reg, oldPt);
    this.powertrain.set(v);
    this.restoreFuelOverrides(reg, v);
  }

  private stashInsuranceOverride(region: Region): void {
    this.insuranceStash.set(region, this.insuranceOverride());
  }
  private restoreInsuranceOverride(region: Region): void {
    this.insuranceOverride.set(this.insuranceStash.get(region) ?? null);
  }
  private stashFuelOverrides(region: Region, pt: Powertrain): void {
    const key = this.fuelComboKey(region, pt);
    this.fuelEffStash.set(key, this.fuelEfficiencyOverride());
    this.fuelPriceStash.set(key, this.fuelPriceOverride());
  }
  private restoreFuelOverrides(region: Region, pt: Powertrain): void {
    const key = this.fuelComboKey(region, pt);
    this.fuelEfficiencyOverride.set(this.fuelEffStash.get(key) ?? null);
    this.fuelPriceOverride.set(this.fuelPriceStash.get(key) ?? null);
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
      this.region.set(merged.globals.region);
      this.powertrain.set(merged.globals.powertrain);
      this.purchasePrice.set(merged.globals.purchasePrice);
      this.residualValueOverride.set(merged.globals.residualValue);
      this.vehicleAge.set(merged.globals.vehicleAge);
      this.annualMileage.set(merged.globals.annualMileage);
      this.keepDuration.set(merged.globals.keepDuration);
      this.activeTab.set(merged.globals.activeTab);
      this.chargerStatus.set(merged.globals.chargerStatus);
      this.solar.set(merged.globals.solar);
      this.depreciationCurveOverride.set(merged.globals.depreciationCurve);
      this.maintenanceCurveOverride.set(merged.globals.maintenanceCurve);

      this.leaseAprOverride.set(merged.lease.apr);
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
        region: this.region(),
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
        depreciationCurve: this.depreciationCurveOverride(),
        maintenanceCurve: this.maintenanceCurveOverride(),
      },
      lease: {
        apr: this.leaseAprOverride(),
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

  // Aggregated descriptor list for the warnings UI. Each entry corresponds
  // to a visible conflict pill — the descriptors carry verbose reason copy,
  // formatted current/proposed values, and Apply/Keep callbacks. Filtered
  // by `*PillVisible` so dismissed conflicts and pre-hydration state
  // produce an empty list automatically.
  readonly activeConflicts = computed<readonly ActiveConflict[]>(() => {
    const out: ActiveConflict[] = [];
    const fmt = this.formatContext();
    const lang = this.language();
    const t = (key: string, params?: Record<string, unknown>) =>
      this.transloco.translate(key, params, lang);

    if (this.leaseAprPillVisible()) {
      const override = this.leaseAprOverride()!;
      const def = this.leaseAprDefault();
      out.push({
        key: 'leaseApr',
        scope: 'lease',
        label: t('conflicts.leaseApr.label'),
        reason: t('conflicts.leaseApr.reason'),
        currentValue: `${override}%`,
        proposedValue: `${def}%`,
        sliderAnchor: 'slider-leaseApr',
        apply: () => this.applyLeaseApr(),
        keep: () => this.dismissLeaseApr(),
      });
    }
    if (this.residualValuePillVisible()) {
      const override = this.residualValueOverride()!;
      const def = this.residualValueDefault();
      out.push({
        key: 'residualValue',
        scope: 'global',
        label: t('conflicts.residualValue.label'),
        reason: t('conflicts.residualValue.reason'),
        currentValue: formatCurrency(override, fmt, 0),
        proposedValue: formatCurrency(def, fmt, 0),
        sliderAnchor: 'slider-residualValue',
        apply: () => this.applyResidualValue(),
        keep: () => this.dismissResidualValue(),
      });
    }
    if (this.insurancePillVisible()) {
      const override = this.insuranceOverride()!;
      const def = this.insuranceDefault();
      out.push({
        key: 'insurance',
        scope: 'global',
        label: t('conflicts.insurance.label'),
        reason: t('conflicts.insurance.reason'),
        currentValue: formatCurrency(override, fmt, 0),
        proposedValue: formatCurrency(def, fmt, 0),
        sliderAnchor: 'slider-insurance',
        apply: () => this.applyInsurance(),
        keep: () => this.dismissInsurance(),
      });
    }
    if (this.fuelEfficiencyPillVisible()) {
      const override = this.fuelEfficiencyOverride()!;
      const def = this.fuelEfficiencyDefaultSignal();
      const unit =
        this.powertrain() === 'EV'
          ? this.regionConfig().evEfficiencyUnit
          : this.regionConfig().iceEfficiencyUnit;
      const isEV = this.powertrain() === 'EV';
      out.push({
        key: 'fuelEfficiency',
        scope: 'global',
        label: t(isEV ? 'conflicts.evEfficiency.label' : 'conflicts.fuelEfficiency.label'),
        reason: t(isEV ? 'conflicts.evEfficiency.reason' : 'conflicts.fuelEfficiency.reason', {
          region: this.region(),
        }),
        currentValue: `${override} ${unit}`,
        proposedValue: `${def} ${unit}`,
        sliderAnchor: 'slider-fuelEfficiency',
        apply: () => this.applyFuelEfficiency(),
        keep: () => this.dismissFuelEfficiency(),
      });
    }
    if (this.fuelPricePillVisible()) {
      const override = this.fuelPriceOverride()!;
      const def = this.fuelPriceDefaultSignal();
      const isEV = this.powertrain() === 'EV';
      out.push({
        key: 'fuelPrice',
        scope: 'global',
        label: t(isEV ? 'conflicts.electricityPrice.label' : 'conflicts.fuelPrice.label'),
        reason: t(isEV ? 'conflicts.electricityPrice.reason' : 'conflicts.fuelPrice.reason', {
          region: this.region(),
        }),
        currentValue: formatCurrency(override, fmt, 2),
        proposedValue: formatCurrency(def, fmt, 2),
        sliderAnchor: 'slider-fuelPrice',
        apply: () => this.applyFuelPrice(),
        keep: () => this.dismissFuelPrice(),
      });
    }
    if (this.leaseEndChoicePillVisible()) {
      const override = this.leaseEndChoiceOverride()!;
      const def = this.leaseEndChoiceDefault();
      const choiceLabel = (c: LeaseEndChoice) => t(`leaseEnd.choice.${c}`);
      out.push({
        key: 'leaseEndChoice',
        scope: 'lease',
        label: t('conflicts.leaseEndChoice.label'),
        reason: t('conflicts.leaseEndChoice.reason'),
        currentValue: choiceLabel(override),
        proposedValue: choiceLabel(def),
        sliderAnchor: 'slider-leaseEndChoice',
        apply: () => this.applyLeaseEndChoice(),
        keep: () => this.dismissLeaseEndChoice(),
      });
    }
    if (this.earlyTerminationFeePillVisible()) {
      const override = this.earlyTerminationFeeOverride()!;
      const def = this.earlyTerminationFeeDefault();
      out.push({
        key: 'earlyTerminationFee',
        scope: 'lease',
        label: t('conflicts.earlyTerminationFee.label'),
        reason: t('conflicts.earlyTerminationFee.reason'),
        currentValue: formatCurrency(override, fmt, 0),
        proposedValue: formatCurrency(def, fmt, 0),
        sliderAnchor: 'slider-earlyTerminationFee',
        apply: () => this.applyEarlyTerminationFee(),
        keep: () => this.dismissEarlyTerminationFee(),
      });
    }
    if (this.leaseEndResidualPillVisible()) {
      const override = this.leaseEndResidualOverride()!;
      const def = this.leaseEndResidualDefault();
      out.push({
        key: 'leaseEndResidual',
        scope: 'lease',
        label: t('conflicts.leaseEndResidual.label'),
        reason: t('conflicts.leaseEndResidual.reason'),
        currentValue: formatCurrency(override, fmt, 0),
        proposedValue: formatCurrency(def, fmt, 0),
        sliderAnchor: 'slider-leaseEndResidual',
        apply: () => this.applyLeaseEndResidual(),
        keep: () => this.dismissLeaseEndResidual(),
      });
    }
    return out;
  });

  conflictCount(tab: Tab): number {
    return conflictCountForTab(this.activeConflicts(), tab);
  }

  // Active conflicts filtered to the currently selected tab — global
  // conflicts are always visible, tab-scoped ones only when their tab is
  // active. Drives the warnings list at the top of the comparison page.
  readonly visibleConflicts = computed<readonly ActiveConflict[]>(() => {
    const tab = this.activeTab();
    return this.activeConflicts().filter((c) => c.scope === 'global' || c.scope === tab);
  });

  // Per-lever descriptor lookup — same source of truth as the warnings list,
  // so an inline pill and its corresponding warnings-list row format their
  // values identically. Returns undefined when the lever has no active
  // conflict (dismissed, hydrating, or override matches default).
  readonly conflictByKey = computed(() => {
    const map = new Map<string, ActiveConflict>();
    for (const c of this.activeConflicts()) map.set(c.key, c);
    return map;
  });

  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    setupAutosave(this, this.router, this.location);
  }

  // Builds the conflict + dismissal + apply machinery for one override-pattern
  // lever. The dismissed-at tuple records (override, default) at the moment
  // the user clicked "Keep mine"; the pill stays hidden as long as that pair
  // matches the current pair, so any reactive change to either side
  // re-evaluates and may re-show the pill.
  //
  // `equals` controls "fuzziness" — small numeric drifts under one slider
  // step shouldn't fire a pill. Default is strict ===; numeric levers pass
  // an absolute-tolerance comparator (`numEq(step)`).
  private bindConflict<T>(
    override: WritableSignal<T | null>,
    defaultGetter: () => T,
    equals: (a: T, b: T) => boolean = (a, b) => a === b,
  ): {
    conflict: Signal<boolean>;
    pillVisible: Signal<boolean>;
    dismiss: () => void;
    apply: () => void;
  } {
    const dismissedAt = signal<DismissedAt<T | null>>(null);
    const conflict = computed(() => {
      const o = override();
      return o !== null && !equals(o as T, defaultGetter());
    });
    const pillVisible = computed(() => {
      if (!this.hasHydrated()) return false;
      if (!conflict()) return false;
      const d = dismissedAt();
      if (d === null) return true;
      return d.override !== override() || d.def !== defaultGetter();
    });
    return {
      conflict,
      pillVisible,
      dismiss: () =>
        dismissedAt.set({ override: override(), def: defaultGetter() }),
      apply: () => {
        override.set(null);
        dismissedAt.set(null);
      },
    };
  }
}

// Absolute-tolerance equality for numeric levers. `step` is typically the
// slider's step size — values within ±step of each other count as "equal"
// for conflict purposes, so sub-step drift doesn't fire a pill.
function numEq(step: number): (a: number, b: number) => boolean {
  return (a, b) => Math.abs(a - b) <= step;
}

// Variant of numEq where the tolerance itself depends on reactive state
// (powertrain, locale). Read at comparison time so the bound `computed`
// re-evaluates when the underlying signals change.
function numEqDynamic(toleranceFn: () => number): (a: number, b: number) => boolean {
  return (a, b) => Math.abs(a - b) <= toleranceFn();
}

// EV ranges are far wider than ICE; regions use different units.
//   EV  US: 1.5 mi/kWh,  EU: 6 kWh/100km
//   ICE US: 2 mpg,       EU: 1 L/100km
function fuelEfficiencyTolerance(powertrain: Powertrain, region: Region): number {
  if (powertrain === 'EV') return region === 'US' ? 1.5 : 6;
  return region === 'US' ? 2 : 1;
}

// Electricity and pump prices use different units per region.
//   EV  US: $0.05/kWh,  EU: €0.10/kWh
//   ICE US: $0.30/gal,  EU: €0.15/L
function fuelPriceTolerance(powertrain: Powertrain, region: Region): number {
  if (powertrain === 'EV') return region === 'US' ? 0.05 : 0.1;
  return region === 'US' ? 0.3 : 0.15;
}
