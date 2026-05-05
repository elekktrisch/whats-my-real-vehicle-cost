import { test, expect } from '@playwright/test';

test.describe('reset', () => {
  test('Reset returns to splash and clears the URL params', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();
    await page.waitForTimeout(400);

    expect(page.url()).toContain('s=');

    await page.getByRole('button', { name: /^reset$/i }).click();

    // Splash heading is back, comparison strip is gone.
    await expect(page.getByRole('heading', { name: /monthly payment/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /lease/i })).toHaveCount(0);

    // URL no longer carries the snapshot param.
    expect(page.url()).not.toContain('s=');
  });
});
