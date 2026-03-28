import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { appConfig } from './src/config/app.config';

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never' }],
  ['json', { outputFile: appConfig.reporting.jsonReportFile }],
];

if (appConfig.ci) {
  reporters.push(['junit', { outputFile: appConfig.reporting.junitReportFile }]);
}

export default defineConfig({
  globalSetup: './src/global-setup.ts',
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: appConfig.ci,
  retries: appConfig.ci ? 2 : 0,
  workers: 1,
  reporter: reporters,
  timeout: appConfig.timeouts.testMs,
  expect: {
    timeout: appConfig.timeouts.expectMs,
  },
  use: {
    baseURL: appConfig.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: appConfig.timeouts.actionMs,
    navigationTimeout: appConfig.timeouts.navigationMs,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
