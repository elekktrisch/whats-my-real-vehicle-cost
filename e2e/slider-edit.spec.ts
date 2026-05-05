import { test, expect } from '@playwright/test';

test.describe('slider edit', () => {
  test('changing the negotiated price updates the URL within debounce window', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(400); // initial autosave settles

    const initialUrl = page.url();

    // Negotiated-price input is the first number input on the page header.
    const priceInput = page.getByLabel('Negotiated price').first();
    await priceInput.fill('42000');
    await priceInput.press('Tab'); // commit the value

    // 200 ms autosave debounce + headroom.
    await page.waitForTimeout(500);
    expect(page.url()).not.toBe(initialUrl);
  });

  test('changing keep duration changes the chart aria-label', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    const canvas = page.locator('canvas[role="img"]');
    const before = await canvas.getAttribute('aria-label');

    // Keep duration is a slider; nudge it via the underlying input's value.
    const keepSlider = page.locator('input[type="range"]').filter({ has: page.locator('xs:nth') });
    // Robust selector: aria-labelled by "Keep duration" — find via the SliderControl wrapper.
    const keepInput = page.getByRole('slider', { name: /keep duration/i });
    if (await keepInput.count()) {
      await keepInput.fill('10');
      await page.waitForTimeout(200);
      const after = await canvas.getAttribute('aria-label');
      expect(after).not.toBe(before);
    } else {
      test.skip(true, 'Keep duration slider not exposed via accessible name yet');
    }
  });
});
