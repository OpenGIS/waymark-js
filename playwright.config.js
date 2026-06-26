import { defineConfig, devices } from "@playwright/test";

const browserTestServerPort = 4173;
const browserTestServerURL = `http://127.0.0.1:${browserTestServerPort}`;

export default defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: browserTestServerURL,
  },
  webServer: {
    command: "npm run dev:browser-tests",
    url: browserTestServerURL,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
