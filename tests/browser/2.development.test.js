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
    await expect(
      page.locator('#map [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);

    const basemapConfig = await page.evaluate(() => ({
      map: window.waymarkInstance?.toJSON().config.map.basemaps,
      mapTwo: window.waymarkInstanceTwo?.toJSON().config.map.basemaps,
    }));

    expect(basemapConfig).toEqual({
      map: {
        vector: expect.arrayContaining([
          expect.objectContaining({
            styleURL: "https://tiles.openfreemap.org/styles/bright",
          }),
        ]),
        raster: expect.any(Array),
      },
      mapTwo: {
        raster: expect.any(Array),
      },
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
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);

    const modes = await page.evaluate(() => ({
      map: window.waymarkInstance?.toJSON().state.ui.mode,
      mapTwo: window.waymarkInstanceTwo?.toJSON().state.ui.mode,
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
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);

    const afterMapDebug = await page.evaluate(() => ({
      map: window.waymarkInstance?.toJSON().state.ui.mode,
      mapTwo: window.waymarkInstanceTwo?.toJSON().state.ui.mode,
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

    const afterMapTwoView = await page.evaluate(() => ({
      map: window.waymarkInstance?.toJSON().state.ui.mode,
      mapTwo: window.waymarkInstanceTwo?.toJSON().state.ui.mode,
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
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(0);

    const afterMapView = await page.evaluate(() => ({
      map: window.waymarkInstance?.toJSON().state.ui.mode,
      mapTwo: window.waymarkInstanceTwo?.toJSON().state.ui.mode,
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
      page.locator('#map-two [data-waymark-debug-panel="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#map-two [data-waymark-control="debug-output-toggle"]'),
    ).toHaveCount(1);

    const finalModes = await page.evaluate(() => ({
      map: window.waymarkInstance?.toJSON().state.ui.mode,
      mapTwo: window.waymarkInstanceTwo?.toJSON().state.ui.mode,
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

    await debugOutputToggle.click();
    await expect(debugPanel).toHaveCount(0);

    await debugOutputToggle.click();
    await expect(debugPanel).toHaveCount(1);
  });
});
