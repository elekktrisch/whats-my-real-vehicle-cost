import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-divider',
  template: `<span [class]="cls()" role="separator" [attr.aria-orientation]="orientation()"></span>`,
})
export class Divider {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly inset = input(false);

  protected readonly cls = computed(() => {
    const base = 'block bg-border';
    if (this.orientation() === 'vertical') {
      return `${base} w-px h-full ${this.inset() ? 'mx-3' : ''}`;
    }
    return `${base} h-px w-full ${this.inset() ? 'my-3' : ''}`;
  });
}