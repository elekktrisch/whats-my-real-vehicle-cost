import { Component, ElementRef, HostListener, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

let nextId = 0;

@Component({
  selector: 'app-info-badge',
  imports: [TranslocoPipe],
  template: `
    <button
      type="button"
      class="info-badge inline-flex items-center justify-center min-w-[24px] min-h-[24px] p-[3px] bg-transparent border-0 cursor-help relative align-middle shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      [attr.data-tip]="tip()"
      [attr.aria-describedby]="describedById()"
      [attr.aria-label]="'common.moreInfo' | transloco"
    >
      <span
        class="inline-flex items-center justify-center size-[16px] text-[12px] leading-none font-ui rounded-full bg-elevated border border-border-strong text-tx-muted"
      >
        ?
      </span>
      <!-- aria-hidden keeps this span out of ancestor "name from content"
           compute (e.g. mode-card tabs). aria-describedby references still
           resolve through aria-hidden subtrees per ARIA spec, so screen
           readers still announce the tip when the badge is focused. -->
      <span class="sr-only" [id]="describedById()" aria-hidden="true">{{ tip() }}</span>
    </button>
  `,
})
export class InfoBadge {
  readonly tip = input.required<string>();

  protected readonly describedById = computed(() => `info-badge-tip-${this.uid}`);
  private readonly uid = ++nextId;
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener('keydown.escape')
  protected onEscape(): void {
    const btn = this.host.nativeElement.querySelector('button') as HTMLButtonElement | null;
    btn?.blur();
  }
}