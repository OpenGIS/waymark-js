import { expect, test } from "@playwright/test";

const INLINE_STYLE = {
  version: 8,
  sources: {},
  layers: [],
};

test.describe("1. API", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/browser-api.html");
  });

  test.describe("Quick start", () => {
    test("renders a map canvas for a created instance", async ({ page }) => {
      await page.evaluate(() => {
        window.waymarkFixture.createInstance({
          id: "map",
          map: { options: { style: { version: 8, sources: {}, layers: [] } } },
        });
      });

      await expect(page.locator("#map canvas")).toBeVisible();
    });
  });

  test.describe("Factory signature", () => {
    test("accepts config and geoJSON", async ({ page }) => {
      const result = await page.evaluate(() => {
        const geoJSON = { type: "FeatureCollection", features: [] };
        const instance = window.waymarkFixture.createInstance(
          {
            id: "map",
            map: {
              options: {
                style: { version: 8, sources: {}, layers: [] },
                zoom: 10,
              },
            },
          },
          geoJSON,
        );

        return {
          id: instance.id,
          zoom: instance.map.getZoom(),
        };
      });

      expect(result).toEqual({ id: "map", zoom: 10 });
    });

    test("accepts an empty config object with geoJSON", async ({ page }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance(
          {},
          { type: "FeatureCollection", features: [] },
        );

        return {
          id: instance.id,
          hasGeoJSON: Boolean(instance.getSnapshot().data.geojson.geojson),
        };
      });

      expect(result.id.startsWith("waymark-")).toBe(true);
      expect(result.hasGeoJSON).toBe(true);
    });
  });

  test.describe("Container resolution", () => {
    test("throws when a provided container is missing", async ({ page }) => {
      const message = await page.evaluate(() => {
        try {
          window.waymarkFixture.createInstance({
            id: "missing-browser-container",
          });
          return null;
        } catch (error) {
          return String(error.message);
        }
      });

      expect(message).toBe(
        'Waymark container "missing-browser-container" was not found.',
      );
    });
  });

  test.describe("Config defaults and merge behaviour", () => {
    test("applies defaults and preserves unspecified values", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          id: "map",
          map: { options: { style: { version: 8, sources: {}, layers: [] } } },
        });

        return {
          zoom: instance.map.getZoom(),
          center: instance.map.getCenter().toArray(),
        };
      });

      expect(result.zoom).toBe(2);
      expect(result.center).toEqual([0, 0]);
    });
  });

  test.describe("Map options pass-through", () => {
    test("forwards options.center/options.zoom and arbitrary options", async ({
      page,
    }) => {
      const result = await page.evaluate((inlineStyle) => {
        const map = window.waymarkFixture.createContainer("map-options-test");
        const instance = window.waymarkFixture.createInstance({
          id: "map-options-test",
          map: {
            options: {
              center: [-0.1276, 51.5074],
              zoom: 10,
              bearing: 25,
              style: inlineStyle,
            },
          },
        });

        return {
          hasCanvas: Boolean(map.querySelector("canvas")),
          center: instance.map.getCenter().toArray(),
          zoom: instance.map.getZoom(),
          bearing: instance.map.getBearing(),
        };
      }, INLINE_STYLE);

      expect(result.hasCanvas).toBe(true);
      expect(result.center.map((v) => Number(v.toFixed(4)))).toEqual([
        -0.1276, 51.5074,
      ]);
      expect(Number(result.zoom.toFixed(2))).toBe(10);
      expect(Number(result.bearing.toFixed(2))).toBe(25);
    });
  });

  test.describe("Returned instance shape", () => {
    test("returns documented properties and methods", async ({ page }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          id: "map",
          map: { options: { style: { version: 8, sources: {}, layers: [] } } },
        });

        return {
          id: instance.id,
          hasMap: Boolean(instance.map),
          hasConfig: Boolean(instance.config),
          hasGetSnapshot: typeof instance.getSnapshot === "function",
          hasDestroy: typeof instance.destroy === "function",
          hasOn: typeof instance.on === "function",
          hasOff: typeof instance.off === "function",
          hasOnce: typeof instance.once === "function",
        };
      });

      expect(result).toEqual({
        id: "map",
        hasMap: true,
        hasConfig: true,
        hasGetSnapshot: true,
        hasDestroy: true,
        hasOn: true,
        hasOff: true,
        hasOnce: true,
      });
    });
  });

  test.describe("Instance reuse and destroy semantics", () => {
    test("reuses existing instance and ignores subsequent args", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const first = window.waymarkFixture.createInstance({
          id: "map",
          map: {
            options: {
              style: { version: 8, sources: {}, layers: [] },
              zoom: 12,
            },
          },
        });

        const second = window.waymarkFixture.createInstance(
          {
            id: "map",
            map: {
              options: {
                style: { version: 8, sources: {}, layers: [] },
                zoom: 5,
              },
            },
          },
          { type: "FeatureCollection", features: [] },
        );

        first.destroy();
        const third = window.waymarkFixture.createInstance({
          id: "map",
          map: {
            options: {
              style: { version: 8, sources: {}, layers: [] },
            },
          },
        });

        return {
          same: first === second,
          firstZoom: first.map.getZoom(),
          thirdIsNew: third !== first,
        };
      });

      expect(result).toEqual({ same: true, firstZoom: 12, thirdIsNew: true });
    });
  });

  test.describe("Instance event API", () => {
    test("supports lifecycle and forwarded map events with originalEvent", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const container = document.getElementById("map");
        const seen = [];
        container.addEventListener("waymark:instance.created", (event) => {
          seen.push({ type: event.type, detail: event.detail });
        });

        const instance = window.waymarkFixture.createInstance({
          id: "map",
          map: {
            options: {
              style: { version: 8, sources: {}, layers: [] },
            },
          },
        });

        container.addEventListener("waymark:map.moveend", (event) => {
          seen.push({
            type: event.type,
            detail: {
              id: event.detail.id,
              mapEvent: event.detail.mapEvent,
              hasOriginalEvent: Boolean(event.detail.originalEvent),
            },
          });
        });

        instance.map.fire("moveend", { source: "playwright", test: true });

        return seen;
      });

      expect(result).toEqual([
        { type: "waymark:instance.created", detail: { id: "map" } },
        {
          type: "waymark:map.moveend",
          detail: {
            id: "map",
            mapEvent: "moveend",
            hasOriginalEvent: true,
          },
        },
      ]);
    });
  });

  test.describe("Snapshot shape", () => {
    test("getSnapshot returns serialisable map/ui/data payload", async ({
      page,
    }) => {
      const snapshot = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          id: "map",
          map: {
            options: {
              style: { version: 8, sources: {}, layers: [] },
              zoom: 9,
            },
          },
        });

        return instance.getSnapshot();
      });

      expect(snapshot).toEqual(
        expect.objectContaining({
          version: 1,
          map: expect.objectContaining({
            center: expect.any(Array),
            zoom: 9,
            bearing: expect.any(Number),
            pitch: expect.any(Number),
          }),
          ui: expect.objectContaining({ hasAppShell: expect.any(Boolean) }),
          data: expect.objectContaining({
            geojson: expect.objectContaining({
              sourceId: expect.any(String),
              layerId: expect.any(String),
            }),
          }),
        }),
      );
    });
  });

  test.describe("Initial GeoJSON overlay", () => {
    test("creates instance-scoped source and layer from third argument", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        window.waymarkFixture.createContainer("map-geojson-test");
        const instance = window.waymarkFixture.createInstance(
          {
            id: "map-geojson-test",
            map: {
              options: {
                style: { version: 8, sources: {}, layers: [] },
              },
            },
          },
          {
            type: "FeatureCollection",
            features: [],
          },
        );

        return new Promise((resolve) => {
          const check = () => {
            resolve({
              hasSource: Boolean(
                instance.map.getSource(
                  "waymark-map-geojson-test-geojson-source",
                ),
              ),
              hasLayer: Boolean(
                instance.map.getLayer("waymark-map-geojson-test-geojson-layer"),
              ),
            });
          };

          if (instance.map.loaded()) {
            check();
            return;
          }

          instance.map.on("load", check);
        });
      });

      expect(result).toEqual({ hasSource: true, hasLayer: true });
    });
  });
});
