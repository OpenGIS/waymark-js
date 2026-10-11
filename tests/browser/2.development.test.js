import { expect, test } from "@playwright/test";
import { screenshot } from "./helpers/screenshot.js";

async function collectConsoleErrors(page) {
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

async function waitForLayerCount(page, expected) {
  await expect
    .poll(
      async () =>
        page.evaluate(
          () => window.waymarkInstances?.map?.toJSON().data.layers.length,
        ),
      { timeout: 15_000 },
    )
    .toBe(expected);
}

test.describe("2. Development smoke", () => {
  test("dev page renders the map, controls and initial layers", async ({
    page,
  }) => {
    const consoleErrors = await collectConsoleErrors(page);

    await page.goto("/");

    await expect(page.locator("#dev-toolbar")).toBeVisible();
    await expect(page.locator("#dev-add-layer")).toBeVisible();
    await expect(page.locator("#dev-fit-bounds")).toBeVisible();
    await expect(page.locator("#dev-toggle-beer")).toBeVisible();
    await expect(page.locator("#map")).toBeVisible();
    await expect(page.locator("#map canvas")).toBeVisible();

    await waitForLayerCount(page, 4);
    await page.waitForTimeout(2_000);

    await screenshot(page, "dev-page");

    expect(consoleErrors).toEqual([]);
  });

  test("add layer control adds a GeoJSON layer and fits bounds", async ({
    page,
  }) => {
    await page.goto("/");

    await waitForLayerCount(page, 4);

    await page.locator("#dev-add-layer").click();

    await waitForLayerCount(page, 5);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = window.waymarkMaps?.map;
            if (!map) {
              return null;
            }

            const center = map.getCenter();
            return [
              Number(center.lng.toFixed(4)),
              Number(center.lat.toFixed(4)),
            ];
          }),
        { timeout: 15_000 },
      )
      .toEqual([-127.998, 50.661]);

    await screenshot(page, "dev-layer-added");
  });

  test("clicking a marker opens the consumer-side popup", async ({ page }) => {
    await page.goto("/");

    await waitForLayerCount(page, 4);

    const point = await page.evaluate(async () => {
      const map = window.waymarkMaps?.map;

      if (!map) {
        return null;
      }

      if (!map.loaded()) {
        await new Promise((resolve) => map.once("load", resolve));
      }

      const coords = [-128.009734, 50.653923];

      await new Promise((resolve) => {
        const startedAt = Date.now();
        const check = () => {
          const waymarkLayerIds = (map.getStyle()?.layers ?? [])
            .map((layer) => layer.id)
            .filter((id) => id.startsWith("waymark-map-geojson-layer-"));
          const at = map.project(coords);
          const hit = map.queryRenderedFeatures(at, {
            layers: waymarkLayerIds,
          });
          const hasMarker = hit.some(
            (feature) => feature.properties?.title === "The Scarlet Ibis",
          );

          if (hasMarker || Date.now() - startedAt > 10_000) {
            resolve();
            return;
          }

          setTimeout(check, 50);
        };

        check();
      });

      const projected = map.project(coords);
      return { x: projected.x, y: projected.y };
    });

    const box = await page.locator("#map canvas").boundingBox();
    await page.mouse.click(box.x + point.x, box.y + point.y);

    const popup = page.locator(".maplibregl-popup");

    // The property inspector renders the title plus key/value rows for the
    // remaining properties, and an image when the feature has one.
    await expect(popup).toContainText("The Scarlet Ibis");
    await expect(popup).toContainText("waymarkType");
    await expect(popup).toContainText(
      "Good food and drink, especially after a long ride!",
    );

    const image = popup.locator(".dev-popup__image");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute(
      "src",
      "/img/49ECEB41-21DB-48D9-BCC0-FFA7FCD56448_1_105_c.jpeg",
    );

    // The image URL properties collapse into the image; they must never render
    // as raw URL text rows.
    await expect(popup).not.toContainText(
      "/img/49ECEB41-21DB-48D9-BCC0-FFA7FCD56448_1_105_c.jpeg",
    );

    // The (local fixture) image must actually load, not just appear.
    await expect
      .poll(async () => image.evaluate((img) => img.naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    await screenshot(page, "dev-popup");
  });

  test("clicking a track line anchors the popup at the click location", async ({
    page,
  }) => {
    await page.goto("/");

    await waitForLayerCount(page, 4);

    const target = await page.evaluate(async () => {
      const map = window.waymarkMaps?.map;

      if (!map) {
        return null;
      }

      // A vertex on the "Port Hardy to Cape Scott" track, near the initial
      // centre at zoom 15.
      const coords = [-128.01297, 50.655647];
      const projected = map.project(coords);
      const lineLayerIds = (map.getStyle()?.layers ?? [])
        .map((layer) => layer.id)
        .filter(
          (id) =>
            id.startsWith("waymark-map-geojson-layer-") &&
            map.getLayer(id)?.type === "line",
        );

      await new Promise((resolve) => {
        const startedAt = Date.now();
        const check = () => {
          const hit = map.queryRenderedFeatures(projected, {
            layers: lineLayerIds,
          });

          if (hit.length > 0 || Date.now() - startedAt > 10_000) {
            resolve();
            return;
          }

          setTimeout(check, 50);
        };

        check();
      });

      return { x: projected.x, y: projected.y };
    });

    const box = await page.locator("#map canvas").boundingBox();
    await page.mouse.click(box.x + target.x, box.y + target.y);

    const popup = page.locator(".maplibregl-popup");
    await expect(popup).toContainText("Port Hardy to Cape Scott");
    await expect(popup).toContainText("direction");
    await expect(popup).toContainText("waymarkType");

    // This line carries only `image_large_url`: the popup must still render a
    // loaded image (the reported bug) and never a raw URL text row.
    const image = popup.locator(".dev-popup__image");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute(
      "src",
      "/img/UNADJUSTEDNONRAW_thumb_15b3.jpg",
    );
    await expect(popup).not.toContainText(
      "/img/UNADJUSTEDNONRAW_thumb_15b3.jpg",
    );

    await expect
      .poll(async () => image.evaluate((img) => img.naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    // The popup is anchored on the click location, not the geometry's first
    // vertex: its container transform carries the projected anchor point.
    const anchored = await page.evaluate(({ x, y }) => {
      const element = document.querySelector(".maplibregl-popup");

      if (!element) {
        return null;
      }

      const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
        element.style.transform,
      );

      if (!match) {
        return null;
      }

      return { tx: Number(match[1]), ty: Number(match[2]), x, y };
    }, target);

    expect(anchored).not.toBeNull();
    expect(Math.abs(anchored.tx - anchored.x)).toBeLessThan(2);
    expect(Math.abs(anchored.ty - anchored.y)).toBeLessThan(2);

    await screenshot(page, "dev-popup-line");
  });

  test("clicking a shape opens the popup with its properties", async ({
    page,
  }) => {
    await page.goto("/");

    await waitForLayerCount(page, 4);

    const target = await page.evaluate(async () => {
      const map = window.waymarkMaps?.map;

      if (!map) {
        return null;
      }

      if (!map.loaded()) {
        await new Promise((resolve) => map.once("load", resolve));
      }

      // Centre of the "Cape Scott trail area" polygon — clear of the track
      // lines and markers, so a click here hits only the fill layer.
      const coords = [-128.016, 50.6505];
      map.jumpTo({ center: coords, zoom: 15 });

      await new Promise((resolve) => map.once("idle", resolve));

      await new Promise((resolve) => {
        const startedAt = Date.now();
        const check = () => {
          const fillLayerIds = (map.getStyle()?.layers ?? [])
            .map((layer) => layer.id)
            .filter((id) => id.endsWith("-fill-type-area"));
          const at = map.project(coords);
          const hit = map.queryRenderedFeatures(at, { layers: fillLayerIds });

          if (hit.length > 0 || Date.now() - startedAt > 10_000) {
            resolve();
            return;
          }

          setTimeout(check, 50);
        };

        check();
      });

      const projected = map.project(coords);
      return { x: projected.x, y: projected.y };
    });

    const box = await page.locator("#map canvas").boundingBox();
    await page.mouse.click(box.x + target.x, box.y + target.y);

    const popup = page.locator(".maplibregl-popup");
    await expect(popup).toContainText("Cape Scott trail area");
    await expect(popup).toContainText(
      "Coastal hiking area between San Josef Bay and Cape Scott.",
    );
    await expect(popup).toContainText("waymarkType");

    // The shape carries only `image_medium_url`; the fallback must render it
    // as a loaded image and never as a raw URL text row.
    const image = popup.locator(".dev-popup__image");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute(
      "src",
      "/img/UNADJUSTEDNONRAW_thumb_15e1.jpg",
    );
    await expect(popup).not.toContainText(
      "/img/UNADJUSTEDNONRAW_thumb_15e1.jpg",
    );

    await expect
      .poll(async () => image.evaluate((img) => img.naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    // The popup is anchored on the click location, not the geometry's first
    // vertex: its container transform carries the projected anchor point.
    const anchored = await page.evaluate(({ x, y }) => {
      const element = document.querySelector(".maplibregl-popup");

      if (!element) {
        return null;
      }

      const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
        element.style.transform,
      );

      if (!match) {
        return null;
      }

      return { tx: Number(match[1]), ty: Number(match[2]), x, y };
    }, target);

    expect(anchored).not.toBeNull();
    expect(Math.abs(anchored.tx - anchored.x)).toBeLessThan(2);
    expect(Math.abs(anchored.ty - anchored.y)).toBeLessThan(2);
  });

  test("type visibility control hides and restores a type", async ({
    page,
  }) => {
    await page.goto("/");

    await waitForLayerCount(page, 4);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.waymarkInstances?.map?.types.getVisibility("beer"),
        ),
      )
      .toBe(true);

    await page.locator("#dev-toggle-beer").click();

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.waymarkInstances?.map?.types.getVisibility("beer"),
        ),
      )
      .toBe(false);

    await page.locator("#dev-toggle-beer").click();

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.waymarkInstances?.map?.types.getVisibility("beer"),
        ),
      )
      .toBe(true);
  });
});
