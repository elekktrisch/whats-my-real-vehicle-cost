import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-disclosure',
  template: `
    <div class="flex flex-col">
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        class="self-start font-ui text-[0.85rem] font-medium text-accent hover:text-accent/80 tracking-[0.02em] underline underline-offset-4 decoration-accent/40 hover:decoration-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-[4px] px-1 -mx-1 transition-colors duration-150"
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
  readonly label = input.required<string>();
  // When omitted, the open label is the closed one with leading `+` flipped to `−`.
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