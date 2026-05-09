import {
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Icon } from '../../atoms/icon/icon';
import { shorten } from '../../../scenario/shortener';

const PAGE_TITLE = 'Real Cost of my Vehicle';

type ShareState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-share-dialog',
  imports: [Icon],
  template: `
    <dialog
      #dlg
      (close)="onDialogClose()"
      (click)="onBackdropClick($event)"
      class="m-auto p-0 rounded-[18px] bg-surface text-tx border border-border max-w-[420px] w-[calc(100%-2rem)] [&::backdrop]:bg-black/60 [&::backdrop]:backdrop-blur-sm"
    >
      <div class="p-6 sm:p-7 flex flex-col gap-5">
        <header class="flex items-center justify-between">
          <h2 class="font-ui text-[1rem] font-medium tracking-[-0.01em] text-tx">
            Share scenario
          </h2>
          <button
            type="button"
            (click)="close()"
            aria-label="Close"
            class="size-7 inline-flex items-center justify-center rounded-[8px] text-tx-muted hover:text-tx hover:bg-elevated transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <app-icon name="close" [size]="16" />
          </button>
        </header>

        <div class="flex flex-col gap-2">
          <div
            class="flex items-center gap-2 h-10 px-3 rounded-[8px] bg-elevated border border-border"
          >
            @if (state() === 'loading') {
              <span
                class="inline-block size-3 rounded-full border-2 border-border border-t-accent animate-spin"
                aria-hidden="true"
              ></span>
              <span class="font-ui text-[0.78rem] text-tx-dim">Generating short link…</span>
            } @else {
              <span
                class="font-mono text-[0.78rem] text-tx truncate flex-1"
                [title]="resolvedUrl()"
              >
                {{ resolvedUrl() }}
              </span>
              <button
                type="button"
                (click)="copy()"
                [disabled]="busy()"
                class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed font-ui text-[0.7rem] font-medium tracking-[0.06em] uppercase transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <app-icon [name]="copied() ? 'check' : 'link'" [size]="12" />
                {{ copied() ? 'Copied!' : 'Copy' }}
              </button>
            }
          </div>
          @if (state() === 'error') {
            <p class="font-ui text-[0.7rem] text-tx-dim">
              Couldn't shorten — using full link.
            </p>
          }
        </div>

        <div class="flex flex-col gap-2">
          <p class="font-ui text-[0.72rem] tracking-[0.08em] uppercase text-tx-dim">
            Or send via
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              (click)="openWhatsApp()"
              [disabled]="busy()"
              [class]="channelBtnClass"
            >
              <app-icon name="whatsapp" [size]="14" /> WhatsApp
            </button>
            <button
              type="button"
              (click)="openTelegram()"
              [disabled]="busy()"
              [class]="channelBtnClass"
            >
              <app-icon name="telegram" [size]="14" /> Telegram
            </button>
            <button
              type="button"
              (click)="openEmail()"
              [disabled]="busy()"
              [class]="channelBtnClass"
            >
              <app-icon name="mail" [size]="14" /> Email
            </button>
            <button
              type="button"
              (click)="openX()"
              [disabled]="busy()"
              [class]="channelBtnClass"
            >
              <app-icon name="x" [size]="14" /> X / Twitter
            </button>
          </div>
        </div>

        @if (canSystemShare) {
          <button
            type="button"
            (click)="systemShare()"
            [disabled]="busy()"
            [class]="systemShareBtnClass"
          >
            <app-icon name="share" [size]="14" /> Use system share sheet
          </button>
        }
      </div>
    </dialog>
  `,
})
export class ShareDialog {
  readonly open = model(false);
  readonly longUrl = input.required<string>();
  readonly keepDuration = input.required<number>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly state = signal<ShareState>('idle');
  protected readonly resolvedUrl = signal<string>('');
  protected readonly copied = signal(false);

  protected readonly canSystemShare =
    this.isBrowser && typeof navigator !== 'undefined' && 'share' in navigator;

  protected readonly busy = computed(() => this.state() === 'loading');

  protected readonly shareText = computed(() => {
    const yrs = Math.max(Math.round(this.keepDuration()), 1);
    return `What this car really costs over ${yrs} year${yrs === 1 ? '' : 's'}`;
  });

  protected readonly channelBtnClass =
    'inline-flex items-center justify-center gap-2 h-10 px-3 rounded-[8px] bg-transparent border border-border-strong text-tx-muted hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed font-ui text-[0.78rem] font-medium tracking-[0.04em] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';

  protected readonly systemShareBtnClass =
    'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[8px] bg-accent/10 border border-accent/30 text-accent hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed font-ui text-[0.78rem] font-medium tracking-[0.04em] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const dlg = this.dialogRef()?.nativeElement;
      if (!dlg) return;
      if (isOpen) {
        if (!dlg.open) dlg.showModal();
        untracked(() => {
          this.copied.set(false);
          this.state.set('loading');
          this.resolvedUrl.set('');
          void this.runShortenerOnce(this.longUrl());
        });
      } else {
        if (dlg.open) dlg.close();
      }
    });
  }

  private async runShortenerOnce(url: string): Promise<void> {
    const result = await shorten(url);
    if (!this.open()) return;
    if (url !== this.longUrl()) return;
    this.resolvedUrl.set(result.url);
    this.state.set(result.shortened ? 'success' : 'error');
  }

  protected onDialogClose(): void {
    this.open.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) this.open.set(false);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected async copy(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(this.resolvedUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // No clipboard permission — user can manually select+copy the URL.
    }
  }

  protected openWhatsApp(): void {
    const text = `${this.shareText()} — ${this.resolvedUrl()}`;
    this.openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  protected openTelegram(): void {
    const url = this.resolvedUrl();
    const text = this.shareText();
    this.openExternal(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    );
  }

  protected openEmail(): void {
    const subject = encodeURIComponent(PAGE_TITLE);
    const body = encodeURIComponent(`${this.shareText()} — ${this.resolvedUrl()}`);
    this.openExternal(`mailto:?subject=${subject}&body=${body}`);
  }

  protected openX(): void {
    const url = this.resolvedUrl();
    const text = this.shareText();
    this.openExternal(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    );
  }

  protected async systemShare(): Promise<void> {
    if (!this.canSystemShare) return;
    try {
      await navigator.share({
        title: PAGE_TITLE,
        text: this.shareText(),
        url: this.resolvedUrl(),
      });
      this.open.set(false);
    } catch {
      // User cancelled the share or share failed; leave popup open.
    }
  }

  private openExternal(href: string): void {
    if (typeof window === 'undefined') return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}
