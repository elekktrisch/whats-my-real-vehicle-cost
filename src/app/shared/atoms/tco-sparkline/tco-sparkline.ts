import { Component, computed, input } from '@angular/core';

/** Pure: project cumulative-TCO `points` (length N, increasing) onto an SVG
 * polyline `points` string. Shared yMax across all sparklines on the page
 * keeps the three modes visually comparable. Empty input → empty string. */
export function sparklinePath(
  pts: readonly number[],
  yMax: number,
  width: number,
  height: number,
  pad = 1.5,
): string {
  const n = pts.length;
  if (n < 2) return '';
  const safeMax = Math.max(yMax, 1);
  const innerH = height - 2 * pad;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * width;
    const yNorm = Math.min(Math.max(pts[i] / safeMax, 0), 1);
    const y = pad + innerH * (1 - yNorm);
    out.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return out.join(' ');
}

/**
 * Tiny cumulative-TCO sparkline. The y-scale is shared across all three
 * mode cards (passed in via `yMax`) so the recommended card's line is
 * literally the lowest. Aria-hidden because the numbers in the surrounding
 * card carry the truth — the line is decoration.
 */
@Component({
  selector: 'app-tco-sparkline',
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      [attr.width]="width()"
      [attr.height]="height()"
      preserveAspectRatio="none"
      aria-hidden="true"
      class="block"
    >
      <polyline
        [attr.points]="path()"
        fill="none"
        [attr.stroke]="strokeColor()"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  `,
})
export class TcoSparkline {
  readonly points = input.required<readonly number[]>();
  readonly yMax = input.required<number>();
  readonly width = input(80);
  readonly height = input(24);
  readonly accent = input(false);

  protected readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);
  protected readonly strokeColor = computed(() =>
    this.accent() ? 'var(--color-accent)' : 'var(--color-tx-dim)',
  );
  protected readonly path = computed(() =>
    sparklinePath(this.points(), this.yMax(), this.width(), this.height()),
  );
}