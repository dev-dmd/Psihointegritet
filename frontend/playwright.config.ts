import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // A single `next start` process serves all tests. The default (one worker per
  // CPU core) overwhelms it here — concurrent on-demand renders start timing out
  // and returning wrong statuses. Two workers is the stable ceiling in this
  // environment (verified: 12/4 flake, 2/1 green). CI keeps retries as a safety net.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
