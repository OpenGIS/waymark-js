import { test, expect } from "@playwright/test";

test.describe("3. Config", () => {
    // ------------------------------------------------------------------ //
    // config.map.options
    // ------------------------------------------------------------------ //

    test.describe("config.map.options", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/");
        });

        test("forwards options.center/options.zoom and arbitrary options to MapLibre", async ({
            page,
        }) => {
            const errors = [];
            page.on("console", (msg) => {
                if (msg.type() === "error") errors.push(msg.text());
            });

            const mapState = await page.evaluate(async () => {
                const div = document.createElement("div");
                div.id = "map-options-test";
                div.style.width = "500px";
                div.style.height = "400px";
                document.body.appendChild(div);

                const instance = window.createWaymarkInstance(
                    "map-options-test",
                    {
                        map: {
                            options: {
                                center: [-0.1276, 51.5074],
                                zoom: 10,
                                bearing: 25,
                                style: {
                                    version: 8,
                                    sources: {},
                                    layers: [],
                                },
                            },
                        },
                    },
                );

                await new Promise((resolve) => {
                    if (instance.map.loaded()) {
                        resolve();
                        return;
                    }

                    instance.map.on("load", resolve);
                });

                const center = instance.map.getCenter();

                return {
                    center: [
                        Number(center.lng.toFixed(4)),
                        Number(center.lat.toFixed(4)),
                    ],
                    zoom: Number(instance.map.getZoom().toFixed(2)),
                    bearing: Number(instance.map.getBearing().toFixed(2)),
                };
            });

            await expect(page.locator("#map-options-test canvas")).toBeVisible({
                timeout: 5000,
            });
            expect(mapState).toEqual({
                center: [-0.1276, 51.5074],
                zoom: 10,
                bearing: 25,
            });
            expect(errors).toHaveLength(0);
        });

        test("map.options.style overrides basemap-derived style", async ({
            page,
        }) => {
            const errors = [];
            page.on("console", (msg) => {
                if (msg.type() === "error") errors.push(msg.text());
            });

            const styleResult = await page.evaluate(async () => {
                const div = document.createElement("div");
                div.id = "map-style-precedence-test";
                div.style.width = "500px";
                div.style.height = "400px";
                document.body.appendChild(div);

                const instance = window.createWaymarkInstance(
                    "map-style-precedence-test",
                    {
                        map: {
                            options: {
                                style: {
                                    version: 8,
                                    metadata: { source: "map.options.style" },
                                    sources: {},
                                    layers: [],
                                },
                            },
                            basemaps: [
                                {
                                    type: "raster",
                                    tiles: [
                                        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                                    ],
                                },
                            ],
                        },
                    },
                );

                await new Promise((resolve) => {
                    if (instance.map.loaded()) {
                        resolve();
                        return;
                    }

                    instance.map.on("load", resolve);
                });

                const style = instance.map.getStyle();

                return {
                    metadataSource: style.metadata?.source,
                    hasBasemapSource: Object.prototype.hasOwnProperty.call(
                        style.sources,
                        "basemap",
                    ),
                };
            });

            await expect(
                page.locator("#map-style-precedence-test canvas"),
            ).toBeVisible({ timeout: 5000 });
            expect(styleResult).toEqual({
                metadataSource: "map.options.style",
                hasBasemapSource: false,
            });
            expect(errors).toHaveLength(0);
        });
    });

    // ------------------------------------------------------------------ //
    // Basemaps — Vector
    // ------------------------------------------------------------------ //

    test.describe("Basemaps — Vector", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/");
        });

        test("vector basemap renders a canvas", async ({ page }) => {
            await expect(page.locator("#map canvas")).toBeVisible({
                timeout: 5000,
            });
        });

        test("no JS errors on vector basemap load", async ({ page }) => {
            const errors = [];
            page.on("console", (msg) => {
                if (msg.type() === "error") errors.push(msg.text());
            });
            await expect(page.locator("#map canvas")).toBeVisible({
                timeout: 5000,
            });
            expect(errors).toHaveLength(0);
        });
    });

    // ------------------------------------------------------------------ //
    // Basemaps — Raster
    // ------------------------------------------------------------------ //

    test.describe("Basemaps — Raster", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/");
        });

        test("raster basemap renders a canvas", async ({ page }) => {
            await page.evaluate(() => {
                const div = document.createElement("div");
                div.id = "map-raster-test";
                div.style.width = "500px";
                div.style.height = "400px";
                document.body.appendChild(div);
                window.createWaymarkInstance("map-raster-test", {
                    map: {
                        basemaps: [
                            {
                                name: "OpenStreetMap",
                                type: "raster",
                                tiles: [
                                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                                ],
                                attribution: "© OpenStreetMap contributors",
                                maxZoom: 19,
                            },
                        ],
                    },
                });
                return true;
            });
            await expect(page.locator("#map-raster-test canvas")).toBeVisible({
                timeout: 5000,
            });
        });

        test("no JS errors on raster basemap load", async ({ page }) => {
            const errors = [];
            page.on("console", (msg) => {
                if (msg.type() === "error") errors.push(msg.text());
            });
            await page.evaluate(() => {
                const div = document.createElement("div");
                div.id = "map-raster-test";
                div.style.width = "500px";
                div.style.height = "400px";
                document.body.appendChild(div);
                window.createWaymarkInstance("map-raster-test", {
                    map: {
                        basemaps: [
                            {
                                name: "OpenStreetMap",
                                type: "raster",
                                tiles: [
                                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                                ],
                                attribution: "© OpenStreetMap contributors",
                                maxZoom: 19,
                            },
                        ],
                    },
                });
                return true;
            });
            await expect(page.locator("#map-raster-test canvas")).toBeVisible({
                timeout: 5000,
            });
            expect(errors).toHaveLength(0);
        });
    });
});
