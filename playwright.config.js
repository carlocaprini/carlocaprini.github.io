import { defineConfig } from "@playwright/test";

const baseURL = process.env.SITE_BASE_URL || "http://127.0.0.1:4000";
const serverPort = new URL(baseURL).port || "80";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  retryStrategy: "isolated",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      pathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
      scale: "css"
    }
  },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "line",
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
      testIgnore: [/webkit-smoke\.spec\.js/, /visual\.spec\.js/],
      use: { viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile-chromium",
      testIgnore: [/webkit-smoke\.spec\.js/, /visual\.spec\.js/],
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      }
    },
    {
      name: "ipad-portrait-chromium",
      testIgnore: [/webkit-smoke\.spec\.js/, /visual\.spec\.js/],
      use: {
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
        isMobile: false
      }
    },
    {
      name: "webkit-desktop",
      testMatch: /webkit-smoke\.spec\.js/,
      use: {
        browserName: "webkit",
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "webkit-mobile",
      testMatch: /webkit-smoke\.spec\.js/,
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      }
    },
    {
      name: "visual-chromium",
      testMatch: /visual\.spec\.js/,
      use: {
        viewport: { width: 1440, height: 900 }
      }
    }
  ]
});
