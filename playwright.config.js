import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "dist");

// The built-bundle fixture must exist in dist/ before the vite preview
// webServer starts, otherwise Playwright's readiness URL returns 404.
// The test rewrites it with the real content and removes it in afterAll.
const FIXTURE_PATH = path.join(DIST_DIR, "built-bundle-test.html");
mkdirSync(DIST_DIR, { recursive: true });
writeFileSync(
  FIXTURE_PATH,
  "<!DOCTYPE html><html><body>placeholder</body></html>",
);

const browserTestServerPort = 4173;
const browserTestServerURL = `http://127.0.0.1:${browserTestServerPort}`;

const builtBundlePreviewPort = 4174;
const builtBundlePreviewURL = `http://127.0.0.1:${builtBundlePreviewPort}`;

export default defineConfig({
  testDir: "tests/browser",
  // The suite includes WebGL/shader tests and remote-network-dependent map
  // tests that flake under parallel workers. Single-worker execution with one
  // retry was verified fully green (50 passed, 0 failed, 0 flaky).
  retries: 1,
  workers: 1,
  use: {
    baseURL: browserTestServerURL,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:browser-tests",
      url: browserTestServerURL,
      reuseExistingServer: false,
    },
    {
      command: `npx vite preview --port ${builtBundlePreviewPort} --strictPort --host 127.0.0.1`,
      url: `${builtBundlePreviewURL}/built-bundle-test.html`,
      reuseExistingServer: true,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
