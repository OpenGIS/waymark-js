/**
 * Shared, page-driven scene builders for the browser suites.
 *
 * The functional specs (`1.api.test.js`, `2.development.test.js`) use these to
 * assert scene behaviour; the screenshots project (`screenshots.spec.js`)
 * reuses the exact same scenes so the committed pixels and the functional
 * assertions can never drift apart. Assertions stay in the specs — builders
 * only mount a scene, await the readiness the scene needs, and return handles
 * for the spec to assert against.
 *
 * The API builders assume the page is already on `/browser-api.html`; call
 * `openAPIPage` (or navigate) first. The dev builders start from `openDevPage`,
 * which navigates itself.
 */
import { expect } from "./test.js";
import { BASEMAP_STYLE_URL } from "./mapAssets.js";

/** Vendored basemap style, shared by every capture and assertion scene. */
export const API_BASEMAP_STYLE_URL = BASEMAP_STYLE_URL;

/**
 * Explicit closeup over the Holberg / San Josef demo area so the point, the
 * track line and the ~494 m "Cape Scott trail area" polygon all sit comfortably
 * in frame on the 640×360 API canvas. The centre is pulled west and south of the
 * raw demo centroid so the polygon clears the bottom edge; at z14 it projects to
 * ~163 px wide (494 m / (78271.5 · cos 50.65° / 2^14)).
 */
export const HOLBERG_CLOSEUP = { center: [-128.0145, 50.6525], zoom: 14 };

/** Bound for the Waymark symbol-icon readiness gate in `waitForWaymarkSymbolImages`. */
const ICON_READY_TIMEOUT = 10_000;

/**
 * Stop MapLibre's popup from being promoted to its own compositing layer before
 * capture.
 *
 * MapLibre's stylesheet sets `will-change: transform` on `.maplibregl-popup`.
 * Because the popup sits at a sub-pixel offset (its height is fractional), GPU
 * compositing resamples that layer non-deterministically between runs. Letting
 * it render into the map's layer instead makes identical popup geometry
 * produce identical bytes; it does not change the popup's content or position.
 *
 * @param {import("@playwright/test").Page} page
 */
async function stabilisePopupLayer(page) {
  await page.addStyleTag({
    content: ".maplibregl-popup{will-change:auto !important;}",
  });
}

/**
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<void>}
 */
export async function openAPIPage(page) {
  await page.goto("/browser-api.html");
}

/**
 * Wait until the dev instance reports the expected data-layer count.
 *
 * @param {import("@playwright/test").Page} page
 * @param {number} expected
 * @returns {Promise<void>}
 */
export async function waitForLayerCount(page, expected) {
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

/**
 * Open the dev page and wait for its four initial layers.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<void>}
 */
export async function openDevPage(page) {
  await page.goto("/");
  await waitForLayerCount(page, 4);
  await waitForWaymarkSymbolImages(page);
}

/**
 * Wait until every mounted Waymark symbol layer's `icon-image` is registered on
 * the dev map (see `ICON_READY_TIMEOUT`).
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<void>}
 */
export async function waitForWaymarkSymbolImages(page) {
  await page.evaluate(
    (timeout) =>
      new Promise((resolve) => {
        const map = window.waymarkMaps?.map;

        if (!map || typeof map.getStyle !== "function") {
          resolve();
          return;
        }

        const startedAt = Date.now();

        const check = () => {
          const missing = (map.getStyle()?.layers ?? []).some((layer) => {
            if (layer.type !== "symbol" || !layer.id.startsWith("waymark-")) {
              return false;
            }

            const image = layer.layout?.["icon-image"];
            return typeof image === "string" && !map.hasImage(image);
          });

          if (!missing || Date.now() - startedAt > timeout) {
            resolve();
            return;
          }

          setTimeout(check, 50);
        };

        check();
      }),
    ICON_READY_TIMEOUT,
  );
}

/**
 * Add the sample-point layer from the dev toolbar and wait for the fitted
 * camera.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<void>}
 */
export async function addDevLayer(page) {
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
          return [Number(center.lng.toFixed(4)), Number(center.lat.toFixed(4))];
        }),
      { timeout: 15_000 },
    )
    .toEqual([-127.998, 50.661]);
}

