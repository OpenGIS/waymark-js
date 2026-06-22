import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock maplibre-gl — WebGL is unavailable in JSDOM
vi.mock("maplibre-gl", () => {
    const MockMap = vi.fn(function (options) {
        this._options = options;
        this.on = vi.fn();
        this.remove = vi.fn();
    });
    return { Map: MockMap };
});

// Suppress CSS import from instanceMap.js
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { createInstance } from "../../src/api/createInstance.js";
import defaultConfig from "../../src/config/defaultConfig.json";
import { clearInstanceRegistry } from "../../src/instance/instanceRegistry.js";
import { resolveConfig } from "../../src/instance/resolveConfig.js";
import { deepMerge } from "../../src/utils/deepMerge.js";
import { Map } from "maplibre-gl";

describe("3. Config", () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<div id="map" style="width: 500px; height: 400px;"></div>';
        vi.clearAllMocks();
        clearInstanceRegistry();
    });

    // ------------------------------------------------------------------ //
    // Defaults
    // ------------------------------------------------------------------ //

    describe("Default config source and merge behaviour", () => {
        it("uses JSON defaults as the config source", () => {
            expect(resolveConfig()).toEqual(defaultConfig);
        });

        it("deeply merges nested objects", () => {
            const merged = deepMerge(
                {
                    map: {
                        options: {
                            camera: {
                                padding: {
                                    top: 0,
                                    right: 0,
                                    bottom: 0,
                                    left: 0,
                                },
                                bearing: 0,
                            },
                        },
                    },
                },
                {
                    map: {
                        options: {
                            camera: {
                                padding: { top: 24 },
                            },
                        },
                    },
                },
            );

            expect(merged).toEqual({
                map: {
                    options: {
                        camera: {
                            padding: { top: 24, right: 0, bottom: 0, left: 0 },
                            bearing: 0,
                        },
                    },
                },
            });
        });

        it("replaces arrays rather than merging by index", () => {
            const merged = deepMerge(
                {
                    map: {
                        basemaps: [
                            {
                                type: "vector",
                                style: "https://tiles.openfreemap.org/styles/bright",
                            },
                        ],
                    },
                },
                {
                    map: {
                        basemaps: [
                            {
                                type: "raster",
                                tiles: [
                                    "https://tile.example.com/{z}/{x}/{y}.png",
                                ],
                            },
                        ],
                    },
                },
            );

            expect(merged.map.basemaps).toEqual([
                {
                    type: "raster",
                    tiles: ["https://tile.example.com/{z}/{x}/{y}.png"],
                },
            ]);
        });
    });

    describe("Defaults", () => {
        it("default center is [0, 0]", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ center: [0, 0] }),
            );
        });

        it("default zoom is 2", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ zoom: 2 }),
            );
        });

        it("default basemap is the OpenFreeMap Bright vector style URL", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({
                    style: "https://tiles.openfreemap.org/styles/bright",
                }),
            );
        });
    });

    // ------------------------------------------------------------------ //
    // config.map
    // ------------------------------------------------------------------ //

    describe("config.map", () => {
        it("forwards custom options.center to MapLibre", () => {
            createInstance("map", {
                map: { options: { center: [-0.1276, 51.5074] } },
            });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ center: [-0.1276, 51.5074] }),
            );
        });

        it("forwards custom options.zoom to MapLibre", () => {
            createInstance("map", { map: { options: { zoom: 10 } } });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ zoom: 10 }),
            );
        });

        it("does not use deprecated map.center/map.zoom keys", () => {
            createInstance("map", { map: { center: [10, 20], zoom: 11 } });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ center: [0, 0], zoom: 2 }),
            );
        });

        it("prefers map.options.style over basemap-derived style", () => {
            createInstance("map", {
                map: {
                    options: { style: "https://example.com/custom-style.json" },
                    basemaps: [
                        {
                            type: "raster",
                            tiles: ["https://tile.example.com/{z}/{x}/{y}.png"],
                        },
                    ],
                },
            });

            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({
                    style: "https://example.com/custom-style.json",
                }),
            );
        });

        it("keeps the Waymark container authoritative over map.options.container", () => {
            createInstance("map", {
                map: {
                    options: { container: "other-element-id" },
                },
            });

            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ container: "map" }),
            );
        });

        it("consumer basemaps array replaces defaults entirely", () => {
            createInstance("map", {
                map: {
                    basemaps: [
                        {
                            type: "raster",
                            tiles: ["https://tile.example.com/{z}/{x}/{y}.png"],
                        },
                    ],
                },
            });
            const [callArg] = Map.mock.calls[0];
            // Should be an inline style object, not the default vector URL
            expect(callArg.style).toBeTypeOf("object");
            expect(callArg.style).not.toBe(
                "https://tiles.openfreemap.org/styles/bright",
            );
        });
    });

    // ------------------------------------------------------------------ //
    // Basemaps — Vector
    // ------------------------------------------------------------------ //

    describe("Basemaps — Vector", () => {
        it("passes the style URL directly to MapLibre", () => {
            createInstance("map", {
                map: {
                    basemaps: [
                        {
                            name: "My Tiles",
                            type: "vector",
                            style: "https://my.tiles/style.json",
                        },
                    ],
                },
            });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({
                    style: "https://my.tiles/style.json",
                }),
            );
        });

        it("name property has no effect on the MapLibre style value", () => {
            createInstance("map", {
                map: {
                    basemaps: [
                        {
                            name: "Display Name",
                            type: "vector",
                            style: "https://my.tiles/style.json",
                        },
                    ],
                },
            });
            const [callArg] = Map.mock.calls[0];
            // Style must be the bare URL string, not an object containing name
            expect(callArg.style).toBe("https://my.tiles/style.json");
        });
    });

    // ------------------------------------------------------------------ //
    // Basemaps — Raster
    // ------------------------------------------------------------------ //

    describe("Basemaps — Raster", () => {
        const rasterBasemap = {
            type: "raster",
            tiles: ["https://tile.example.com/{z}/{x}/{y}.png"],
            tileSize: 512,
            attribution: "© Example",
        };

        function getRasterStyle(basemap = rasterBasemap) {
            createInstance("map", { map: { basemaps: [basemap] } });
            const [callArg] = Map.mock.calls[0];
            return callArg.style;
        }

        it("MapLibre is called with an object (not a string) as style", () => {
            const style = getRasterStyle();
            expect(style).toBeTypeOf("object");
        });

        it("constructed style object has version: 8", () => {
            const style = getRasterStyle();
            expect(style.version).toBe(8);
        });

        it("constructed style has a sources.basemap entry with type: raster", () => {
            const style = getRasterStyle();
            expect(style.sources.basemap).toBeDefined();
            expect(style.sources.basemap.type).toBe("raster");
        });

        it("constructed style sources.basemap.tiles matches the provided tiles array", () => {
            const style = getRasterStyle();
            expect(style.sources.basemap.tiles).toEqual([
                "https://tile.example.com/{z}/{x}/{y}.png",
            ]);
        });

        it("constructed style has a layers array with one basemap entry", () => {
            const style = getRasterStyle();
            expect(style.layers).toHaveLength(1);
            expect(style.layers[0]).toEqual({
                id: "basemap",
                type: "raster",
                source: "basemap",
            });
        });

        it("tileSize defaults to 256 when not specified", () => {
            const style = getRasterStyle({
                type: "raster",
                tiles: ["https://t.example/{z}/{x}/{y}.png"],
            });
            expect(style.sources.basemap.tileSize).toBe(256);
        });

        it("attribution defaults to empty string when not specified", () => {
            const style = getRasterStyle({
                type: "raster",
                tiles: ["https://t.example/{z}/{x}/{y}.png"],
            });
            expect(style.sources.basemap.attribution).toBe("");
        });

        it("preserves custom tileSize and attribution when specified", () => {
            const style = getRasterStyle(rasterBasemap);
            expect(style.sources.basemap.tileSize).toBe(512);
            expect(style.sources.basemap.attribution).toBe("© Example");
        });

        it("passes maxZoom to the raster source as maxzoom (lowercase)", () => {
            createInstance("map", {
                map: {
                    basemaps: [
                        {
                            type: "raster",
                            tiles: [
                                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                            ],
                            maxZoom: 19,
                        },
                    ],
                },
            });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({
                    style: expect.objectContaining({
                        sources: expect.objectContaining({
                            basemap: expect.objectContaining({ maxzoom: 19 }),
                        }),
                    }),
                }),
            );
        });
    });
});
