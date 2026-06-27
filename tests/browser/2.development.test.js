import { expect, test } from "@playwright/test";

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
      map: window.waymarkInstance?.toJSON().config.map.basemaps,
      mapTwo: window.waymarkInstanceTwo?.toJSON().config.map.basemaps,
      mapKeys: Object.keys(
        window.waymarkInstance?.toJSON().config.map.basemaps,
      ),
    }));

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          map: window.waymarkInstance?.toJSON().data.layers.length,
          mapTwo: window.waymarkInstanceTwo?.toJSON().data.layers.length,
        }));
      })
      .toEqual({
        map: 1,
        mapTwo: 1,
      });

    expect(basemapConfig).toEqual({
      map: {
        raster: expect.any(Array),
        vector: expect.arrayContaining([
          expect.objectContaining({
            styleURL: "https://tiles.openfreemap.org/styles/bright",
          }),
        ]),
      },
      mapTwo: {
        raster: expect.any(Array),
      },
      mapKeys: ["raster", "vector"],
    });
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
        window.waymarkInstance?.toJSON().state.ui?.mode ??
        window.waymarkInstance?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstanceTwo?.toJSON().state.ui?.mode ??
        window.waymarkInstanceTwo?.toJSON().config.ui.mode,
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
        window.waymarkInstance?.toJSON().state.ui?.mode ??
        window.waymarkInstance?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstanceTwo?.toJSON().state.ui?.mode ??
        window.waymarkInstanceTwo?.toJSON().config.ui.mode,
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
        window.waymarkInstance?.toJSON().state.ui?.mode ??
        window.waymarkInstance?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstanceTwo?.toJSON().state.ui?.mode ??
        window.waymarkInstanceTwo?.toJSON().config.ui.mode,
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
        window.waymarkInstance?.toJSON().state.ui?.mode ??
        window.waymarkInstance?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstanceTwo?.toJSON().state.ui?.mode ??
        window.waymarkInstanceTwo?.toJSON().config.ui.mode,
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
        window.waymarkInstance?.toJSON().state.ui?.mode ??
        window.waymarkInstance?.toJSON().config.ui.mode,
      mapTwo:
        window.waymarkInstanceTwo?.toJSON().state.ui?.mode ??
        window.waymarkInstanceTwo?.toJSON().config.ui.mode,
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

    const result = await page.evaluate(() => ({
      hasFactory: typeof window.createWaymarkInstance === "function",
      hasInstanceOne: typeof window.waymarkInstance?.ui?.setMode === "function",
      hasInstanceTwo:
        typeof window.waymarkInstanceTwo?.ui?.setMode === "function",
    }));

    expect(result).toEqual({
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
    ).toHaveCount(2);
    await expect(
      page.locator('#map [data-waymark-basemaps-vector-item="true"]').first(),
    ).toContainText("OpenFreeMap Bright");
    await expect(
      page.locator('#map [data-waymark-vector-radio="vector-0"]'),
    ).toBeChecked();

    await page.locator('#map [data-waymark-vector-radio="vector-1"]').click();
    await expect(
      page.locator('#map [data-waymark-vector-radio="vector-1"]'),
    ).toBeChecked();

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            window.waymarkInstance?.toJSON().state.map?.basemaps?.vector?.[0]
              ?.title,
        ),
      )
      .toBe("OpenFreeMap Liberty");

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
            window.waymarkInstanceTwo?.toJSON().state.map?.basemaps?.raster?.[1]
              ?.opacity,
        ),
      )
      .toBe(0.8);

    await page
      .locator('#map-two [data-waymark-raster-item="raster-0"]')
      .dragTo(page.locator('#map-two [data-waymark-raster-item="raster-1"]'));

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.waymarkInstanceTwo
            ?.toJSON()
            .state.map?.basemaps?.raster?.map((basemap) => basemap.title),
        ),
      )
      .toEqual(["OpenTopoMap raster overlay", "OpenStreetMap raster"]);
  });
});
