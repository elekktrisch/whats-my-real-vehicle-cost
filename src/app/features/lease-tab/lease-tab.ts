import { Component, computed, inject } from '@angular/core';
import { ScenarioStore } from '../../scenario/scenario.store';
import { SliderControl } from '../../shared/slider-control/slider-control';
import { SliderGroup } from '../../shared/molecules/slider-group/slider-group';
import { LeaseEndSection } from '../../shared/molecules/lease-end-section/lease-end-section';
import { formatCurrency } from '../../scenario/locale.config';

@Component({
  selector: 'app-lease-tab',
  imports: [SliderControl, SliderGroup, LeaseEndSection],
  template: `
    <div class="flex flex-col gap-[14px]">
      <div
        class="hero-card border border-[rgba(79,142,247,0.18)] rounded-2xl px-[34px] pt-[28px] pb-[24px] relative overflow-hidden [background:linear-gradient(140deg,#0c1a30_0%,#08101f_100%)]"
      >
        <div
          class="font-ui text-[0.62rem] font-medium tracking-[0.16em] uppercase text-accent mb-[8px]"
        >
          Monthly lease payment
        </div>
        <div class="flex items-baseline gap-[5px] mb-3 relative z-[1]">
          <span class="font-mono text-[1.8rem] font-medium text-tx-muted leading-none">{{
            currencySymbol()
          }}</span>
          <span
            class="font-mono text-[3.6rem] font-medium text-tx leading-none tracking-[-0.03em]"
            >{{ monthlyDisplay() }}</span
          >
        </div>
        <div
          class="font-ui text-[0.65rem] text-tx-dim tracking-[0.07em] uppercase relative z-[1] flex flex-wrap gap-x-3"
        >
          <span>{{ store.leaseTerm() }}-month lease</span>
          <span>·</span>
          <span>{{ leaseRateLabel() }} {{ rateDisplay() }}</span>
          <span>·</span>
          <span>{{ category() }} category</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-[14px] items-start">
        <app-slider-group title="Financing">
          <app-slider-control
            label="APR"
            tip="The annual percentage rate. Internally we convert to a money factor (US) or Leasingfaktor (EU) — same math, different label."
            [min]="0"
            [max]="20"
            [step]="0.05"
            minLabel="0%"
            maxLabel="20%"
            suffix="%"
            [fractionDigits]="2"
            [value]="store.leaseApr()"
            (valueChange)="store.leaseApr.set($event)"
          />
          <app-slider-control
            label="Lease term"
            tip="How long the lease runs. Common terms are 24, 36, 48, or 60 months."
            [min]="12"
            [max]="84"
            [step]="1"
            minLabel="12 mo"
            maxLabel="84 mo"
            suffix=" mo"
            [value]="store.leaseTerm()"
            (valueChange)="store.leaseTerm.set($event)"
          />
        </app-slider-group>

        <app-slider-group title="TCO inputs" caption="Defaults from purchase price + powertrain">
          <app-slider-control
            label="Insurance / yr"
            tip="Annual insurance cost. Defaults to purchase price × 5% (US) or 4% (EU), tuned by vehicle category."
            [min]="0"
            [max]="6000"
            [step]="25"
            minLabel="$0"
            maxLabel="$6k"
            prefix="$"
            [value]="insurance()"
            (valueChange)="store.setOverride('lease', 'insurance', $event)"
          />
          <app-slider-control
            label="Maintenance / yr"
            tip="Annual maintenance cost. Defaults to MSRP × 1.5% (ICE) or 0.7% (EV), scaled by age and vehicle category."
            [min]="0"
            [max]="4000"
            [step]="25"
            minLabel="$0"
            maxLabel="$4k"
            prefix="$"
            [value]="maintenance()"
            (valueChange)="store.setOverride('lease', 'maintenance', $event)"
          />
          <app-slider-control
            [label]="fuelEfficiencyLabel()"
            tip="Vehicle efficiency. ICE uses mpg (US) or L/100km (EU). EV uses mi/kWh (US) or kWh/100km (EU)."
            [min]="fuelEfficiencyMin()"
            [max]="fuelEfficiencyMax()"
            [step]="0.1"
            [fractionDigits]="1"
            [minLabel]="fuelEfficiencyMinLabel()"
            [maxLabel]="fuelEfficiencyMaxLabel()"
            [suffix]="' ' + fuelEfficiencyUnit()"
            [value]="fuelEfficiency()"
            (valueChange)="store.setOverride('lease', 'fuelEfficiency', $event)"
          />
          <app-slider-control
            [label]="fuelPriceLabel()"
            tip="Per-unit price for fuel or electricity at your locale's typical rate."
            [min]="0"
            [max]="fuelPriceMax()"
            [step]="0.01"
            [fractionDigits]="2"
            minLabel="$0"
            [maxLabel]="fuelPriceMaxLabel()"
            [prefix]="fuelPriceSymbol()"
            [suffix]="fuelPriceSuffix()"
            [value]="fuelPrice()"
            (valueChange)="store.setOverride('lease', 'fuelPrice', $event)"
          />
        </app-slider-group>
      </div>

      <app-lease-end-section />
    </div>
  `,
})
export class LeaseTab {
  protected readonly store = inject(ScenarioStore);

