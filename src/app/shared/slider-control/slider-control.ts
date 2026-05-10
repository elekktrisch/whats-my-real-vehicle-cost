import { Component, computed, input, model, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { InfoBadge } from '../info-badge/info-badge';

@Component({
  selector: 'app-slider-control',
  imports: [InfoBadge, TranslocoPipe],
  templateUrl: './slider-control.html',
  host: { class: 'block mb-[22px]' },
})
export class SliderControl {
  readonly label = input.required<string>();
  readonly tip = input.required<string>();
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly step = input(1);
  readonly minLabel = input.required<string>();
  readonly maxLabel = input.required<string>();
  readonly prefix = input('');
  readonly suffix = input('');
  readonly fractionDigits = input(0);
  readonly value = model.required<number>();
  // null (default) = lever has no auto/override mode (e.g. raw inputs like
  // vehicleAge). true = currently auto-tracking. false = user has overridden.
  readonly isAuto = input<boolean | null>(null);
  readonly reset = output<void>();

  protected readonly focused = signal(false);

  protected readonly pct = computed(() => {
    const range = this.max() - this.min();
    if (range <= 0) return '0%';
    const clamped = Math.min(Math.max(this.value(), this.min()), this.max());
    return `${((clamped - this.min()) / range) * 100}%`;
  });

  protected readonly display = computed(() => {
    const fd = this.fractionDigits();
    if (this.focused()) {
      return Number.isFinite(this.value()) ? String(this.value()) : '';
    }
    return this.value().toLocaleString(undefined, {
      minimumFractionDigits: fd,
      maximumFractionDigits: fd,
    });
  });

  protected onSlider(event: Event): void {
    this.value.set(+(event.target as HTMLInputElement).value);
  }

  protected onTyped(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = parseFloat(raw.replace(/[^\d.\-]/g, ''));
    if (Number.isFinite(parsed)) this.value.set(parsed);
  }

  protected onBlur(event: Event): void {
    this.focused.set(false);
    const v = this.value();
    if (!Number.isFinite(v)) {
      this.value.set(this.min());
    } else if (v < this.min()) {
      this.value.set(this.min());
    } else if (v > this.max()) {
      this.value.set(this.max());
    }
    (event.target as HTMLInputElement).value = this.display();
  }
}