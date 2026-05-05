import { test, expect } from '@playwright/test';

test.describe('returning user', () => {
  test('URL with ?s= skips splash on cold load', async ({ page }) => {
    // Engage once so the URL gets `?s=<defaults>` autosaved.
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();

    // Wait past the 200 ms autosave debounce, then capture the URL.
    await page.waitForTimeout(400);
    const urlWithState = page.url();
    expect(urlWithState).toContain('s=');

    // Reload via the captured URL — splash should NOT reappear.
    await page.goto(urlWithState);
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /get started/i })).not.toBeVisible();
  });

  test('reload preserves mode selection', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await page.getByRole('tab', { name: /cash/i }).click();
    await expect(page.getByRole('tab', { name: /cash/i })).toHaveAttribute('aria-selected', 'true');

    await page.waitForTimeout(400);
    await page.reload();

    await expect(page.getByRole('tab', { name: /cash/i })).toHaveAttribute('aria-selected', 'true');
  });
});
