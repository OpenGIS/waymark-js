import { defineConfig, devices } from "@playwright/test";

const browserTestServerPort = 4173;
const browserTestServerURL = `http://127.0.0.1:${browserTestServerPort}`;

export default defineConfig({
  testDir: "tests/browser",
  // The suite includes WebGL/shader tests and remote-network-dependent map
  // tests that flake under parallel workers. Single-worker execution with one
  // retry keeps it green.
  retries: 1,
  workers: 1,
  use: {
    baseURL: browserTestServerURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:browser-tests",
    url: browserTestServerURL,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
