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

        test("MapLibre creates a canvas inside the container", async ({
            page,
        }) => {
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

                const geojson = {
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
                    geojson,
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
                        instance.map.getSource(
                            "waymark-map-geojson-test-geojson-source",
                        ),
                    ),
                    hasLayer: Boolean(
                        instance.map.getLayer(
                            "waymark-map-geojson-test-geojson-layer",
                        ),
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
