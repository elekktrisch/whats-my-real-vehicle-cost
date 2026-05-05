import { test, expect } from '@playwright/test';

test.describe('cold start', () => {
  test('lands on splash when no params', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /monthly payment/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  });

  test('Get started → comparison page with all three mode cards + chart', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();

    // Tablist with the three mode cards.
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /loan/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /cash/i })).toBeVisible();

    // Chart canvas is rendered (chart.js draws into a <canvas>).
    await expect(page.locator('canvas[role="img"]')).toBeVisible();

    // Hero card with money → asset narrative — use structural locators
    // since the eyebrow text now also appears in the chart legend ("Cash
    // out of pocket") and the sr-only data table.
    await expect(page.locator('.hero-card')).toBeVisible();
    await expect(page.locator('.hero-card img[src="money.png"]')).toBeVisible();
    await expect(page.locator('.hero-card img[src="car.png"]')).toBeVisible();
  });

  test('exactly one card has the "Best" badge', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();

    const badges = page.locator('[aria-label="Recommended"]');
    await expect(badges).toHaveCount(1);
  });
});
