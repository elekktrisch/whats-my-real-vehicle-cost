import { test, expect } from '@playwright/test';

test.describe('mode switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();
  });

  test('clicking a card focuses that mode', async ({ page }) => {
    const finance = page.getByRole('tab', { name: /loan/i });
    await finance.click();
    await expect(finance).toHaveAttribute('aria-selected', 'true');

    const lease = page.getByRole('tab', { name: /lease/i });
    await expect(lease).toHaveAttribute('aria-selected', 'false');
  });

  test('arrow keys move selection across the tablist', async ({ page }) => {
    const lease = page.getByRole('tab', { name: /lease/i });
    await lease.click();
    await lease.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /loan/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /cash/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('mode-specific fields swap with the active tab', async ({ page }) => {
    await page.getByRole('tab', { name: /lease/i }).click();
    await expect(page.locator('#modepanel-lease')).toBeVisible();
    await expect(page.locator('#modepanel-finance')).toHaveCount(0);

    await page.getByRole('tab', { name: /loan/i }).click();
    await expect(page.locator('#modepanel-finance')).toBeVisible();
    await expect(page.locator('#modepanel-lease')).toHaveCount(0);
  });
});
