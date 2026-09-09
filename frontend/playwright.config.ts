import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007";

export default defineConfig({
  testDir: "./tests/e2e",
  // File-level isolation, deliberately kept. Tests *within* a file stay serial,
  // so a spec may still build state across its own steps; only whole files run
  // beside each other. `fullyParallel: true` would break that contract in every
  // file at once, which is a bigger change than this one is allowed to be.
  fullyParallel: false,
  // Four workers on CI, one locally.
  //
  // It was `workers: 1` everywhere, because the Clerk proxy evaluated every
  // request against an external service and a second worker earned rate-limit
  // responses in the public-page tests. Clerk is gone (D-083): sessions are now
  // rows in our own PostgreSQL and nothing here calls an external auth service,
  // so the reason has gone with it.
  //
  // Four rather than `undefined` (which is half the runner's cores): the suite
  // shares one `next start` and one API process, and a number we chose is one
  // we can reason about when a spec starts flaking.
  workers: process.env.CI ? 4 : 1,
  forbidOnly: !!process.env.CI,
  // One retry, not two. A retry exists to absorb infrastructure noise — a cold
  // server, a slow first paint — and one absorbs that. The second mostly bought
  // time for a genuinely flaky test to pass eventually, which is the opposite
  // of what a gate is for, and it tripled the cost of a real failure.
  retries: process.env.CI ? 1 : 0,
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
