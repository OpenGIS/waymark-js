import { expect, test } from "./helpers/test.js";
import {
  HOLBERG_CLOSEUP,
  mountFamilies,
  mountMixed,
  mountQuickStart,
} from "./helpers/scenes.js";

const INLINE_STYLE = {
  version: 8,
  sources: {},
  layers: [],
};

const BACKGROUND_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background" }],
};

test.describe("1. API", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/browser-api.html");
  });

  test.describe("Quick start", () => {
    test("renders a map canvas for an injected instance", async ({ page }) => {
      await page.evaluate((style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });
      }, INLINE_STYLE);

      await expect(page.locator("#map canvas")).toBeVisible();
    });

    test("renders MapLibre controls styled inside the map container", async ({
      page,
    }) => {
      await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }
      }, INLINE_STYLE);

      const attribution = page.locator(".maplibregl-ctrl-attrib");
      await expect(attribution).toBeVisible();

      const [attributionBox, mapBox] = await Promise.all([
        attribution.boundingBox(),
        page.locator("#map").boundingBox(),
      ]);

      expect(attributionBox.x).toBeGreaterThanOrEqual(mapBox.x);
      expect(attributionBox.y).toBeGreaterThanOrEqual(mapBox.y);
      expect(attributionBox.x + attributionBox.width).toBeLessThanOrEqual(
        mapBox.x + mapBox.width,
      );
      expect(attributionBox.y + attributionBox.height).toBeLessThanOrEqual(
        mapBox.y + mapBox.height,
      );
    });

    test("API browser screens emit zero console or page errors", async ({
      page,
    }) => {
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      await page.evaluate((style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        const instance = window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        window.__test = { map, instance };
      }, INLINE_STYLE);

      await page.waitForFunction(() => window.__test?.map?.loaded());

      await page.evaluate(() => {
        const { instance } = window.__test;
        instance.data.addLayer({
          data: { type: "FeatureCollection", features: [] },
        });
        instance.data.fitBounds();
        instance.debug.setEnabled(false);
      });

      await page.waitForTimeout(500);

      expect(errors).toEqual([]);
    });
  });

  test.describe("Factory signature", () => {
    test("accepts a map and an instance document", async ({ page }) => {
      const result = await page.evaluate((style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        const instance = window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        return {
          id: instance.id,
          layerCount: instance.toJSON().data.layers.length,
        };
      }, INLINE_STYLE);

      expect(result).toEqual({ id: "map", layerCount: 1 });
    });

    test("accepts an empty instance document", async ({ page }) => {
      const result = await page.evaluate((style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        const instance = window.waymarkFixture.createInstance({ map });

        return {
          id: instance.id,
          hasGeoJSON: instance.toJSON().data.layers.length > 0,
        };
      }, INLINE_STYLE);

      expect(result.id.startsWith("waymark-")).toBe(true);
      expect(result.hasGeoJSON).toBe(false);
    });

    test("supports round-trip instance document reuse", async ({ page }) => {
      const result = await page.evaluate((style) => {
        const first = window.waymarkFixture.createInstance({
          map: window.waymarkFixture.makeMap({ id: "map", style }),
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        window.waymarkFixture.createContainer("map-two");

        const second = window.waymarkFixture.createInstance({
          map: window.waymarkFixture.makeMap({ id: "map-two", style }),
          document: first.toJSON(),
        });

        return {
          equal:
            JSON.stringify(first.toJSON()) === JSON.stringify(second.toJSON()),
        };
      }, INLINE_STYLE);

      expect(result.equal).toBe(true);
    });

    test("rejects invalid GeoJSON data-layer shapes", async ({ page }) => {
      const result = await page.evaluate((style) => {
        try {
          window.waymarkFixture.createInstance({
            map: window.waymarkFixture.makeMap({ id: "map", style }),
            document: {
              config: { id: "map" },
              data: {
                layers: [
                  {
                    data: {
                      type: "LineString",
                      coordinates: [[0, 0]],
                    },
                  },
                ],
              },
            },
          });

          return { ok: true, message: null };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      }, INLINE_STYLE);

      expect(result).toEqual({
        ok: false,
        message:
          "Invalid data.layers[0].data.coordinates: expected a LineString coordinates array with at least two positions.",
      });
    });
  });

  test.describe("Map injection", () => {
    test("throws a TypeError for a missing or invalid map", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const readMessage = (fn) => {
          try {
            fn();
            return null;
          } catch (error) {
            return error instanceof Error ? error.message : String(error);
          }
        };

        return {
          missing: readMessage(() => window.waymarkFixture.createInstance({})),
          invalid: readMessage(() =>
            window.waymarkFixture.createInstance({ map: {} }),
          ),
        };
      });

      expect(result.missing).toBe(
        "createInstance({ map }) requires a MapLibre-compatible map instance; received undefined.",
      );
      expect(result.invalid).toContain(
        "createInstance({ map }) requires a MapLibre-compatible map instance. Missing method(s):",
      );
    });

    test("throws when the same map already has a runtime", async ({ page }) => {
      const message = await page.evaluate((style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        try {
          window.waymarkFixture.createInstance({
            map,
            document: { config: { id: "map" } },
          });
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      }, INLINE_STYLE);

      expect(message).toBe(
        "This map already has a Waymark instance. Call destroy() on the existing instance before creating another.",
      );
    });

    test("mounts immediately when the injected map is already loaded", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        return {
          hasSource: Boolean(map.getSource("waymark-map-geojson-source-0")),
          hasLayer: Boolean(map.getLayer("waymark-map-geojson-layer-0-line")),
        };
      }, INLINE_STYLE);

      expect(result).toEqual({ hasSource: true, hasLayer: true });
    });

    test("waits for load when the injected map is not yet loaded", async ({
      page,
    }) => {
      const result = await page.evaluate((style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });

        window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        const before = Boolean(map.getSource("waymark-map-geojson-source-0"));

        return new Promise((resolve) => {
          const finish = () =>
            resolve({
              before,
              after: Boolean(map.getSource("waymark-map-geojson-source-0")),
            });

          if (map.loaded()) {
            finish();
            return;
          }

          map.once("load", finish);
        });
      }, INLINE_STYLE);

      expect(result.before).toBe(false);
      expect(result.after).toBe(true);
    });
  });

  test.describe("Config defaults and merge behaviour", () => {
    test("resolves debug defaults without map slices", async ({ page }) => {
      const result = await page.evaluate((style) => {
        const instance = window.waymarkFixture.createInstance({
          map: window.waymarkFixture.makeMap({ id: "map", style }),
          document: { config: { id: "map" } },
        });

        const instanceDocument = instance.toJSON();

        return {
          debug: instanceDocument.config.debug,
          hasConfigMap: Object.hasOwn(instanceDocument.config, "map"),
          hasStateMap: Object.hasOwn(instanceDocument.state, "map"),
        };
      }, INLINE_STYLE);

      expect(result).toEqual({
        debug: false,
        hasConfigMap: false,
        hasStateMap: false,
      });
    });
  });

  test.describe("Returned instance shape", () => {
    test("returns documented properties and methods", async ({ page }) => {
      const result = await page.evaluate((style) => {
        const instance = window.waymarkFixture.createInstance({
          map: window.waymarkFixture.makeMap({ id: "map", style }),
          document: { config: { id: "map" } },
        });

        return {
          id: instance.id,
          hasData: Boolean(instance.data),
          hasToJSON: typeof instance.toJSON === "function",
          hasAddLayer: typeof instance.data?.addLayer === "function",
          hasFitBounds: typeof instance.data?.fitBounds === "function",
          hasDestroy: typeof instance.destroy === "function",
          hasOn: typeof instance.on === "function",
          hasOff: typeof instance.off === "function",
          hasOnce: typeof instance.once === "function",
        };
      }, INLINE_STYLE);

      expect(result).toEqual({
        id: "map",
        hasData: true,
        hasToJSON: true,
        hasAddLayer: true,
        hasFitBounds: true,
        hasDestroy: true,
        hasOn: true,
        hasOff: true,
        hasOnce: true,
      });
    });
  });

  test.describe("Instance reuse and destroy semantics", () => {
    test("destroy leaves the map and container intact", async ({ page }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        let removeCalled = false;
        const originalRemove = map.remove.bind(map);
        map.remove = () => {
          removeCalled = true;
          return originalRemove();
        };

        const instance = window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        instance.destroy();

        return {
          removeCalled,
          containerInDocument: document.body.contains(map.getContainer()),
          coreGone: window.waymarkFixture.getRuntimeCore(map) === null,
          hasSource: Boolean(map.getSource("waymark-map-geojson-source-0")),
          hasLayer: Boolean(map.getLayer("waymark-map-geojson-layer-0-line")),
        };
      }, INLINE_STYLE);

      expect(result).toEqual({
        removeCalled: false,
        containerInDocument: true,
        coreGone: true,
        hasSource: false,
        hasLayer: false,
      });
    });

    test("allows a fresh instance on the same map after destroy", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        const first = window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        first.destroy();
        first.destroy();

        const second = window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        return { secondIsNew: second !== first };
      }, INLINE_STYLE);

      expect(result.secondIsNew).toBe(true);
    });
  });

  test.describe("Instance event API", () => {
    test("supports lifecycle events on the map container", async ({ page }) => {
      const result = await page.evaluate((style) => {
        const container = document.getElementById("map");
        const seen = [];
        container.addEventListener("waymark:instance.created", (event) => {
          seen.push({ type: event.type, detail: event.detail });
        });
        container.addEventListener("waymark:instance.destroyed", (event) => {
          seen.push({ type: event.type, detail: event.detail });
        });

        const instance = window.waymarkFixture.createInstance({
          map: window.waymarkFixture.makeMap({ id: "map", style }),
          document: { config: { id: "map" } },
        });

        instance.destroy();

        return seen;
      }, INLINE_STYLE);

      expect(result).toEqual([
        { type: "waymark:instance.created", detail: { id: "map" } },
        { type: "waymark:instance.destroyed", detail: { id: "map" } },
      ]);
    });
  });

  test.describe("InstanceDocument shape", () => {
    test("toJSON returns a serialisable config/state/data payload", async ({
      page,
    }) => {
      const result = await page.evaluate((style) => {
        const instance = window.waymarkFixture.createInstance({
          map: window.waymarkFixture.makeMap({ id: "map", style }),
          document: {
            config: {
              id: "map",
              types: {
                beer: { paint: { circle: { "circle-color": "#754423" } } },
              },
            },
          },
        });

        instance.types.setVisibility("beer", false);
        instance.debug.setEnabled(true);

        const instanceDocument = instance.toJSON();

        return {
          keys: Object.keys(instanceDocument),
          id: instanceDocument.config.id,
          stateTypes: instanceDocument.state.types,
          stateDebug: instanceDocument.state.debug,
          hasConfigMap: Object.hasOwn(instanceDocument.config, "map"),
          hasStateMap: Object.hasOwn(instanceDocument.state, "map"),
        };
      }, INLINE_STYLE);

      expect(result.keys).toEqual(["config", "state", "data"]);
      expect(result.id).toBe("map");
      expect(result.stateTypes).toEqual({ beer: { visible: false } });
      expect(result.stateDebug).toBe(true);
      expect(result.hasConfigMap).toBe(false);
      expect(result.hasStateMap).toBe(false);
    });
  });

  test.describe("Initial GeoJSON overlay", () => {
    test("emits data-layer added and validation error events for runtime addLayer", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        const instance = window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        const added = [];
        const errors = [];

        instance.on("waymark:data.layer.added", (event) => {
          added.push(event.detail);
        });
        instance.on("waymark:data.layer.error", (event) => {
          errors.push(event.detail);
        });

        instance.data.addLayer({
          data: { type: "FeatureCollection", features: [] },
        });

        let thrownMessage = null;
        try {
          instance.data.addLayer({
            data: { type: "FeatureCollection" },
          });
        } catch (error) {
          thrownMessage =
            error instanceof Error ? error.message : String(error);
        }

        return { added, errors, thrownMessage };
      }, INLINE_STYLE);

      expect(result.added).toEqual([
        {
          id: "map",
          layer: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
      ]);
      expect(result.errors).toEqual([
        {
          id: "map",
          stage: "validation",
          message: "Invalid data.layers[1].data.features: expected an array.",
        },
      ]);
      expect(result.thrownMessage).toBe(
        "Invalid data.layers[1].data.features: expected an array.",
      );
    });

    test("creates instance-scoped source and layer ids from data.layers", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        return {
          hasSource: Boolean(map.getSource("waymark-map-geojson-source-0")),
          hasLayer: Boolean(map.getLayer("waymark-map-geojson-layer-0-line")),
        };
      }, INLINE_STYLE);

      expect(result).toEqual({ hasSource: true, hasLayer: true });
    });

    test("renders geometry families as circle, line, and fill layers", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [
                {
                  data: {
                    type: "FeatureCollection",
                    features: [
                      {
                        type: "Feature",
                        geometry: {
                          type: "MultiPoint",
                          coordinates: [
                            [-0.1276, 51.5074],
                            [-1.2577, 51.752],
                          ],
                        },
                        properties: {},
                      },
                    ],
                  },
                },
                {
                  data: {
                    type: "FeatureCollection",
                    features: [
                      {
                        type: "Feature",
                        geometry: {
                          type: "MultiLineString",
                          coordinates: [
                            [
                              [0, 0],
                              [1, 1],
                            ],
                            [
                              [1, 1],
                              [2, 2],
                            ],
                          ],
                        },
                        properties: {},
                      },
                    ],
                  },
                },
                {
                  data: {
                    type: "FeatureCollection",
                    features: [
                      {
                        type: "Feature",
                        geometry: {
                          type: "MultiPolygon",
                          coordinates: [
                            [
                              [
                                [0, 0],
                                [1, 0],
                                [1, 1],
                                [0, 1],
                                [0, 0],
                              ],
                            ],
                          ],
                        },
                        properties: {},
                      },
                    ],
                  },
                },
              ],
            },
          },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        const layerIds = (map.getStyle()?.layers ?? []).map(
          (layer) => layer.id,
        );

        return {
          types: [
            map.getLayer("waymark-map-geojson-layer-0-circle")?.type ?? null,
            map.getLayer("waymark-map-geojson-layer-1-line")?.type ?? null,
            map.getLayer("waymark-map-geojson-layer-2-fill")?.type ?? null,
          ],
          layerIds,
        };
      }, INLINE_STYLE);

      expect(result.types).toEqual(["circle", "line", "fill"]);
      expect(result.layerIds).toEqual([
        "waymark-map-geojson-layer-2-fill",
        "waymark-map-geojson-layer-1-line",
        "waymark-map-geojson-layer-0-circle-hit",
        "waymark-map-geojson-layer-0-circle",
      ]);
    });

    test("emits waymark:data.layer.mounted for mounted data sublayers", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        const instance = window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        const mounted = [];
        instance.on("waymark:data.layer.mounted", (event) => {
          mounted.push(event.detail);
        });

        instance.data.addLayer({
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [0, 0] },
                properties: {},
              },
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                },
                properties: {},
              },
            ],
          },
        });

        return mounted;
      }, INLINE_STYLE);

      expect(result).toEqual([
        {
          id: "map",
          layerIndex: 0,
          mountedFamilies: ["circle", "line", "circle"],
          mountedLayerIds: [
            "waymark-map-geojson-layer-0-circle",
            "waymark-map-geojson-layer-0-line",
            "waymark-map-geojson-layer-0-circle-hit",
          ],
          mountedTypes: [],
        },
      ]);
    });

    test("keeps GeoJSON layers mounted after a consumer style swap", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({ id: "map", style });
        window.waymarkFixture.createInstance({
          map,
          document: {
            config: { id: "map" },
            data: {
              layers: [{ data: { type: "FeatureCollection", features: [] } }],
            },
          },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        const before = Boolean(map.getSource("waymark-map-geojson-source-0"));

        map.setStyle({ version: 8, sources: {}, layers: [] });

        return new Promise((resolve) => {
          const startedAt = Date.now();
          const check = () => {
            const hasSource = Boolean(
              map.getSource("waymark-map-geojson-source-0"),
            );

            if (!hasSource && Date.now() - startedAt < 5000) {
              setTimeout(check, 50);
              return;
            }

            resolve({ before, after: hasSource });
          };

          check();
        });
      }, BACKGROUND_STYLE);

      expect(result.before).toBe(true);
      expect(result.after).toBe(true);
    });

    test("fits map bounds when addLayer fitBounds defaults to true", async ({
      page,
    }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({
          id: "map",
          style,
          center: [0, 0],
          zoom: 2,
        });
        const instance = window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        instance.data.addLayer({
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [10, 10],
                    [11, 11],
                  ],
                },
                properties: {},
              },
            ],
          },
        });

        return new Promise((resolve) => {
          let settled = false;
          const settle = (value) => {
            if (settled) {
              return;
            }
            settled = true;
            resolve(value);
          };

          const startedAt = Date.now();
          const check = () => {
            const hasLayer = Boolean(
              map.getLayer("waymark-map-geojson-layer-0-line"),
            );

            if (!hasLayer && Date.now() - startedAt < 5000) {
              setTimeout(check, 50);
              return;
            }

            const onMoveEnd = () => {
              settle({
                center: [map.getCenter().lng, map.getCenter().lat],
                zoom: map.getZoom(),
              });
            };

            map.once("moveend", onMoveEnd);

            setTimeout(() => {
              map.off("moveend", onMoveEnd);
              settle({
                center: [map.getCenter().lng, map.getCenter().lat],
                zoom: map.getZoom(),
              });
            }, 1500);
          };

          check();
        });
      }, INLINE_STYLE);

      expect(result.center[0]).toBeCloseTo(10.5, 2);
      expect(result.center[1]).toBeCloseTo(10.5, 2);
      expect(result.zoom).toBeGreaterThan(2);
    });

    test("skips bounds fitting when fitBounds is false", async ({ page }) => {
      const result = await page.evaluate(async (style) => {
        const map = window.waymarkFixture.makeMap({
          id: "map",
          style,
          center: [0, 0],
          zoom: 2,
        });
        const instance = window.waymarkFixture.createInstance({
          map,
          document: { config: { id: "map" } },
        });

        if (!map.loaded()) {
          await new Promise((resolve) => map.once("load", resolve));
        }

        instance.data.addLayer(
          {
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [10, 10],
                      [11, 11],
                    ],
                  },
                  properties: {},
                },
              ],
            },
          },
          { fitBounds: false },
        );

        return new Promise((resolve) => {
          const startedAt = Date.now();
          const check = () => {
            const hasLayer = Boolean(
              map.getLayer("waymark-map-geojson-layer-0-line"),
            );

            if (!hasLayer && Date.now() - startedAt < 5000) {
              setTimeout(check, 50);
              return;
            }

            resolve({
              center: [map.getCenter().lng, map.getCenter().lat],
              zoom: map.getZoom(),
            });
          };

          check();
        });
      }, INLINE_STYLE);

      expect(result.center[0]).toBeCloseTo(0, 2);
      expect(result.center[1]).toBeCloseTo(0, 2);
      expect(result.zoom).toBeCloseTo(2, 1);
    });
  });

  test.describe("Screenshot scenes", () => {
    test("quick start — injected map with a GeoJSON layer", async ({
      page,
    }) => {
      const mounted = await mountQuickStart(page);

      expect(mounted.rendered).toBeGreaterThanOrEqual(1);
      await expect(page.locator("#map canvas")).toBeVisible();
    });

    test("geojson families — circle, line, fill layers", async ({ page }) => {
      const evidence = await mountFamilies(page);

      // Guard against a region-wide fit: the 494 m polygon must read as a
      // visible shape, not a few pixels, and sit fully inside the canvas.
      expect(evidence.polygonWidth).toBeGreaterThanOrEqual(40);
      expect(evidence.polygonHeight).toBeGreaterThanOrEqual(40);
      expect(evidence.polygonBox.left).toBeGreaterThanOrEqual(0);
      expect(evidence.polygonBox.top).toBeGreaterThanOrEqual(0);
      expect(evidence.polygonBox.right).toBeLessThanOrEqual(
        evidence.canvas.width,
      );
      expect(evidence.polygonBox.bottom).toBeLessThanOrEqual(
        evidence.canvas.height,
      );
      expect(evidence.renderedFill).toBeGreaterThanOrEqual(1);
      expect(evidence.zoom).toBeCloseTo(HOLBERG_CLOSEUP.zoom, 1);

      await expect(page.locator("#map canvas")).toBeVisible();
    });

    test("geojson mixed — mixed FeatureCollection", async ({ page }) => {
      const result = await mountMixed(page);

      // The assembled FeatureCollection must be exactly one point, one line
      // and one polygon, and every family layer must have rendered at least
      // one feature in the closeup.
      expect(result.authoredCount).toBe(3);
      expect(result.geometryTypes).toEqual(["Point", "LineString", "Polygon"]);
      expect(result.rendered.circle).toBeGreaterThanOrEqual(1);
      expect(result.rendered.line).toBeGreaterThanOrEqual(1);
      expect(result.rendered.fill).toBeGreaterThanOrEqual(1);

      // Each family layer constrains itself to its own geometry type, so the
      // circle layer no longer beads the line and the fill layer no longer
      // closes and washes the line.
      expect(result.filters).toEqual({
        circle: ["==", ["geometry-type"], "Point"],
        line: ["==", ["geometry-type"], "LineString"],
        fill: ["==", ["geometry-type"], "Polygon"],
      });
      expect(result.renderedGeometryTypes.circle).toEqual(["Point"]);
      expect(result.renderedGeometryTypes.line.length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        result.renderedGeometryTypes.line.every((type) =>
          ["LineString", "MultiLineString"].includes(type),
        ),
      ).toBe(true);
      expect(result.renderedGeometryTypes.fill.length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        result.renderedGeometryTypes.fill.every((type) =>
          ["Polygon", "MultiPolygon"].includes(type),
        ),
      ).toBe(true);

      await expect(page.locator("#map canvas")).toBeVisible();
    });
  });

  test.describe("Feature interaction events", () => {
    const COORDS = [-127.998, 50.661];
    const HIT_LAYER = "waymark-map-geojson-layer-0-circle-hit";

    /**
     * Create a map with a single point feature, wire interaction listeners,
     * and wait until the point is queryable. Returns the projected pixel.
     */
    async function mountPoint(page, { destroy = false } = {}) {
      return page.evaluate(
        async ({ style, coords, hitLayer, destroy }) => {
          const samplePoint = await fetch("/geojson/sample-point.geojson").then(
            (response) => response.json(),
          );

          const map = window.waymarkFixture.makeMap({
            id: "map",
            style,
            center: coords,
            zoom: 12,
          });

          const instance = window.waymarkFixture.createInstance({
            map,
            document: {
              config: { id: "map" },
              data: {
                layers: [{ data: samplePoint }],
              },
            },
          });

          if (!map.loaded()) {
            await new Promise((resolve) => map.once("load", resolve));
          }

          window.__events = [];

          for (const type of [
            "waymark:feature.click",
            "waymark:feature.hover",
            "waymark:feature.leave",
          ]) {
            instance.on(type, (event) => {
              const detail = event.detail;
              window.__events.push({
                type,
                id: detail.id,
                layerId: detail.layerId,
                title: detail.feature?.properties?.title ?? null,
                lngLat: detail.lngLat
                  ? [detail.lngLat.lng, detail.lngLat.lat]
                  : null,
                hasOriginalEvent: Boolean(detail.originalEvent),
              });
            });
          }

          await new Promise((resolve) => {
            const startedAt = Date.now();
            const check = () => {
              const at = map.project(coords);
              const hit = map.queryRenderedFeatures(at, {
                layers: [hitLayer],
              });

              if (hit.length > 0 || Date.now() - startedAt > 5000) {
                resolve();
                return;
              }

              setTimeout(check, 50);
            };

            check();
          });

          if (destroy) {
            instance.destroy();
          }

          const projected = map.project(coords);
          return { x: projected.x, y: projected.y };
        },
        { style: INLINE_STYLE, coords: COORDS, hitLayer: HIT_LAYER, destroy },
      );
    }

    test("emits feature click, hover and leave events for rendered features", async ({
      page,
    }) => {
      const point = await mountPoint(page);
      const box = await page.locator("#map canvas").boundingBox();

      await page.mouse.move(box.x + point.x, box.y + point.y);
      await page.mouse.move(box.x + point.x, box.y + point.y);
      await page.mouse.click(box.x + point.x, box.y + point.y);
      await page.mouse.move(box.x + 5, box.y + 5);

      const events = await page.evaluate(() => window.__events);

      const click = events.find(
        (event) => event.type === "waymark:feature.click",
      );
      expect(click).toMatchObject({
        id: "map",
        layerId: HIT_LAYER,
        title: "Sample point",
        hasOriginalEvent: true,
      });
      expect(click.lngLat[0]).toBeCloseTo(COORDS[0], 4);
      expect(click.lngLat[1]).toBeCloseTo(COORDS[1], 4);

      const hover = events.find(
        (event) => event.type === "waymark:feature.hover",
      );
      expect(hover).toMatchObject({
        id: "map",
        layerId: HIT_LAYER,
        title: "Sample point",
      });

      const leave = events.find(
        (event) => event.type === "waymark:feature.leave",
      );
      expect(leave).toMatchObject({
        id: "map",
        layerId: HIT_LAYER,
        title: "Sample point",
      });

      // Hover is emitted once on entry, not repeatedly while over the feature.
      expect(
        events.filter((event) => event.type === "waymark:feature.hover"),
      ).toHaveLength(1);
    });

    test("stops emitting feature events after destroy", async ({ page }) => {
      const point = await mountPoint(page, { destroy: true });
      const box = await page.locator("#map canvas").boundingBox();

      await page.mouse.move(box.x + point.x, box.y + point.y);
      await page.mouse.click(box.x + point.x, box.y + point.y);
      await page.mouse.move(box.x + 5, box.y + 5);

      const events = await page.evaluate(() => window.__events);
      expect(events).toEqual([]);
    });
  });
});
