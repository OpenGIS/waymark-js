import { expect, test } from "./helpers/test.js";
import { screenshot } from "./helpers/screenshot.js";
import {
  addDevLayer,
  HOLBERG_CLOSEUP,
  mountFamilies,
  mountMixed,
  mountQuickStart,
  openAPIPage,
  openDevPage,
  openLinePopup,
  openMarkerPopup,
} from "./helpers/scenes.js";

test.describe("API screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openAPIPage(page);
  });

  test("api-quick-start", async ({ page }) => {
    const mounted = await mountQuickStart(page);

    expect(mounted.rendered).toBeGreaterThanOrEqual(1);
    await expect(page.locator("#map canvas")).toBeVisible();
    await screenshot(page, "api-quick-start", "#map");
  });

  test("api-geojson-families", async ({ page }) => {
    const evidence = await mountFamilies(page);

    expect(evidence.polygonWidth).toBeGreaterThanOrEqual(40);
    expect(evidence.polygonHeight).toBeGreaterThanOrEqual(40);
    expect(evidence.renderedFill).toBeGreaterThanOrEqual(1);
    expect(evidence.zoom).toBeCloseTo(HOLBERG_CLOSEUP.zoom, 1);

    await expect(page.locator("#map canvas")).toBeVisible();
    await screenshot(page, "api-geojson-families", "#map");
  });

  test("api-geojson-mixed", async ({ page }) => {
    const result = await mountMixed(page);

    expect(result.authoredCount).toBe(3);
    expect(result.rendered.circle).toBeGreaterThanOrEqual(1);
    expect(result.rendered.line).toBeGreaterThanOrEqual(1);
    expect(result.rendered.fill).toBeGreaterThanOrEqual(1);

    await expect(page.locator("#map canvas")).toBeVisible();
    await screenshot(page, "api-geojson-mixed", "#map");
  });
});

test.describe("Development screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openDevPage(page);
  });

  test("dev-page", async ({ page }) => {
    await expect(page.locator("#map canvas")).toBeVisible();
    await screenshot(page, "dev-page");
  });

  test("dev-layer-added", async ({ page }) => {
    await addDevLayer(page);
    await screenshot(page, "dev-layer-added");
  });

  test("dev-popup", async ({ page }) => {
    const { popup } = await openMarkerPopup(page);

    await expect(popup).toContainText("The Scarlet Ibis");
    await screenshot(page, "dev-popup");
  });

  test("dev-popup-line", async ({ page }) => {
    const { popup } = await openLinePopup(page);

    await expect(popup).toContainText("Port Hardy to Cape Scott");
    await screenshot(page, "dev-popup-line");
  });
});
