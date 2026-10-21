import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", timeout: 30_000, workers: 1, retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:3101", timezoneId: "Asia/Kolkata", trace: "retain-on-failure" },
  webServer: { command: "pnpm start --port 3101", url: "http://127.0.0.1:3101", reuseExistingServer: !process.env.CI }
});
