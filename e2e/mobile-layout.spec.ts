import { test, expect } from '@playwright/test';

// Run only against the mobile project — desktop assertions would be misleading.
test.describe('mobile layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile project only');
  });

  test('renders the comparison stack at 390 px wide without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();

    // Body should not exceed viewport width — overflow-x is clipped on <body>
    // but a layout bug would still leave scrollWidth > clientWidth.
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('comparison strip stays visible while scrolling past it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.getByRole('tab', { name: /lease/i })).toBeVisible();

    // Scroll deep into the page; the strip's tab elements should still be visible.
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' as ScrollBehavior }));
    await expect(page.getByRole('tab', { name: /lease/i })).toBeInViewport();
  });

  // TODO once Q4 ships: assert `[data-scrolled]` flips to true past the
  // hysteresis threshold and back at the up-threshold.
  // TODO once Q13 Layer 1 ships: assert `.slider` has `touch-action: pan-y`
  // under `@media (pointer: coarse)`.
});
