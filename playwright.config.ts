import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Run files in parallel; tests within one file are serial (single-page tests
  // that share state across `test()` blocks would otherwise race).
  fullyParallel: true,
  // CI is allowed one retry per failure; locally a flake is a flake.
  retries: process.env.CI ? 1 : 0,
  // CI gets a single worker for log readability + lower flake; locally use all cores.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
  // ng serve takes 30-60 s on a cold cache; the 120 s timeout absorbs that
  // without flaking. `reuseExistingServer` lets `npm start` stay running
  // locally so tests don't bounce the dev server every run.
  webServer: {
    command: 'npm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
