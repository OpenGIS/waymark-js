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
      page.locator("#map .waymark-instance-shell details"),
    ).toHaveCount(0);
    await expect(
      page.locator("#map-two .waymark-instance-shell details"),
    ).toHaveCount(1);
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
      page.locator("#map .waymark-instance-shell details"),
    ).toHaveCount(0);
    await expect(
      page.locator("#map-two .waymark-instance-shell details"),
    ).toHaveCount(1);

    const modes = await page.evaluate(() => ({
      map: window.waymarkInstance?.getSnapshot().ui.mode,
      mapTwo: window.waymarkInstanceTwo?.getSnapshot().ui.mode,
    }));

    expect(modes).toEqual({
      map: "view",
      mapTwo: "debug",
    });

    await mapModeSelect.selectOption("debug");
    await expect(mapModeSelect).toHaveValue("debug");
    await expect(
      page.locator("#map .waymark-instance-shell details"),
    ).toHaveCount(1);
    await expect(
      page.locator("#map-two .waymark-instance-shell details"),
    ).toHaveCount(1);

    const afterMapDebug = await page.evaluate(() => ({
      map: window.waymarkInstance?.getSnapshot().ui.mode,
      mapTwo: window.waymarkInstanceTwo?.getSnapshot().ui.mode,
    }));

    expect(afterMapDebug).toEqual({
      map: "debug",
      mapTwo: "debug",
    });

    await mapTwoModeSelect.selectOption("view");
    await expect(mapTwoModeSelect).toHaveValue("view");
    await expect(
      page.locator("#map .waymark-instance-shell details"),
    ).toHaveCount(1);
    await expect(
      page.locator("#map-two .waymark-instance-shell details"),
    ).toHaveCount(0);

    const afterMapTwoView = await page.evaluate(() => ({
      map: window.waymarkInstance?.getSnapshot().ui.mode,
      mapTwo: window.waymarkInstanceTwo?.getSnapshot().ui.mode,
    }));

    expect(afterMapTwoView).toEqual({
      map: "debug",
      mapTwo: "view",
    });

    await mapModeSelect.selectOption("view");
    await expect(mapModeSelect).toHaveValue("view");
    await expect(
      page.locator("#map .waymark-instance-shell details"),
    ).toHaveCount(0);
    await expect(
      page.locator("#map-two .waymark-instance-shell details"),
    ).toHaveCount(0);

    const afterMapView = await page.evaluate(() => ({
      map: window.waymarkInstance?.getSnapshot().ui.mode,
      mapTwo: window.waymarkInstanceTwo?.getSnapshot().ui.mode,
    }));

    expect(afterMapView).toEqual({
      map: "view",
      mapTwo: "view",
    });

    await mapTwoModeSelect.selectOption("debug");
    await expect(mapTwoModeSelect).toHaveValue("debug");
    await expect(
      page.locator("#map .waymark-instance-shell details"),
    ).toHaveCount(0);
    await expect(
      page.locator("#map-two .waymark-instance-shell details"),
    ).toHaveCount(1);

    const finalModes = await page.evaluate(() => ({
      map: window.waymarkInstance?.getSnapshot().ui.mode,
      mapTwo: window.waymarkInstanceTwo?.getSnapshot().ui.mode,
    }));

    expect(finalModes).toEqual({
      map: "view",
      mapTwo: "debug",
    });
  });

  test("dev globals remain available for manual debugging", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(() => ({
      hasFactory: typeof window.createWaymarkInstance === "function",
      hasInstanceOne: Boolean(window.waymarkInstance?.map),
      hasInstanceTwo: Boolean(window.waymarkInstanceTwo?.map),
    }));

    expect(result).toEqual({
      hasFactory: true,
      hasInstanceOne: true,
      hasInstanceTwo: true,
    });
  });
});