  protected readonly insurance = this.store.insurance('lease');
  protected readonly maintenance = this.store.maintenance('lease');
  protected readonly fuelEfficiency = this.store.fuelEfficiency('lease');
  protected readonly fuelPrice = this.store.fuelPrice('lease');

  protected readonly currencySymbol = computed(() => this.store.localeConfig().currencySymbol);
  protected readonly leaseRateLabel = computed(() => this.store.localeConfig().leaseRateLabel);
  protected readonly rateDisplay = computed(() => {
    const apr = this.store.leaseApr();
    if (this.store.locale() === 'EU') return (apr / 24).toFixed(3);
    return (apr / 2400).toFixed(5);
  });
  protected readonly monthlyDisplay = computed(() =>
    this.store.leasePaymentDetails().monthlyPayment.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  protected readonly category = computed(() => {
    const c = this.store.vehicleCategory();
    return c.charAt(0).toUpperCase() + c.slice(1);
  });

  protected readonly fuelEfficiencyUnit = computed(() => {
    const cfg = this.store.localeConfig();
    return this.store.powertrain() === 'EV' ? cfg.evEfficiencyUnit : cfg.iceEfficiencyUnit;
  });
  protected readonly fuelEfficiencyLabel = computed(() => {
    const pt = this.store.powertrain();
    return pt === 'EV' ? 'EV efficiency' : 'Fuel efficiency';
  });
  protected readonly fuelEfficiencyMin = computed(() => 1);
  protected readonly fuelEfficiencyMax = computed(() => {
    const cfg = this.store.localeConfig();
    if (this.store.powertrain() === 'EV') return this.store.locale() === 'US' ? 6 : 30;
    return this.store.locale() === 'US' ? 80 : 15;
  });
  protected readonly fuelEfficiencyMinLabel = computed(() => `1 ${this.fuelEfficiencyUnit()}`);
  protected readonly fuelEfficiencyMaxLabel = computed(
    () => `${this.fuelEfficiencyMax()} ${this.fuelEfficiencyUnit()}`,
  );

  protected readonly fuelPriceLabel = computed(() =>
    this.store.powertrain() === 'EV' ? 'Electricity price' : 'Fuel price',
  );
  protected readonly fuelPriceSymbol = computed(() => this.store.localeConfig().currencySymbol);
  protected readonly fuelPriceSuffix = computed(() => {
    const cfg = this.store.localeConfig();
    if (this.store.powertrain() === 'EV') return ' /kWh';
    return this.store.locale() === 'US' ? ' /gal' : ' /L';
  });
  protected readonly fuelPriceMax = computed(() => {
    if (this.store.powertrain() === 'EV') return 1;
    return this.store.locale() === 'US' ? 8 : 3;
  });
  protected readonly fuelPriceMaxLabel = computed(() => {
    const max = this.fuelPriceMax();
    return formatCurrency(max, this.store.locale(), 2);
  });
}