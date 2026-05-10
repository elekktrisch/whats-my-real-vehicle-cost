import { test } from '@playwright/test';
import path from 'node:path';

// Generates public/og.png — the 1200×630 social-card screenshot referenced by
// <meta property="og:image"> and twitter:image. Run via `npm run og`.
//
// Captures the comparison page at the default scenario so the OG card shows
// what an unprimed visitor sees: chart + comparison strip + hero summary.
test('generate og.png', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /get started/i }).click();

  // Chart canvas is the LCP candidate. Wait for it before snapping.
  await page.locator('canvas[role="img"]').waitFor({ state: 'visible' });

  // Brief settle for chart animation (240ms in chartOptions). 600ms is
  // generous; failed-fast is preferable to flaky-late here.
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.resolve(__dirname, '..', 'public', 'og.png'),
    type: 'png',
  });
});