/**
 * Poll until the "The Scarlet Ibis" marker is queryable, click its projected
 * position, and return the opened popup.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<{ popup: import("@playwright/test").Locator }>}
 */
export async function openMarkerPopup(page) {
  const point = await page.evaluate(async () => {
    const map = window.waymarkMaps?.map;

    if (!map) {
      return null;
    }

    // `loaded()` can be transiently false after `load` has already fired (a
    // pending render), so waiting on a one-shot `load` can hang. Poll until
    // loaded, bounded.
    if (!map.loaded()) {
      await new Promise((resolve) => {
        const startedAt = Date.now();
        const check = () => {
          if (map.loaded() || Date.now() - startedAt > 10_000) {
            resolve();
            return;
          }
          setTimeout(check, 50);
        };
        check();
      });
    }

    const coords = [-128.009734, 50.653923];

    await new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const waymarkLayerIds = (map.getStyle()?.layers ?? [])
          .map((layer) => layer.id)
          .filter((id) => id.startsWith("waymark-map-geojson-layer-"));
        const at = map.project(coords);
        const hit = map.queryRenderedFeatures(at, { layers: waymarkLayerIds });
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
  await expect(popup).toBeVisible();
  await stabilisePopupLayer(page);

  return { popup };
}

/**
 * Poll until the "Port Hardy to Cape Scott" track line is queryable, click its
 * projected position, and return the opened popup plus the click target (so the
 * spec can assert popup anchoring).
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<{
 *   popup: import("@playwright/test").Locator,
 *   target: { x: number, y: number },
 * }>}
 */
export async function openLinePopup(page) {
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
  await expect(popup).toBeVisible();
  await stabilisePopupLayer(page);

  return { popup, target };
}

/**
 * Mount the quick-start scene: one markers layer on the vendored style, camera
 * fitted to the layer bounds, then polled until the circle family has painted.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<{ rendered: number, markerCount: number }>}
 */
export async function mountQuickStart(page) {
  return page.evaluate(async (styleURL) => {
    const markers = await fetch("/geojson/markers.json").then((response) =>
      response.json(),
    );

    const map = window.waymarkFixture.makeMap({
      id: "map",
      style: styleURL,
      center: [-127.85, 50.7],
      zoom: 9,
    });

    const instance = window.waymarkFixture.createInstance({
      map,
      document: {
        config: { id: "map" },
        data: { layers: [{ data: markers }] },
      },
    });

    if (!map.loaded()) {
      await new Promise((resolve) => map.once("load", resolve));
    }

    instance.data.fitBounds();

    // Bounded poll until the point family has painted at least one feature,
    // so the scene cannot be read before the layer has mounted.
    return await new Promise((resolve) => {
      const startedAt = Date.now();

      const check = () => {
        const rendered = map.queryRenderedFeatures({
          layers: ["waymark-map-geojson-layer-0-circle"],
        }).length;

        if (rendered > 0 || Date.now() - startedAt > 5_000) {
          resolve({ rendered, markerCount: markers.features.length });
          return;
        }

        setTimeout(check, 50);
      };

      check();
    });
  }, API_BASEMAP_STYLE_URL);
}

/**
 * Mount the GeoJSON families scene: markers, track and shapes as three separate
 * layers on the Holberg closeup, returning the same evidence the specs assert.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<Record<string, unknown>>}
 */
export async function mountFamilies(page) {
  return page.evaluate(
    async ({ styleURL, closeup }) => {
      const [markers, track, shapes] = await Promise.all([
        fetch("/geojson/markers.json").then((response) => response.json()),
        fetch("/geojson/track-port-hardy-cape-scott.geojson").then((response) =>
          response.json(),
        ),
        fetch("/geojson/shapes.json").then((response) => response.json()),
      ]);

      const map = window.waymarkFixture.makeMap({
        id: "map",
        style: styleURL,
        center: closeup.center,
        zoom: closeup.zoom,
      });

      window.waymarkFixture.createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [{ data: markers }, { data: track }, { data: shapes }],
          },
        },
      });

      await new Promise((resolve) => {
        let settled = false;
        const settle = () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        };

        if (map.loaded() && map.areTilesLoaded() && !map.isMoving()) {
          settle();
          return;
        }

        map.once("idle", settle);
        setTimeout(settle, 10_000);
      });

      const ring = shapes.features[0].geometry.coordinates[0];
      const lngs = ring.map((position) => position[0]);
      const lats = ring.map((position) => position[1]);
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const west = map.project([Math.min(...lngs), midLat]);
      const east = map.project([Math.max(...lngs), midLat]);
      const north = map.project([midLng, Math.max(...lats)]);
      const south = map.project([midLng, Math.min(...lats)]);
      const container = map.getContainer();

      return {
        polygonWidth: Math.abs(east.x - west.x),
        polygonHeight: Math.abs(south.y - north.y),
        polygonBox: {
          left: west.x,
          right: east.x,
          top: north.y,
          bottom: south.y,
        },
        canvas: {
          width: container.clientWidth,
          height: container.clientHeight,
        },
        renderedFill: map.queryRenderedFeatures({
          layers: ["waymark-map-geojson-layer-2-fill"],
        }).length,
        zoom: map.getZoom(),
      };
    },
    { styleURL: API_BASEMAP_STYLE_URL, closeup: HOLBERG_CLOSEUP },
  );
}

