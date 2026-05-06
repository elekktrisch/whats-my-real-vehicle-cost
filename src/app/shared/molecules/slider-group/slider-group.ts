import { Component, OnDestroy, input, signal } from '@angular/core';

@Component({
  selector: 'app-slider-group',
  template: `
    <section class="bg-surface border border-border rounded-[14px] py-4 px-3 sm:py-[22px] sm:px-5">
      <div
        class="font-ui text-[0.75rem] font-medium tracking-[0.15em] uppercase text-tx-dim pb-[14px] mb-5 border-b border-border flex items-center justify-between gap-2"
      >
        <span>{{ title() }}</span>
        @if (caption()) {
          <span class="font-mono text-[0.75rem] text-tx-muted normal-case tracking-normal">{{
            caption()
          }}</span>
        }
        <button
          type="button"
          class="slider-group-edit-pill"
          [class.slider-group-edit-pill-active]="!locked()"
          (click)="toggle()"
          [attr.aria-pressed]="!locked()"
        >
          {{ locked() ? 'Edit' : 'Editing' }}
        </button>
      </div>
      <div
        class="slider-group-body"
        [attr.data-locked]="locked()"
        (touchstart)="onInteract()"
        (mousedown)="onInteract()"
        (keydown)="onInteract()"
      >
        <ng-content />
      </div>
    </section>
  `,
})
export class SliderGroup implements OnDestroy {
  readonly title = input.required<string>();
  readonly caption = input('');

  // Locked by default on touch devices; CSS gates the visible effect to
  // `@media (pointer: coarse)` so desktop ignores this state entirely.
  protected readonly locked = signal(true);
  private unlockTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly RELOCK_AFTER_MS = 5000;

  protected toggle(): void {
    if (this.locked()) {
      this.locked.set(false);
      this.scheduleRelock();
    } else {
      this.clearTimer();
      this.locked.set(true);
    }
  }

  protected onInteract(): void {
    if (!this.locked()) this.scheduleRelock();
  }

  private scheduleRelock(): void {
    this.clearTimer();
    this.unlockTimer = setTimeout(
      () => this.locked.set(true),
      SliderGroup.RELOCK_AFTER_MS,
    );
  }

  private clearTimer(): void {
    if (this.unlockTimer !== null) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
