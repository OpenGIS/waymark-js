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
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });
      });

      await expect(page.locator("#map canvas")).toBeVisible();
    });
  });

  test.describe("Factory signature", () => {
    test("accepts an instance JSON document", async ({ page }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
              options: {
                zoom: 10,
              },
            },
          },
          data: {
            geojson: { type: "FeatureCollection", features: [] },
          },
        });

        return {
          id: instance.id,
          zoom: instance.toJSON().state.map.zoom,
        };
      });

      expect(result).toEqual({ id: "map", zoom: 10 });
    });

    test("accepts an empty instance JSON document", async ({ page }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({});

        return {
          id: instance.id,
          hasGeoJSON: Boolean(instance.toJSON().data.geojson),
        };
      });

      expect(result.id.startsWith("waymark-")).toBe(true);
      expect(result.hasGeoJSON).toBe(false);
    });

    test("supports round-trip instance document reuse", async ({ page }) => {
      const result = await page.evaluate((inlineStyle) => {
        const first = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            ui: { mode: "debug" },
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: inlineStyle,
                  },
                ],
              },
              options: {
                zoom: 7,
              },
            },
          },
          data: {
            geojson: { type: "FeatureCollection", features: [] },
          },
        });

        const second = window.waymarkFixture.createInstance(first.toJSON());

        return {
          equal:
            JSON.stringify(first.toJSON()) === JSON.stringify(second.toJSON()),
        };
      }, INLINE_STYLE);

      expect(result.equal).toBe(true);
    });
  });

  test.describe("Container resolution", () => {
    test("throws when a provided container is missing", async ({ page }) => {
      const message = await page.evaluate(() => {
        try {
          window.waymarkFixture.createInstance({
            config: {
              id: "missing-browser-container",
            },
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
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        return {
          zoom: instance.toJSON().state.map.zoom,
          center: instance.toJSON().state.map.center,
        };
      });

      expect(result.zoom).toBe(2);
      expect(result.center).toEqual([0, 0]);
    });

    test("injects OpenFreeMap default only when no basemaps are provided", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const defaultInstance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
          },
        });

        window.waymarkFixture.createContainer("map-raster-only");
        const rasterOnlyInstance = window.waymarkFixture.createInstance({
          config: {
            id: "map-raster-only",
            map: {
              basemaps: {
                raster: [
                  {
                    tileURLTemplates: [
                      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                    ],
                  },
                ],
              },
            },
          },
        });

        const defaultCore = window.waymarkFixture.getRuntimeCore(
          defaultInstance.id,
        );
        const rasterOnlyCore = window.waymarkFixture.getRuntimeCore(
          rasterOnlyInstance.id,
        );

        return {
          defaultVectorStyleURL:
            defaultCore.config.map.basemaps.vector[0]?.styleURL,
          rasterOnlyVectorCount:
            rasterOnlyCore.config.map.basemaps.vector.length,
        };
      });

      expect(result.defaultVectorStyleURL).toBe(
        "https://tiles.openfreemap.org/styles/bright",
      );
      expect(result.rasterOnlyVectorCount).toBe(0);
    });

    test("falls back to view mode when ui.mode is invalid", async ({
      page,
    }) => {
      const mode = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            ui: { mode: "invalid-mode" },
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        return instance.toJSON().state.ui.mode;
      });

      expect(mode).toBe("view");
    });

    test("rejects legacy map.options.style and invalid basemap entries", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        try {
          window.waymarkFixture.createInstance({
            config: {
              id: "map",
              map: {
                options: {
                  style: "https://example.com/style.json",
                },
              },
            },
          });
          return { legacyStyleError: null, invalidBasemapError: null };
        } catch (error) {
          const legacyStyleError = String(error.message);

          try {
            window.waymarkFixture.createInstance({
              config: {
                id: "map",
                map: {
                  basemaps: {
                    raster: [
                      {
                        tiles: [
                          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                        ],
                      },
                    ],
                  },
                },
              },
            });
            return { legacyStyleError, invalidBasemapError: null };
          } catch (secondError) {
            return {
              legacyStyleError,
              invalidBasemapError: String(secondError.message),
            };
          }
        }
      });

      expect(result.legacyStyleError).toBe(
        "Invalid config.map.options.style: use config.map.basemaps.vector[] instead.",
      );
      expect(result.invalidBasemapError).toBe(
        "Invalid config.map.basemaps.raster[0].tiles: unexpected key for raster basemap entry.",
      );
    });
  });

  test.describe("UI shell mode rendering", () => {
    test("keeps shell mounted in view mode and renders debug payload panel in debug mode", async ({
      page,
    }) => {
      const result = await page.evaluate((inlineStyle) => {
        window.waymarkFixture.createInstance({
          config: {
            id: "map",
            ui: { mode: "view" },
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: inlineStyle,
                  },
                ],
              },
            },
          },
        });

        const viewShell = document.querySelector(
          '#map [data-waymark-app="true"]',
        );
        const viewHasDetails = Boolean(viewShell?.querySelector("details"));

        window.waymarkFixture.createInstance({
          config: {
            id: "map",
            ui: { mode: "debug" },
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: inlineStyle,
                  },
                ],
              },
            },
          },
        });

        const debugShell = document.querySelector(
          '#map [data-waymark-app="true"]',
        );
        const summary = debugShell?.querySelector("summary")?.textContent ?? "";

        return {
          hasShell: Boolean(viewShell),
          viewHasDetails,
          debugHasDetails: Boolean(debugShell?.querySelector("details")),
          summary,
        };
      }, INLINE_STYLE);

      expect(result.hasShell).toBe(true);
      expect(result.viewHasDetails).toBe(false);
      expect(result.debugHasDetails).toBe(true);
      expect(result.summary).toContain("Instance debug payload");
    });
  });

  test.describe("Map options pass-through", () => {
    test("forwards options.center/options.zoom and arbitrary options", async ({
      page,
    }) => {
      const result = await page.evaluate((inlineStyle) => {
        const map = window.waymarkFixture.createContainer("map-options-test");
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map-options-test",
            map: {
              options: {
                center: [-0.1276, 51.5074],
                zoom: 10,
                bearing: 25,
              },
              basemaps: {
                vector: [
                  {
                    styleURL: inlineStyle,
                  },
                ],
              },
            },
          },
        });

        return {
          hasCanvas: Boolean(map.querySelector("canvas")),
          center: instance.toJSON().state.map.center,
          zoom: instance.toJSON().state.map.zoom,
          bearing: instance.toJSON().state.map.bearing,
        };
      }, INLINE_STYLE);

      expect(result.hasCanvas).toBe(true);
      expect(result.center.map((v) => Number(v.toFixed(4)))).toEqual([
        -0.1276, 51.5074,
      ]);
      expect(Number(result.zoom.toFixed(2))).toBe(10);
      expect(Number(result.bearing.toFixed(2))).toBe(25);
    });

    test("keeps serialisable map options only", async ({ page }) => {
      const result = await page.evaluate((inlineStyle) => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              options: {
                transformRequest: () => ({ url: "x" }),
                nested: {
                  onClick: () => {},
                  ok: true,
                },
              },
              basemaps: {
                vector: [
                  {
                    styleURL: inlineStyle,
                  },
                ],
              },
            },
          },
        });

        return instance.toJSON().config.map.options;
      }, INLINE_STYLE);

      expect(result.transformRequest).toBeUndefined();
      expect(result.nested).toEqual({ ok: true });
    });

    test("uses the first vector basemap and stacks raster overlays in listed order", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: {
                      version: 8,
                      sources: {},
                      layers: [{ id: "background", type: "background" }],
                    },
                  },
                  {
                    styleURL: "https://example.com/unused-style.json",
                  },
                ],
                raster: [
                  {
                    tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                    opacity: 0.6,
                  },
                  {
                    tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                    opacity: 0.3,
                  },
                ],
              },
            },
          },
        });

        const map = window.waymarkFixture.getRuntimeMap(instance.id);
        return new Promise((resolve) => {
          const readLayers = () => {
            const styleLayers = map.getStyle().layers;
            resolve(
              styleLayers.map((layer) => ({
                id: layer.id,
                type: layer.type,
                opacity: layer.paint?.["raster-opacity"],
              })),
            );
          };

          if (map.loaded()) {
            readLayers();
            return;
          }

          map.on("load", readLayers);
        });
      });

      expect(result).toEqual([
        { id: "background", type: "background", opacity: undefined },
        {
          id: "waymark-map-basemap-raster-layer-0",
          type: "raster",
          opacity: 0.6,
        },
        {
          id: "waymark-map-basemap-raster-layer-1",
          type: "raster",
          opacity: 0.3,
        },
      ]);
    });
  });

  test.describe("Returned instance shape", () => {
    test("returns documented properties and methods", async ({ page }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        return {
          id: instance.id,
          hasUI: Boolean(instance.ui),
          hasToJSON: typeof instance.toJSON === "function",
          hasSetMode: typeof instance.ui?.setMode === "function",
          hasDestroy: typeof instance.destroy === "function",
          hasOn: typeof instance.on === "function",
          hasOff: typeof instance.off === "function",
          hasOnce: typeof instance.once === "function",
        };
      });

      expect(result).toEqual({
        id: "map",
        hasUI: true,
        hasToJSON: true,
        hasSetMode: true,
        hasDestroy: true,
        hasOn: true,
        hasOff: true,
        hasOnce: true,
      });
    });
  });

  test.describe("Instance reuse and destroy semantics", () => {
    test("recreates existing instance on same id and applies incoming document", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const first = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              options: {
                zoom: 12,
              },
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        const second = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              options: {
                zoom: 5,
              },
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
          data: {
            geojson: { type: "FeatureCollection", features: [] },
          },
        });

        first.destroy();
        const third = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              options: {},
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        return {
          secondIsNew: second !== first,
          secondZoom: second.toJSON().state.map.zoom,
          secondHasGeoJSON: Boolean(second.toJSON().data.geojson),
          thirdIsNew: third !== second,
        };
      });

      expect(result).toEqual({
        secondIsNew: true,
        secondZoom: 5,
        secondHasGeoJSON: true,
        thirdIsNew: true,
      });
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
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
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

        window.waymarkFixture
          .getRuntimeMap(instance.id)
          .fire("moveend", { source: "playwright", test: true });

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

    test("emits waymark:ui.mode.changed with module payload", async ({
      page,
    }) => {
      const detail = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            ui: { mode: "view" },
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        return new Promise((resolve) => {
          instance.on("waymark:ui.mode.changed", (event) => {
            resolve(event.detail);
          });
          instance.ui.setMode("debug");
        });
      });

      expect(detail).toEqual({
        id: "map",
        module: "ui",
        event: "mode.changed",
        previous: "view",
        next: "debug",
        source: "public:ui.setMode",
      });
    });
  });

  test.describe("Instance JSON shape", () => {
    test("toJSON returns a serialisable config/state/data payload", async ({
      page,
    }) => {
      const instanceJSON = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            map: {
              options: {
                zoom: 9,
              },
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
        });

        return instance.toJSON();
      });

      expect(instanceJSON).toEqual(
        expect.objectContaining({
          config: expect.objectContaining({
            id: "map",
          }),
          state: expect.objectContaining({
            map: expect.objectContaining({
              center: expect.any(Array),
              zoom: 9,
              bearing: expect.any(Number),
              pitch: expect.any(Number),
            }),
            ui: expect.objectContaining({ mode: "view" }),
          }),
          data: expect.objectContaining({
            geojson: null,
          }),
        }),
      );
    });

    test("omits runtime-injected defaults and keeps authored basemaps", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const defaultInstance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
          },
        });

        window.waymarkFixture.createContainer("map-explicit");
        const explicitInstance = window.waymarkFixture.createInstance({
          config: {
            id: "map-explicit",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: "https://tiles.openfreemap.org/styles/bright",
                  },
                ],
                raster: [],
              },
            },
          },
        });

        return {
          defaultBasemaps: defaultInstance.toJSON().config.map.basemaps,
          explicitBasemaps: explicitInstance.toJSON().config.map.basemaps,
        };
      });

      expect(result.defaultBasemaps).toBeUndefined();
      expect(result.explicitBasemaps).toEqual({
        vector: [{ styleURL: "https://tiles.openfreemap.org/styles/bright" }],
      });
    });
  });

  test.describe("Initial GeoJSON overlay", () => {
    test("creates instance-scoped source and layer from data.geojson", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        window.waymarkFixture.createContainer("map-geojson-test");
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map-geojson-test",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: { version: 8, sources: {}, layers: [] },
                  },
                ],
              },
            },
          },
          data: {
            geojson: {
              type: "FeatureCollection",
              features: [],
            },
          },
        });

        return new Promise((resolve) => {
          const map = window.waymarkFixture.getRuntimeMap(instance.id);
          const check = () => {
            resolve({
              hasSource: Boolean(
                map.getSource("waymark-map-geojson-test-geojson-source"),
              ),
              hasLayer: Boolean(
                map.getLayer("waymark-map-geojson-test-geojson-layer"),
              ),
            });
          };

          if (map.loaded()) {
            check();
            return;
          }

          map.on("load", check);
        });
      });

      expect(result).toEqual({ hasSource: true, hasLayer: true });
    });
  });
});
