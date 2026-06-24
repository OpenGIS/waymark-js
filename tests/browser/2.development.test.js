import { expect, test } from "@playwright/test";

test.describe("2. Development smoke", () => {
  test("dev page creates both demo instances and canvases", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("#map")).toBeVisible();
    await expect(page.locator("#map-two")).toBeVisible();
    await expect(page.locator("#map canvas")).toBeVisible();
    await expect(page.locator("#map-two canvas")).toBeVisible();
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
