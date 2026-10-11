import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: {baseURL: 'http://127.0.0.1:3001', screenshot: 'only-on-failure', trace: 'retain-on-failure'},
  projects: [{name: 'chrome', use: {...devices['Desktop Chrome'], channel: 'chrome'}}],
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3001',
    url: 'http://127.0.0.1:3001', reuseExistingServer: false, timeout: 60_000,
    env: {TOWER_DB_PATH: '.data/e2e.sqlite'},
  },
});
