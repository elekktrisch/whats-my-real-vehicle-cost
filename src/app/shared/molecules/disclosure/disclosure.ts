import { Component, computed, input, signal } from '@angular/core';

/**
 * "+ Show overrides" / "− Hide overrides" disclosure. Per-section local
 * state, defaults closed, **not** persisted to URL — every session starts
 * with the section collapsed.
 *
 * Body styling (left accent bar + indent) lives on `.disclosure-body` in
 * styles.css so any consumer using the same conventions matches visually.
 */
@Component({
  selector: 'app-disclosure',
  template: `
    <div class="flex flex-col">
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        class="self-start font-ui text-[0.78rem] text-tx-muted hover:text-tx tracking-[0.02em] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-[4px] px-1 -mx-1"
      >
        {{ buttonText() }}
      </button>
      @if (open()) {
        <div class="disclosure-body">
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class Disclosure {
  /** Label when collapsed. e.g. "+ Show overrides". */
  readonly label = input.required<string>();
  /** Label when expanded. Defaults to flipping the leading `+` to `−` on
   * `label`; pass explicitly for asymmetric copy. */
  readonly labelWhenOpen = input<string>('');

  protected readonly open = signal(false);

  protected readonly buttonText = computed(() => {
    if (this.open()) {
      const explicit = this.labelWhenOpen();
      if (explicit) return explicit;
      return this.label().replace(/^\+\s*/, '− ');
    }
    return this.label();
  });

  protected toggle(): void {
    this.open.update((v) => !v);
  }
}