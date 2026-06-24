import { test, expect } from "@playwright/test";

test.describe("2. Instances", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // ------------------------------------------------------------------ //
  // Quick Start
  // ------------------------------------------------------------------ //

  test.describe("Quick Start", () => {
    test("renders the map container", async ({ page }) => {
      await expect(page.locator("#map")).toBeVisible();
    });

    test("MapLibre creates a canvas inside the container", async ({ page }) => {
      // MapLibre GL renders its map into a <canvas> synchronously on construction
      await expect(page.locator("#map canvas")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  // ------------------------------------------------------------------ //
  // Accessing the MapLibre instance
  // ------------------------------------------------------------------ //

  test.describe("Accessing the MapLibre instance", () => {
    test("map instance is attached to window.waymarkInstance", async ({
      page,
    }) => {
      const hasMap = await page.evaluate(
        () => window.waymarkInstance?.map != null,
      );
      expect(hasMap).toBe(true);
    });

    test("factory API is attached to window.createWaymarkInstance", async ({
      page,
    }) => {
      const hasFactory = await page.evaluate(
        () => typeof window.createWaymarkInstance === "function",
      );
      expect(hasFactory).toBe(true);
    });

    test("instance exposes lifecycle and serialisation methods", async ({
      page,
    }) => {
      const shape = await page.evaluate(() => ({
        hasDestroy: typeof window.waymarkInstance?.destroy === "function",
        hasGetSnapshot:
          typeof window.waymarkInstance?.getSnapshot === "function",
        hasOn: typeof window.waymarkInstance?.on === "function",
        hasOff: typeof window.waymarkInstance?.off === "function",
        hasOnce: typeof window.waymarkInstance?.once === "function",
      }));

      expect(shape).toEqual({
        hasDestroy: true,
        hasGetSnapshot: true,
        hasOn: true,
        hasOff: true,
        hasOnce: true,
      });
    });
  });

  test.describe("Instance events", () => {
    test("dev entry logs forwarded container events for both dev instances", async ({
      page,
    }) => {
      const logs = [];

      page.on("console", (msg) => {
        if (msg.type() === "info") {
          logs.push(msg.text());
        }
      });

      await page.evaluate(() => {
        window.waymarkInstance.map.fire("moveend", {
          source: "playwright-test",
        });
        window.waymarkInstanceTwo.map.fire("moveend", {
          source: "playwright-test",
        });
      });

      await expect
        .poll(() =>
          logs.filter(
            (line) =>
              line.includes("[waymark:dev:event]") &&
              line.includes("waymark:map.moveend"),
          ),
        )
        .toHaveLength(2);

      expect(
        logs.some(
          (line) =>
            line.includes("[waymark:dev:event]") &&
            line.includes("map") &&
            line.includes("waymark:map.moveend"),
        ),
      ).toBe(true);

      expect(
        logs.some(
          (line) =>
            line.includes("[waymark:dev:event]") &&
            line.includes("map-two") &&
            line.includes("waymark:map.moveend"),
        ),
      ).toBe(true);
    });

    test("on/off/once listen to container CustomEvents", async ({ page }) => {
      const result = await page.evaluate(() => {
        const mapEvents = document.createElement("div");
        mapEvents.id = "map-events-api";
        mapEvents.style.width = "500px";
        mapEvents.style.height = "400px";
        document.body.appendChild(mapEvents);

        const instance = window.createWaymarkInstance("map-events-api");
        const calls = [];

        const onHandler = () => calls.push("on");
        const onceHandler = () => calls.push("once");

        instance.on("waymark:test", onHandler);
        instance.once("waymark:test", onceHandler);

        mapEvents.dispatchEvent(new CustomEvent("waymark:test"));
        mapEvents.dispatchEvent(new CustomEvent("waymark:test"));

        instance.off("waymark:test", onHandler);
        mapEvents.dispatchEvent(new CustomEvent("waymark:test"));

        return calls;
      });

      expect(result).toEqual(["on", "once", "on"]);
    });

    test("emits created, reused, and destroyed lifecycle events", async ({
      page,
    }) => {
      const events = await page.evaluate(() => {
        const mapEvents = document.createElement("div");
        mapEvents.id = "map-events-lifecycle";
        mapEvents.style.width = "500px";
        mapEvents.style.height = "400px";
        document.body.appendChild(mapEvents);

        const seen = [];
        const track = (event) => {
          seen.push({
            type: event.type,
            detail: event.detail,
          });
        };

        mapEvents.addEventListener("waymark:instance.created", track);
        mapEvents.addEventListener("waymark:instance.reused", track);
        mapEvents.addEventListener("waymark:instance.destroyed", track);

        const first = window.createWaymarkInstance("map-events-lifecycle");
        const second = window.createWaymarkInstance("map-events-lifecycle");

        first.destroy();
        first.destroy();

        return {
          sameInstance: first === second,
          seen,
        };
      });

      expect(events.sameInstance).toBe(true);
      expect(events.seen).toEqual([
        {
          type: "waymark:instance.created",
          detail: { id: "map-events-lifecycle" },
        },
        {
          type: "waymark:instance.reused",
          detail: { id: "map-events-lifecycle" },
        },
        {
          type: "waymark:instance.destroyed",
          detail: { id: "map-events-lifecycle" },
        },
      ]);
    });

    test("forwards selected MapLibre events as waymark:map.* container events", async ({
      page,
    }) => {
      const forwarded = await page.evaluate(() => {
        const mapEvents = document.createElement("div");
        mapEvents.id = "map-events-forwarded";
        mapEvents.style.width = "500px";
        mapEvents.style.height = "400px";
        document.body.appendChild(mapEvents);

        const instance = window.createWaymarkInstance("map-events-forwarded");
        const pairs = [
          ["load", "waymark:map.load"],
          ["moveend", "waymark:map.moveend"],
          ["zoomend", "waymark:map.zoomend"],
          ["rotateend", "waymark:map.rotateend"],
          ["pitchend", "waymark:map.pitchend"],
        ];

        const seen = [];
        for (const [, waymarkEvent] of pairs) {
          mapEvents.addEventListener(waymarkEvent, (event) => {
            seen.push({
              type: event.type,
              detail: {
                id: event.detail.id,
                mapEvent: event.detail.mapEvent,
              },
            });
          });
        }

        for (const [mapEvent] of pairs) {
          instance.map.fire(mapEvent, { source: "playwright-test" });
        }

        return seen;
      });

      expect(forwarded).toEqual([
        {
          type: "waymark:map.load",
          detail: { id: "map-events-forwarded", mapEvent: "load" },
        },
        {
          type: "waymark:map.moveend",
          detail: { id: "map-events-forwarded", mapEvent: "moveend" },
        },
        {
          type: "waymark:map.zoomend",
          detail: { id: "map-events-forwarded", mapEvent: "zoomend" },
        },
        {
          type: "waymark:map.rotateend",
          detail: { id: "map-events-forwarded", mapEvent: "rotateend" },
        },
        {
          type: "waymark:map.pitchend",
          detail: { id: "map-events-forwarded", mapEvent: "pitchend" },
        },
      ]);
    });
  });

  test.describe("Lifecycle and snapshots", () => {
    test("dev page shows the app shell overlay with snapshot content", async ({
      page,
    }) => {
      const shell = page.locator(
        '#map [data-waymark-app="true"] .waymark-instance-shell',
      );
      const snapshotPre = shell.locator("pre");

      await expect(shell).toBeVisible();
      await expect(shell.locator("summary")).toHaveText("Instance snapshot");
      await expect(snapshotPre).toContainText('"version": 1');
      await expect(snapshotPre).toContainText('"map": {');
      await expect(snapshotPre).toContainText('"ui": {');
      await expect(snapshotPre).toContainText('"data": {');
    });

    test("shell snapshot refreshes from forwarded waymark:map.* container events", async ({
      page,
    }) => {
      const snapshotPre = page.locator('#map [data-waymark-app="true"] pre');

      await expect(snapshotPre).toContainText('"zoom": 15');

      await page.evaluate(() => {
        window.waymarkInstance.map.jumpTo({
          center: [-128.0194, 50.6639],
          zoom: 16,
          bearing: 20,
          pitch: 25,
        });

        document.getElementById("map")?.dispatchEvent(
          new CustomEvent("waymark:map.zoomend", {
            detail: {
              id: "map",
              mapEvent: "zoomend",
            },
          }),
        );
      });

      await expect(snapshotPre).toContainText('"zoom": 16');
      await expect(snapshotPre).toContainText('"bearing": 20');
    });

    test("getSnapshot returns a serialisable shape with map, ui, and data", async ({
      page,
    }) => {
      const snapshot = await page.evaluate(async () => {
        const instance = window.createWaymarkInstance("map");

        await new Promise((resolve) => {
          if (instance.map.loaded()) {
            resolve();
            return;
          }

          instance.map.on("load", resolve);
        });

        return instance.getSnapshot();
      });

      expect(snapshot).toEqual(
        expect.objectContaining({
          version: 1,
          map: expect.objectContaining({
            center: expect.any(Array),
            zoom: expect.any(Number),
            bearing: expect.any(Number),
            pitch: expect.any(Number),
          }),
          ui: expect.objectContaining({
            hasAppShell: expect.any(Boolean),
          }),
          data: expect.objectContaining({
            geojson: expect.objectContaining({
              sourceId: expect.any(String),
              layerId: expect.any(String),
            }),
          }),
        }),
      );
    });

    test("destroy removes an instance so the same ID can be recreated", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const first = window.createWaymarkInstance("map");
        first.destroy();

        const second = window.createWaymarkInstance("map");

        return {
          sameObject: first === second,
          hasMap: Boolean(second?.map),
        };
      });

      expect(result).toEqual({ sameObject: false, hasMap: true });
      await expect(page.locator("#map canvas")).toBeVisible({ timeout: 5000 });
    });
  });

  // ------------------------------------------------------------------ //
  // Initial GeoJSON
  // ------------------------------------------------------------------ //

  test.describe("Initial GeoJSON", () => {
    test("renders initial GeoJSON from the third argument with no console errors", async ({
      page,
    }) => {
      const errors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const renderResult = await page.evaluate(async () => {
        const div = document.createElement("div");
        div.id = "map-geojson-test";
        div.style.width = "500px";
        div.style.height = "400px";
        document.body.appendChild(div);

        const geoJSON = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [-0.13, 51.5],
                  [-0.12, 51.51],
                ],
              },
              properties: {},
            },
          ],
        };

        const instance = window.createWaymarkInstance(
          "map-geojson-test",
          undefined,
          geoJSON,
        );

        await new Promise((resolve) => {
          if (instance.map.loaded()) {
            resolve();
            return;
          }

          instance.map.on("load", resolve);
        });

        return {
          hasSource: Boolean(
            instance.map.getSource("waymark-map-geojson-test-geojson-source"),
          ),
          hasLayer: Boolean(
            instance.map.getLayer("waymark-map-geojson-test-geojson-layer"),
          ),
        };
      });

      await expect(page.locator("#map-geojson-test canvas")).toBeVisible({
        timeout: 5000,
      });
      expect(renderResult).toEqual({ hasSource: true, hasLayer: true });
      expect(errors).toHaveLength(0);
    });
  });
});
