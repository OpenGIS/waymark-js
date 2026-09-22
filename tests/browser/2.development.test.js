import { expect, test } from "@playwright/test";
import { screenshot } from "./helpers/screenshot.js";

test.describe("2. Development smoke", () => {
  test("dev page creates both demo instances and canvases", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("#dev-instance-mode")).toBeVisible();
    await expect(page.locator("#dev-instance-mode-two")).toBeVisible();
    await expect(page.locator("#map")).toBeVisible();
    await expect(page.locator("#map-two")).toBeVisible();
    await expect(page.locator("#map canvas")).toBeVisible();
    await expect(page.locator("#map-two canvas")).toBeVisible();

    await expect(
      page.locator('#map [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(page.locator('#map [data-waymark-modal="true"]')).toHaveCount(
      0,
    );
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-modal="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator(
        '#map [data-waymark-controls-position="bottomLeft"] [data-waymark-control="basemaps-toggle"]',
      ),
    ).toHaveCount(1);
    await expect(
      page.locator(
        '#map-two [data-waymark-controls-position="bottomLeft"] [data-waymark-control="basemaps-toggle"]',
      ),
    ).toHaveCount(1);

    const basemapConfig = await page.evaluate(() => ({
      map: window.waymarkInstances?.map?.toJSON().config.map.basemaps,
      mapTwo:
        window.waymarkInstances?.["map-two"]?.toJSON().config.map.basemaps,
      mapKeys: Object.keys(
        window.waymarkInstances?.map?.toJSON().config.map.basemaps,
      ),
    }));

    await expect
      .poll(
        async () => {
          return page.evaluate(() => ({
            map: window.waymarkInstances?.map?.toJSON().data.layers.length,
            mapTwo:
              window.waymarkInstances?.["map-two"]?.toJSON().data.layers.length,
          }));
        },
        { timeout: 15_000 },
      )
      .toEqual({
        map: 3,
        mapTwo: 1,
      });

    expect(basemapConfig).toEqual({
      map: {
        vector: expect.arrayContaining([
          expect.objectContaining({
            styleURL:
              "https://raw.githubusercontent.com/OpenGIS/outdoors/refs/heads/master/style.json",
          }),
        ]),
      },
      mapTwo: {
        raster: expect.any(Array),
      },
      mapKeys: ["vector"],
    });

    await screenshot(page, "dev-two-instances");
  });

  test("dev page dropdowns change instance modes independently", async ({
    page,
  }) => {
    await page.goto("/");

    const mapModeSelect = page.locator("#dev-instance-mode");
    const mapTwoModeSelect = page.locator("#dev-instance-mode-two");

    await expect(mapModeSelect).toHaveValue("view");
    await expect(mapTwoModeSelect).toHaveValue("debug");

    await expect(
      page.locator('#map [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);

    const modes = await page.evaluate(() => ({
      map:
        window.waymarkInstances?.map?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.map?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstances?.["map-two"]?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.["map-two"]?.toJSON().config.ui.mode,
    }));

    expect(modes).toEqual({
      map: "view",
      mapTwo: "debug",
    });

    await mapModeSelect.selectOption("debug");
    await expect(mapModeSelect).toHaveValue("debug");
    await expect(
      page.locator('#map [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);

    const afterMapDebug = await page.evaluate(() => ({
      map:
        window.waymarkInstances?.map?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.map?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstances?.["map-two"]?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.["map-two"]?.toJSON().config.ui.mode,
    }));

    expect(afterMapDebug).toEqual({
      map: "debug",
      mapTwo: "debug",
    });

    await mapTwoModeSelect.selectOption("view");
    await expect(mapTwoModeSelect).toHaveValue("view");
    await expect(
      page.locator('#map [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);

    const afterMapTwoView = await page.evaluate(() => ({
      map:
        window.waymarkInstances?.map?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.map?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstances?.["map-two"]?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.["map-two"]?.toJSON().config.ui.mode,
    }));

    expect(afterMapTwoView).toEqual({
      map: "debug",
      mapTwo: "view",
    });

    await mapModeSelect.selectOption("view");
    await expect(mapModeSelect).toHaveValue("view");
    await expect(
      page.locator('#map [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);

    const afterMapView = await page.evaluate(() => ({
      map:
        window.waymarkInstances?.map?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.map?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstances?.["map-two"]?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.["map-two"]?.toJSON().config.ui.mode,
    }));

    expect(afterMapView).toEqual({
      map: "view",
      mapTwo: "view",
    });

    await mapTwoModeSelect.selectOption("debug");
    await expect(mapTwoModeSelect).toHaveValue("debug");
    await expect(
      page.locator('#map [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="basemaps-toggle"]'),
    ).toHaveCount(1);

    const finalModes = await page.evaluate(() => ({
      map:
        window.waymarkInstances?.map?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.map?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstances?.["map-two"]?.toJSON().state.ui?.mode ??
        window.waymarkInstances?.["map-two"]?.toJSON().config.ui.mode,
    }));

    expect(finalModes).toEqual({
      map: "view",
      mapTwo: "debug",
    });

    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
  });

  test("dev globals remain available for manual debugging", async ({
    page,
  }) => {
    await page.goto("/");

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          hasFactory: typeof window.createWaymarkInstance === "function",
          hasInstanceOne:
            typeof window.waymarkInstances?.map?.ui?.setMode === "function",
          hasInstanceTwo:
            typeof window.waymarkInstances?.["map-two"]?.ui?.setMode ===
            "function",
        })),
      )
      .toEqual({
        hasFactory: true,
        hasInstanceOne: true,
        hasInstanceTwo: true,
      });
  });

  test("debug output toggle remains clickable above debug panel content", async ({
    page,
  }) => {
    await page.goto("/");

    const debugOutputToggle = page.locator(
      '#map-two [data-waymark-control="debug-output-toggle"]',
    );
    const debugPanel = page.locator(
      '#map-two [data-waymark-debug-panel="true"]',
    );

    await expect(debugOutputToggle).toBeVisible();
    await expect(debugPanel).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-modal="true"]'),
    ).toHaveCount(1);

    await debugOutputToggle.click();
    await expect(debugPanel).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-modal="true"]'),
    ).toHaveCount(0);

    await debugOutputToggle.click();
    await expect(debugPanel).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-modal="true"]'),
    ).toHaveCount(1);

    await screenshot(page, "dev-debug-panel");
  });

  test("shared modal routes between debug and basemaps content", async ({
    page,
  }) => {
    await page.goto("/");

    const debugOutputToggle = page.locator(
      '#map-two [data-waymark-control="debug-output-toggle"]',
    );
    const basemapsToggle = page.locator(
      '#map-two [data-waymark-control="basemaps-toggle"]',
    );

    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-panel="basemaps"]'),
    ).toHaveCount(0);

    await basemapsToggle.click();
    await expect(
      page.locator('#map-two [data-waymark-modal="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-panel="basemaps"]'),
    ).toHaveCount(1);

    await debugOutputToggle.click();
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-panel="basemaps"]'),
    ).toHaveCount(0);
  });

  test("basemaps panel renders vectors and applies raster opacity/reorder live", async ({
    page,
  }) => {
    await page.goto("/");

    await page.locator('#map [data-waymark-control="basemaps-toggle"]').click();

    await expect(
      page.locator('#map [data-waymark-panel="basemaps"] h3'),
    ).toHaveText(["Raster", "Vector"]);

    await expect(
      page.locator('#map [data-waymark-basemaps-vector-item="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map [data-waymark-basemaps-vector-item="true"]').first(),
    ).toContainText("Open GIS Outdoors");
    await expect(
      page.locator('#map [data-waymark-vector-radio="vector-0"]'),
    ).toBeChecked();

    await page
      .locator('#map-two [data-waymark-control="basemaps-toggle"]')
      .click();

    await page
      .locator('#map-two [data-waymark-raster-opacity-input="raster-1"]')
      .evaluate((input) => {
        input.value = "0.8";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            window.waymarkInstances?.["map-two"]?.toJSON().state.map?.basemaps
              ?.raster?.[1]?.opacity,
        ),
      )
      .toBe(0.8);

    await page
      .locator('#map-two [data-waymark-raster-item="raster-0"]')
      .dragTo(page.locator('#map-two [data-waymark-raster-item="raster-1"]'));

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.waymarkInstances?.["map-two"]
            ?.toJSON()
            .state.map?.basemaps?.raster?.map((basemap) => basemap.title),
        ),
      )
      .toEqual(["OpenTopoMap raster overlay", "OpenStreetMap raster"]);

    await screenshot(page, "dev-basemaps-panel");
  });

  test("dev GeoJSON upload adds a new data layer and fits bounds", async ({
    page,
  }) => {
    await page.goto("/");

    const uploadInput = page.locator("#map-geojson-upload");
    await expect(uploadInput).toBeHidden();
    await expect(
      page.locator('button:has-text("Upload GeoJSON")').first(),
    ).toBeVisible();

    const geoJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [10.75, 59.95],
          },
        },
      ],
    };

    await uploadInput.setInputFiles({
      name: "oslo.geojson",
      mimeType: "application/geo+json",
      buffer: Buffer.from(JSON.stringify(geoJSON)),
    });

    await expect
      .poll(async () =>
        page.evaluate(
          () => window.waymarkInstances?.map?.toJSON().data.layers.length,
        ),
      )
      .toBe(4);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const options =
              window.waymarkInstances?.map?.toJSON().state.map?.options;

            return options ?? null;
          }),
        { timeout: 30000 },
      )
      .toEqual(
        expect.objectContaining({
          center: [expect.closeTo(10.75, 5), expect.closeTo(59.95, 5)],
        }),
      );

    await screenshot(page, "dev-geojson-uploaded");
  });

  test("debug checkboxes toggle console logging with [waymark:debug] prefix", async ({
    page,
  }) => {
    await page.goto("/");

    // Checkboxes exist for both instances
    await expect(page.locator("#map-debug")).toBeVisible();
    await expect(page.locator("#map-two-debug")).toBeVisible();

    // #map starts with debug enabled (config.debug: true), #map-two starts without
    await expect(page.locator("#map-debug")).toBeChecked();
    await expect(page.locator("#map-two-debug")).not.toBeChecked();

    // Collect console messages
    const debugMessages = [];

    page.on("console", (msg) => {
      if (msg.text().includes("[waymark:debug]")) {
        debugMessages.push(msg.text());
      }
    });

    // Enable debug on #map
    await page.locator("#map-debug").check();
    await expect(page.locator("#map-debug")).toBeChecked();

    // Trigger an event by clicking the basemaps toggle
    await page.locator('#map [data-waymark-control="basemaps-toggle"]').click();

    // Wait for console messages to propagate
    await expect.poll(() => debugMessages.length).toBeGreaterThanOrEqual(1);

    // All messages should reference the correct instance ID
    for (const msg of debugMessages) {
      expect(msg).toMatch(/^\[waymark:debug\] map /);
    }

    // Enable debug on #map-two and verify it also logs
    await page.locator("#map-two-debug").check();
    await expect(page.locator("#map-two-debug")).toBeChecked();

    const mapTwoCountBefore = debugMessages.filter((m) =>
      m.includes("map-two"),
    ).length;

    // Click basemaps toggle on #map-two to trigger events
    await page
      .locator('#map-two [data-waymark-control="basemaps-toggle"]')
      .click();

    await expect
      .poll(() => debugMessages.filter((m) => m.includes("map-two")).length)
      .toBeGreaterThan(mapTwoCountBefore);
  });
});
