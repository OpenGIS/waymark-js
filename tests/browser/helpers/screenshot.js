import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

const DEFAULT_SCREENSHOT_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "screenshots",
);

// `SCREENSHOT_OUT_DIR`, when set, redirects captures away from the tracked
// default (e.g. a throwaway verification run). Relative paths resolve against
// the working directory; the directory is created on demand.
const SCREENSHOT_DIR = process.env.SCREENSHOT_OUT_DIR
  ? path.resolve(process.cwd(), process.env.SCREENSHOT_OUT_DIR)
  : DEFAULT_SCREENSHOT_DIR;

const NETWORK_IDLE_TIMEOUT = 15_000;
const MAP_IDLE_TIMEOUT = 10_000;
const IMAGE_TIMEOUT = 10_000;

// Fixed-point capture bounds. A round forces a render and proves compositor
// liveness with a magenta probe; three byte-identical candidate frames across
// consecutive rounds are required before a capture is accepted.
const MAX_CAPTURE_ROUNDS = 12;
const REQUIRED_STABLE_FRAMES = 3;
const RENDER_EVENT_TIMEOUT = 2_000;
const PROBE_ELEMENT_ID = "__waymark_capture_probe";

/**
 * Guard the tracked `screenshots/` directory, which holds byte-pinned captures.
 *
 * Without `SCREENSHOT_OUT_DIR`, only the headless `screenshots` project may
 * write there. With `SCREENSHOT_OUT_DIR`, any target is allowed except the
 * tracked directory itself, so a scratch env can never overwrite committed
 * pixels.
 */
function assertSafeOutputTarget() {
  if (process.env.SCREENSHOT_OUT_DIR) {
    if (SCREENSHOT_DIR === DEFAULT_SCREENSHOT_DIR) {
      throw new Error(
        "Refusing to write to the tracked screenshots/ directory: " +
          "SCREENSHOT_OUT_DIR resolves to it. Point SCREENSHOT_OUT_DIR at a " +
          "scratch directory instead.",
      );
    }

    return;
  }

  const info = test.info();

  if (
    info.project.name !== "screenshots" ||
    info.project.use.headless === false
  ) {
    throw new Error(
      "Refusing to write to the tracked screenshots/ directory unless running " +
        "the headless 'screenshots' project. Set SCREENSHOT_OUT_DIR to capture " +
        "to a scratch directory instead.",
    );
  }
}

/**
 * Force a synchronous map render and present it.
 *
 * Every registered Waymark map is redrawn (`map.redraw()` fires the `render`
 * event synchronously) and the frame is then presented with two animation
 * frames. A missing map or a redraw failure resolves rather than hanging.
 *
 * @param {import("@playwright/test").Page} page
 */
async function forceRender(page) {
  await page.evaluate(async (renderTimeout) => {
    const maps = Object.values(window.waymarkMaps ?? {});

    await Promise.all(
      maps.map(
        (map) =>
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

            if (typeof map.once === "function") {
              map.once("render", settle);
            }

            if (typeof map.redraw === "function") {
              try {
                map.redraw();
              } catch {
                settle();
                return;
              }
            } else if (typeof map.triggerRepaint === "function") {
              map.triggerRepaint();
            } else {
              settle();
              return;
            }

            setTimeout(settle, renderTimeout);
          }),
      ),
    );

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }, RENDER_EVENT_TIMEOUT);
}

/**
 * Toggle a full-viewport magenta probe overlay. The overlay is painted by the
 * compositor, so a difference between a probe-less and a probed frame proves
 * the compositor reflected the latest render rather than re-serving a stale
 * surface.
 *
 * @param {import("@playwright/test").Page} page
 * @param {boolean} visible
 */
async function setProbe(page, visible) {
  await page.evaluate(
    ({ id, visible }) => {
      const existing = document.getElementById(id);

      if (!visible) {
        existing?.remove();
        return;
      }

      if (existing) {
        return;
      }

      const probe = document.createElement("div");
      probe.id = id;
      probe.style.cssText = [
        "position: fixed",
        "inset: 0",
        "z-index: 2147483647",
        "pointer-events: none",
        "background: #ff00ff",
      ].join("; ");
      document.body.appendChild(probe);
    },
    { id: PROBE_ELEMENT_ID, visible },
  );
}

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
 * Capture a named screenshot during a Playwright test using a fixed-point
 * protocol.
 *
 * After the page settles, each round forces a render, proves the compositor is
 * live with a magenta probe overlay, and takes a candidate frame. A capture is
 * accepted only once three consecutive candidate frames are byte-identical; if
 * no fixed point is reached within the round budget the capture throws rather
 * than writing an unstable image. The accepted buffer is written verbatim.
 *
 * Screenshots are saved to `screenshots/` at the repo root and are tracked in
 * git; set `SCREENSHOT_OUT_DIR` to capture to a scratch directory instead.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} name - kebab-case name for the screenshot (e.g. "api-view-mode")
 * @param {string} [selector] - optional element selector; when given, capture
 *   only that element instead of the full page
 */
export async function screenshot(page, name, selector) {
  assertSafeOutputTarget();

  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const target = selector ? page.locator(selector) : page;

  await waitForSettled(page);

  let previous = null;
  let stableFrames = 0;

  for (let round = 1; round <= MAX_CAPTURE_ROUNDS; round += 1) {
    await forceRender(page);

    const baseline = await target.screenshot();
    await setProbe(page, true);
    const probed = await target.screenshot();
    await setProbe(page, false);

    if (baseline.equals(probed)) {
      // The compositor did not reflect the overlay: the surface is stale, so
      // this round proves nothing. Reset the streak and try again.
      previous = null;
      stableFrames = 0;
      continue;
    }

    await forceRender(page);
    const candidate = await target.screenshot();

    stableFrames =
      previous && previous.equals(candidate) ? stableFrames + 1 : 1;
    previous = candidate;

    if (stableFrames >= REQUIRED_STABLE_FRAMES) {
      writeFileSync(path.join(SCREENSHOT_DIR, `${name}.png`), candidate);
      return;
    }
  }

  throw new Error(
    `Screenshot "${name}" did not reach a fixed point within ` +
      `${MAX_CAPTURE_ROUNDS} rounds: no ${REQUIRED_STABLE_FRAMES} consecutive ` +
      "frames were byte-identical. The scene never settled — refusing to write " +
      "an unstable image.",
  );
}
