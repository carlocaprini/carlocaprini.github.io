import { defineConfig } from "@playwright/test";

const baseURL = process.env.SITE_BASE_URL || "http://127.0.0.1:4000";
const serverPort = new URL(baseURL).port || "80";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "line",
  outputDir: "test-results",
  webServer: {
    command: `bundle exec ruby -run -ehttpd _site -p ${serverPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile-chromium",
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      }
    },
    {
      name: "ipad-portrait-chromium",
      use: {
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
        isMobile: false
      }
    }
  ]
});
