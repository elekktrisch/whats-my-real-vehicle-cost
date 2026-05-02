import { Component, computed, input } from '@angular/core';

export type IconName =
  | 'logo'
  | 'lock'
  | 'card'
  | 'chevron-down'
  | 'chevron-right'
  | 'check'
  | 'close'
  | 'edit'
  | 'share'
  | 'reset';

interface IconDef {
  paths: string[];
  viewBox?: string;
}

const REGISTRY: Record<IconName, IconDef> = {
  logo: {
    paths: [
      'M12 2L2 7L12 12L22 7L12 2Z',
      'M2 17L12 22L22 17',
      'M2 12L12 17L22 12',
    ],
  },
  lock: {
    paths: ['M3 11h18v11H3z M7 11V7a5 5 0 0 1 10 0v4'],
  },
  card: {
    paths: ['M1 4h22v16H1z', 'M1 10h22'],
  },
  'chevron-down': { paths: ['M6 9l6 6 6-6'] },
  'chevron-right': { paths: ['M9 6l6 6-6 6'] },
  check: { paths: ['M5 12l5 5L20 7'] },
  close: { paths: ['M6 6l12 12 M18 6L6 18'] },
  edit: { paths: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'] },
  share: {
    paths: [
      'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8',
      'M16 6l-4-4-4 4',
      'M12 2v13',
    ],
  },
  reset: {
    paths: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v6h6'],
  },
};

@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.viewBox]="viewBox()"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-label]="ariaLabel() || null"
      [attr.role]="ariaLabel() ? 'img' : 'presentation'"
      [attr.aria-hidden]="ariaLabel() ? null : 'true'"
    >
      @for (d of paths(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  host: { class: 'inline-block leading-none' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(1.5);
  readonly ariaLabel = input('');

  protected readonly paths = computed(() => REGISTRY[this.name()].paths);
  protected readonly viewBox = computed(() => REGISTRY[this.name()].viewBox ?? '0 0 24 24');
}