import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InfoBadge } from '../info-badge/info-badge';

@Component({
  selector: 'app-slider-control',
  imports: [InfoBadge],
  templateUrl: './slider-control.html',
  host: { class: 'block mb-[22px]' },
})
export class SliderControl {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) tip!: string;
  @Input({ required: true }) min!: number;
  @Input({ required: true }) max!: number;
  @Input() step = 1;
  @Input({ required: true }) minLabel!: string;
  @Input({ required: true }) maxLabel!: string;
  @Input({ required: true }) readout!: string;
  @Input({ required: true }) value!: number;
  @Output() valueChange = new EventEmitter<number>();

  get pct(): string {
    return `${((this.value - this.min) / (this.max - this.min)) * 100}%`;
  }

  onInput(event: Event): void {
    this.valueChange.emit(+(event.target as HTMLInputElement).value);
  }
}