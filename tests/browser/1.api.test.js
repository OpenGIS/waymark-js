import { expect, test } from "@playwright/test";
import { defaultBasemapVector } from "../../src/config/defaults.js";

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
    test("accepts an instance document", async ({ page }) => {
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
            layers: [{ geoJSON: { type: "FeatureCollection", features: [] } }],
          },
        });

        return {
          id: instance.id,
          zoom: instance.toJSON().config.map.options.zoom,
        };
      });

      expect(result).toEqual({ id: "map", zoom: 10 });
    });

    test("accepts an empty instance document", async ({ page }) => {
      const result = await page.evaluate(() => {
        const instance = window.waymarkFixture.createInstance({});

        return {
          id: instance.id,
          hasGeoJSON: instance.toJSON().data.layers.length > 0,
        };
      });

      expect(result.id.startsWith("waymark-")).toBe(true);
      expect(result.hasGeoJSON).toBe(false);
    });

    test("supports round-trip instance document reuse", async ({ page }) => {
      const result = await page.evaluate(async (inlineStyle) => {
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
            layers: [{ geoJSON: { type: "FeatureCollection", features: [] } }],
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
          zoom: instance.toJSON().config.map.options.zoom,
          center: instance.toJSON().config.map.options.center,
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

        return instance.toJSON().config.ui.mode;
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
    test("keeps shell mounted in view mode and renders debug sections in debug mode", async ({
      page,
    }) => {
      const result = await page.evaluate(async (inlineStyle) => {
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
        const viewHasDebugPanel = Boolean(
          viewShell?.querySelector('[data-waymark-debug-panel="true"]'),
        );
        const viewHasModal = Boolean(
          viewShell?.querySelector('[data-waymark-modal="true"]'),
        );

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

        const debugPanel = debugShell?.querySelector(
          '[data-waymark-debug-panel="true"]',
        );
        const debugModal = debugShell?.querySelector(
          '[data-waymark-modal="true"]',
        );
        const debugControl = debugShell?.querySelector(
          '[data-waymark-control="debug-output-toggle"]',
        );
        const headingTexts = [
          ...(debugPanel?.querySelectorAll("h2") ?? []),
        ].map((heading) => heading.textContent);
        window.waymarkFixture
          .getRuntimeMap("map")
          .fire("moveend", { type: "moveend", source: "browser-test" });
        await Promise.resolve();
        const eventsJSON =
          debugPanel?.querySelectorAll("pre")?.[1]?.textContent ?? "[]";
        const events = JSON.parse(eventsJSON);

        return {
          hasShell: Boolean(viewShell),
          viewHasDebugPanel,
          viewHasModal,
          hasDebugPanel: Boolean(debugPanel),
          hasDebugModal: Boolean(debugModal),
          hasDebugControl: Boolean(debugControl),
          headingTexts,
          eventsLength: events.length,
          lastEventType: events.at(-1)?.type ?? null,
          lastEventSummary: events.at(-1)?.detail ?? null,
        };
      }, INLINE_STYLE);

      expect(result.hasShell).toBe(true);
      expect(result.viewHasDebugPanel).toBe(false);
      expect(result.viewHasModal).toBe(false);
      expect(result.hasDebugPanel).toBe(true);
      expect(result.hasDebugModal).toBe(true);
      expect(result.hasDebugControl).toBe(true);
      expect(result.headingTexts).toEqual([
        "Instance document",
        "Waymark events (last 25)",
      ]);
      expect(result.eventsLength).toBeGreaterThan(0);
      expect(result.lastEventType).toBe("waymark:map.moveend");
      expect(result.lastEventSummary).toEqual(
        expect.objectContaining({
          mapEvent: "moveend",
          hasOriginalEvent: true,
          originalEventType: "moveend",
        }),
      );
    });

    test("updates debug instance document camera output after map moveend", async ({
      page,
    }) => {
      const result = await page.evaluate(async (inlineStyle) => {
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map",
            ui: { mode: "debug" },
            map: {
              options: {
                center: [10, 20],
                zoom: 4,
                bearing: 5,
                pitch: 6,
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

        const map = window.waymarkFixture.getRuntimeMap(instance.id);
        map?.jumpTo({
          center: [11, 21],
          zoom: 7,
          bearing: 9,
          pitch: 12,
        });
        map?.fire("moveend", {
          type: "moveend",
          source: "browser-test",
        });

        await Promise.resolve();

        const shell = document.querySelector('#map [data-waymark-app="true"]');
        const instanceDocumentJSON =
          shell?.querySelectorAll("pre")?.[0]?.textContent ?? "{}";

        return JSON.parse(instanceDocumentJSON)?.state?.map?.options ?? null;
      }, INLINE_STYLE);

      expect(result).toEqual({
        center: [11, 21],
        zoom: 7,
        bearing: 9,
        pitch: 12,
      });
    });

    test("toggles debug outputs from the internal debug control", async ({
      page,
    }) => {
      const result = await page.evaluate(async (inlineStyle) => {
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

        const shell = document.querySelector('#map [data-waymark-app="true"]');
        const control = shell?.querySelector(
          '[data-waymark-control="debug-output-toggle"]',
        );
        const hasPanelInitially = Boolean(
          shell?.querySelector('[data-waymark-debug-panel="true"]'),
        );
        const hasModalInitially = Boolean(
          shell?.querySelector('[data-waymark-modal="true"]'),
        );

        control?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
        const hasPanelAfterFirstClick = Boolean(
          shell?.querySelector('[data-waymark-debug-panel="true"]'),
        );
        const hasModalAfterFirstClick = Boolean(
          shell?.querySelector('[data-waymark-modal="true"]'),
        );

        control?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
        const hasPanelAfterSecondClick = Boolean(
          shell?.querySelector('[data-waymark-debug-panel="true"]'),
        );
        const hasModalAfterSecondClick = Boolean(
          shell?.querySelector('[data-waymark-modal="true"]'),
        );
        const eventsJSON =
          shell?.querySelectorAll("pre")?.[1]?.textContent ?? "[]";
        const eventTypes = JSON.parse(eventsJSON).map((entry) => entry.type);

        return {
          hasControl: Boolean(control),
          hasPanelInitially,
          hasModalInitially,
          hasPanelAfterFirstClick,
          hasModalAfterFirstClick,
          hasPanelAfterSecondClick,
          hasModalAfterSecondClick,
          eventTypes,
        };
      }, INLINE_STYLE);

      expect(result).toEqual({
        hasControl: true,
        hasPanelInitially: true,
        hasModalInitially: true,
        hasPanelAfterFirstClick: false,
        hasModalAfterFirstClick: false,
        hasPanelAfterSecondClick: true,
        hasModalAfterSecondClick: true,
        eventTypes: expect.arrayContaining([
          "waymark:state.changed",
          "waymark:state.ui.panel.changed",
        ]),
      });
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
          center: instance.toJSON().config.map.options.center,
          zoom: instance.toJSON().config.map.options.zoom,
          bearing: instance.toJSON().config.map.options.bearing,
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

    test("uses the first vector basemap and stacks raster overlays with index 0 on top", async ({
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
          id: "waymark-map-basemap-raster-layer-1",
          type: "raster",
          opacity: 0.3,
        },
        {
          id: "waymark-map-basemap-raster-layer-0",
          type: "raster",
          opacity: 0.6,
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
            layers: [{ geoJSON: { type: "FeatureCollection", features: [] } }],
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
          secondZoom: second.toJSON().config.map.options.zoom,
          secondHasGeoJSON: second.toJSON().data.layers.length > 0,
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

  test.describe("InstanceDocument shape", () => {
    test("toJSON returns a serialisable config/state/data payload", async ({
      page,
    }) => {
      const instanceDocument = await page.evaluate(() => {
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

      expect(instanceDocument).toEqual(
        expect.objectContaining({
          config: expect.objectContaining({
            id: "map",
          }),
          state: {},
          data: expect.objectContaining({
            layers: [],
          }),
        }),
      );
      expect(instanceDocument.config.map.options.zoom).toBe(9);
      expect(instanceDocument.state.map).toBeUndefined();
      expect(instanceDocument.state.ui).toBeUndefined();
    });

    test("keeps resolved defaults and authored basemaps stable in config", async ({
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

        return {
          defaultBasemaps: defaultInstance.toJSON().config.map.basemaps,
          explicitBasemaps: explicitInstance.toJSON().config.map.basemaps,
          explicitBasemapKeys: Object.keys(
            explicitInstance.toJSON().config.map.basemaps,
          ),
        };
      });

      expect(result.defaultBasemaps).toEqual({
        vector: [
          {
            title: defaultBasemapVector.title,
            styleURL: defaultBasemapVector.styleURL,
          },
        ],
      });
      expect(result.explicitBasemaps).toEqual({
        raster: [
          {
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
          },
        ],
        vector: [{ styleURL: defaultBasemapVector.styleURL }],
      });
      expect(result.explicitBasemapKeys).toEqual(["raster", "vector"]);
    });
  });

  test.describe("Initial GeoJSON overlay", () => {
    test("creates instance-scoped source and layer ids from data.layers", async ({
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
            layers: [
              {
                geoJSON: {
                  type: "FeatureCollection",
                  features: [],
                },
              },
            ],
          },
        });

        return new Promise((resolve) => {
          const map = window.waymarkFixture.getRuntimeMap(instance.id);
          const check = () => {
            resolve({
              hasSource: Boolean(
                map.getSource("waymark-map-geojson-test-geojson-source-0"),
              ),
              hasLayer: Boolean(
                map.getLayer("waymark-map-geojson-test-geojson-layer-0"),
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

    test("renders geometry families as circle, line, and fill layers", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        window.waymarkFixture.createContainer("map-geojson-family-test");
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map-geojson-family-test",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: {
                      version: 8,
                      sources: {},
                      layers: [],
                    },
                  },
                ],
              },
            },
          },
          data: {
            layers: [
              {
                geoJSON: {
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
                geoJSON: {
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
                geoJSON: {
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
        });

        return new Promise((resolve) => {
          const map = window.waymarkFixture.getRuntimeMap(instance.id);
          const expectedLayerIds = [
            "waymark-map-geojson-family-test-geojson-layer-2",
            "waymark-map-geojson-family-test-geojson-layer-1",
            "waymark-map-geojson-family-test-geojson-layer-0",
          ];
          const startedAt = Date.now();

          const check = () => {
            const layer0 = map.getLayer(
              "waymark-map-geojson-family-test-geojson-layer-0",
            );
            const layer1 = map.getLayer(
              "waymark-map-geojson-family-test-geojson-layer-1",
            );
            const layer2 = map.getLayer(
              "waymark-map-geojson-family-test-geojson-layer-2",
            );
            const layerIds = (map.getStyle()?.layers ?? []).map(
              (layer) => layer.id,
            );

            const hasExpectedLayers = expectedLayerIds.every((layerId) =>
              layerIds.includes(layerId),
            );

            if (!hasExpectedLayers && Date.now() - startedAt < 5000) {
              setTimeout(check, 50);
              return;
            }

            resolve({
              layerTypes: [
                layer0?.type ?? null,
                layer1?.type ?? null,
                layer2?.type ?? null,
              ],
              layerIds,
            });
          };

          check();
        });
      });

      expect(result.layerTypes).toEqual(["circle", "line", "fill"]);
      expect(result.layerIds).toEqual([
        "waymark-map-geojson-family-test-geojson-layer-2",
        "waymark-map-geojson-family-test-geojson-layer-1",
        "waymark-map-geojson-family-test-geojson-layer-0",
      ]);
    });

    test("renders all data layers with index 0 on top above raster basemaps", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        window.waymarkFixture.createContainer("map-geojson-stack-test");
        const instance = window.waymarkFixture.createInstance({
          config: {
            id: "map-geojson-stack-test",
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
          data: {
            layers: [
              { geoJSON: { type: "FeatureCollection", features: [] } },
              {
                geoJSON: {
                  type: "FeatureCollection",
                  features: [
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
              },
            ],
          },
        });

        return new Promise((resolve) => {
          const map = window.waymarkFixture.getRuntimeMap(instance.id);
          const expectedLayerIds = [
            "waymark-map-geojson-stack-test-basemap-raster-layer-1",
            "waymark-map-geojson-stack-test-basemap-raster-layer-0",
            "waymark-map-geojson-stack-test-geojson-layer-1",
            "waymark-map-geojson-stack-test-geojson-layer-0",
          ];
          const startedAt = Date.now();
          const check = () => {
            const styleLayers = map.getStyle()?.layers ?? [];
            const layerIds = styleLayers.map((layer) => layer.id);
            const hasExpectedLayers = expectedLayerIds.every((layerId) =>
              layerIds.includes(layerId),
            );

            if (!hasExpectedLayers && Date.now() - startedAt < 5000) {
              setTimeout(check, 50);
              return;
            }

            resolve({
              layerIds,
              serialisedLayers: instance.toJSON().data.layers,
            });
          };

          check();
        });
      });

      expect(result.layerIds).toEqual([
        "background",
        "waymark-map-geojson-stack-test-basemap-raster-layer-1",
        "waymark-map-geojson-stack-test-basemap-raster-layer-0",
        "waymark-map-geojson-stack-test-geojson-layer-1",
        "waymark-map-geojson-stack-test-geojson-layer-0",
      ]);
      expect(result.serialisedLayers).toEqual([
        { geoJSON: { type: "FeatureCollection", features: [] } },
        {
          geoJSON: {
            type: "FeatureCollection",
            features: [
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
        },
      ]);
    });
  });
});
