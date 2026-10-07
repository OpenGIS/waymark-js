import path from "path";

const SCREENSHOT_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "screenshots",
);

const NETWORK_IDLE_TIMEOUT = 15_000;
const MAP_IDLE_TIMEOUT = 10_000;
const IMAGE_TIMEOUT = 10_000;

/**
 * Wait for the page to settle before capture: network idle, every Waymark map
 * idle (tiles loaded, not moving), every image decoded, fonts ready, and two
 * animation frames for paint. Every step is bounded so a slow network or a
 * missing map can never hang a spec.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function waitForSettled(page) {
  await page
    .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT })
    .catch(() => {});

  await page.evaluate(
    async ({ mapTimeout, imageTimeout }) => {
      const maps = Object.values(window.waymarkMaps ?? {});

      const waitForMap = (map) =>
        new Promise((resolve) => {
          if (!map || typeof map !== "object") {
            resolve();
            return;
          }

          let settled = false;
          const settle = () => {
            if (settled) {
              return;
            }
            settled = true;
            resolve();
          };

          const loaded = typeof map.loaded === "function" ? map.loaded() : true;
          const tilesLoaded =
            typeof map.areTilesLoaded !== "function" || map.areTilesLoaded();
          const moving = typeof map.isMoving === "function" && map.isMoving();

          if (loaded && tilesLoaded && !moving) {
            settle();
            return;
          }

          if (typeof map.once === "function") {
            map.once("idle", settle);
          }

          setTimeout(settle, mapTimeout);
        });

      await Promise.all(maps.map(waitForMap));

      const waitForImage = (image) =>
        new Promise((resolve) => {
          const finish = async () => {
            if (typeof image.decode === "function") {
              await image.decode().catch(() => {});
            }
            resolve();
          };

          if (image.complete) {
            finish();
            return;
          }

          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          setTimeout(finish, imageTimeout);
        });

      await Promise.all(Array.from(document.images).map(waitForImage));

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    },
    { mapTimeout: MAP_IDLE_TIMEOUT, imageTimeout: IMAGE_TIMEOUT },
  );
}

/**
 * Capture a named screenshot during a Playwright test.
 *
 * Wait for the page to settle first so tiles, images, and fonts are painted
 * before the frame is captured. Screenshots are saved to
 * `screenshots/` at the repo root and are tracked in git as visual evidence of
 * application state.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} name - kebab-case name for the screenshot (e.g. "api-view-mode")
 */
export async function screenshot(page, name) {
  await waitForSettled(page);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
  });
}
