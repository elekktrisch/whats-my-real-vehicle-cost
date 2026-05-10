import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

// Dedicated config for `npm run og` — generates the social-card screenshot
// that ships at public/og.png. Reuses the base webServer block (so it
// auto-spawns `npm start` if not running, or attaches to an existing one).
//
// Kept separate from the main config so a stray `playwright test` can never
// regenerate the asset by accident, and so this run can use a 1200×630
// viewport without explaining why the regression projects don't.
export default defineConfig({
  ...baseConfig,
  testDir: './scripts',
  testMatch: 'og.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    ...baseConfig.use,
    // Disable the base config's per-step screenshot capture — we don't want
    // those leaking into test-results/ when the only screenshot we care
    // about is the one we write explicitly.
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'og',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1200, height: 630 } },
    },
  ],
});