/**
 * Mount the mixed scene: one FeatureCollection carrying a point, a line and a
 * polygon, returning the filters and per-family render evidence the specs
 * assert.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<Record<string, unknown>>}
 */
export async function mountMixed(page) {
  return page.evaluate(
    async ({ styleURL, closeup }) => {
      const [markers, track, shapes] = await Promise.all([
        fetch("/geojson/markers.json").then((response) => response.json()),
        fetch("/geojson/track-port-hardy-cape-scott.geojson").then((response) =>
          response.json(),
        ),
        fetch("/geojson/shapes.json").then((response) => response.json()),
      ]);

      const mixed = {
        type: "FeatureCollection",
        features: [markers.features[0], track.features[0], shapes.features[0]],
      };

      const map = window.waymarkFixture.makeMap({
        id: "map",
        style: styleURL,
        center: closeup.center,
        zoom: closeup.zoom,
      });

      const instance = window.waymarkFixture.createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: mixed }] },
        },
      });

      await new Promise((resolve) => {
        let settled = false;
        const settle = () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        };

        if (map.loaded() && map.areTilesLoaded() && !map.isMoving()) {
          settle();
          return;
        }

        map.once("idle", settle);
        setTimeout(settle, 10_000);
      });

      const authored = instance.toJSON().data.layers[0].data;

      const geometryTypesRenderedFor = (layerId) => [
        ...new Set(
          map
            .queryRenderedFeatures({ layers: [layerId] })
            .map((feature) => feature.geometry?.type)
            .filter(Boolean),
        ),
      ];

      return {
        geometryTypes: mixed.features.map((feature) => feature.geometry.type),
        authoredCount: authored.features.length,
        filters: {
          circle:
            map.getLayer("waymark-map-geojson-layer-0-circle")?.filter ?? null,
          line:
            map.getLayer("waymark-map-geojson-layer-0-line")?.filter ?? null,
          fill:
            map.getLayer("waymark-map-geojson-layer-0-fill")?.filter ?? null,
        },
        rendered: {
          circle: map.queryRenderedFeatures({
            layers: ["waymark-map-geojson-layer-0-circle"],
          }).length,
          line: map.queryRenderedFeatures({
            layers: ["waymark-map-geojson-layer-0-line"],
          }).length,
          fill: map.queryRenderedFeatures({
            layers: ["waymark-map-geojson-layer-0-fill"],
          }).length,
        },
        renderedGeometryTypes: {
          circle: geometryTypesRenderedFor(
            "waymark-map-geojson-layer-0-circle",
          ),
          line: geometryTypesRenderedFor("waymark-map-geojson-layer-0-line"),
          fill: geometryTypesRenderedFor("waymark-map-geojson-layer-0-fill"),
        },
      };
    },
    { styleURL: API_BASEMAP_STYLE_URL, closeup: HOLBERG_CLOSEUP },
  );
}
