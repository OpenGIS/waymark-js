import { defineConfig, devices } from "@playwright/test";

const browserTestServerPort = 4173;
const browserTestServerURL = `http://127.0.0.1:${browserTestServerPort}`;

// Headless Chromium on the bundled SwiftShader software renderer, serialised to
// one raster thread. Byte-stable captures only follow if the fragment
// rasteriser is deterministic: SwiftShader's parallel rasterisation emits
// overlapping antialiased fragments in completion order, so a multi-threaded
// run can reorder blends between otherwise identical renders.
const SCREENSHOT_LAUNCH_ARGS = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--force-color-profile=srgb",
  "--disable-lcd-text",
  "--font-render-hinting=none",
  "--disable-gpu-rasterization",
  "--disable-partial-raster",
  "--num-raster-threads=1",
];

export default defineConfig({
  testDir: "tests/browser",
  // The suite includes WebGL/shader tests and remote-network-dependent map
  // tests that flake under parallel workers. Single-worker execution with one
  // retry keeps it green.
  retries: 1,
  workers: 1,
  globalSetup: "./tests/browser/global-setup.js",
  globalTeardown: "./tests/browser/global-teardown.js",
  use: {
    baseURL: browserTestServerURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:browser-tests",
    url: browserTestServerURL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "functional",
      testIgnore: /screenshots\.spec\.js/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "screenshots",
      testMatch: /screenshots\.spec\.js/,
      // SwiftShader is slow: a capture may run up to twelve fixed-point rounds
      // on top of the settle pipeline.
      timeout: 180_000,
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
        launchOptions: { args: SCREENSHOT_LAUNCH_ARGS },
        locale: "en-CA",
        timezoneId: "America/Vancouver",
        // MapLibre silently degrades flyTo to jumpTo under a reduced-motion
        // preference, so pin the platform default explicitly.
        reducedMotion: "no-preference",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        // The dev harness and API page do not read prefers-color-scheme and are
        // light by default; pin light so a host dark mode cannot shift pixels.
        colorScheme: "light",
      },
    },
  ],
});
