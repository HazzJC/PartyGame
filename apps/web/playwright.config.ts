import { defineConfig, devices } from '@playwright/test';

const PORT = 5188;
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } };

/**
 * Every test makes its own room, so tests run in parallel: locally on half the CPU cores, and in
 * CI across several machines (see .github/workflows/ci.yml, which shards the `chromium` project).
 * The timing checks (stream delay, reaction test) measure real latency, so they get their own
 * project that runs one test at a time and is never squeezed onto a busy CPU in CI.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  // The smoke tests play whole games with random input; on slow CI runners one can occasionally run long.
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : '50%',
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: desktop, testIgnore: /timing\.spec\.ts/ },
    { name: 'timing', use: desktop, testMatch: /timing\.spec\.ts/, fullyParallel: false },
  ],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: process.env.PW_SERVER_LOG ? 'pipe' : 'ignore',
  },
});
