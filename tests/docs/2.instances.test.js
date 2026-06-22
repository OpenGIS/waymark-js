import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock maplibre-gl — WebGL is unavailable in JSDOM
vi.mock("maplibre-gl", () => {
    const MockMap = vi.fn(function (options) {
        this._options = options;
        this.on = vi.fn();
        this.remove = vi.fn();
        this.addSource = vi.fn();
        this.addLayer = vi.fn();
        this.loaded = vi.fn(() => false);
    });
    return { Map: MockMap };
});

// Suppress CSS import from instanceMap.js
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { createInstance } from "../../src/api/createInstance.js";
import { clearInstanceRegistry } from "../../src/instance/instanceRegistry.js";
import { Map } from "maplibre-gl";

describe("2. Instances", () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<div id="map" style="width: 500px; height: 400px;"></div>';
        vi.clearAllMocks();
        clearInstanceRegistry();
    });

    // ------------------------------------------------------------------ //
    // Quick Start
    // ------------------------------------------------------------------ //

    describe("Quick Start", () => {
        it("creates an instance result object", () => {
            const instance = createInstance("map");
            expect(instance).toEqual(
                expect.objectContaining({ id: "map", map: expect.any(Object) }),
            );
        });

        it("mounts into the specified container ID", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ container: "map" }),
            );
        });

        it("creates and mounts into a random container when id is omitted", () => {
            const instance = createInstance();

            expect(instance.id).toMatch(/^waymark-/);
            expect(document.getElementById(instance.id)).toBeTruthy();
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ container: instance.id }),
            );
        });
    });

    // ------------------------------------------------------------------ //
    // Factory defaults
    // ------------------------------------------------------------------ //

    describe("Factory defaults", () => {
        it("defaults to the OpenFreeMap Liberty style", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({
                    style: "https://tiles.openfreemap.org/styles/bright",
                }),
            );
        });

        it("defaults to center [0, 0]", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ center: [0, 0] }),
            );
        });

        it("defaults to zoom 2", () => {
            createInstance("map");
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ zoom: 2 }),
            );
        });
    });

    // ------------------------------------------------------------------ //
    // Factory options
    // ------------------------------------------------------------------ //

    describe("Factory options", () => {
        it("accepts a custom vector basemap via config.map.basemaps", () => {
            createInstance("map", {
                map: {
                    basemaps: [
                        {
                            name: "Custom",
                            type: "vector",
                            style: "https://custom.tiles.json",
                        },
                    ],
                },
            });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ style: "https://custom.tiles.json" }),
            );
        });

        it("accepts a custom center via config.map.options.center", () => {
            createInstance("map", {
                map: { options: { center: [-0.1276, 51.5074] } },
            });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ center: [-0.1276, 51.5074] }),
            );
        });

        it("accepts a custom zoom via config.map.options.zoom", () => {
            createInstance("map", { map: { options: { zoom: 10 } } });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ zoom: 10 }),
            );
        });

        it("passes arbitrary MapLibre options through config.map.options", () => {
            createInstance("map", { map: { options: { bearing: 15 } } });
            expect(Map).toHaveBeenCalledWith(
                expect.objectContaining({ bearing: 15 }),
            );
        });

        it("prefers map.options.style over basemap-derived style", () => {
            createInstance("map", {
                map: {
                    options: { style: "https://example.com/custom-style.json" },
                    basemaps: [
                        {
                            type: "vector",
                            style: "https://example.com/basemap-style.json",
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
    });

    // ------------------------------------------------------------------ //
    // Accessing the MapLibre instance
    // ------------------------------------------------------------------ //

    describe("Accessing the MapLibre instance", () => {
        it("returns the MapLibre map via the result map property", () => {
            const instance = createInstance("map");
            expect(instance.map).toBeDefined();
        });

        it("result.map is the map returned by createInstance", () => {
            const instance = createInstance("map");
            expect(Map).toHaveBeenCalledOnce();
            expect(instance.map).toHaveProperty("_options");
            expect(instance.map._options).toMatchObject({ container: "map" });
        });
    });

    // ------------------------------------------------------------------ //
    // Initial GeoJSON
    // ------------------------------------------------------------------ //

    describe("Initial GeoJSON", () => {
        const initialGeojson = {
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

        it("accepts GeoJSON as the third argument and renders it on load", () => {
            const instance = createInstance("map", undefined, initialGeojson);

            expect(instance.map.on).toHaveBeenCalledWith(
                "load",
                expect.any(Function),
            );

            const [, onLoad] = instance.map.on.mock.calls[0];
            onLoad();

            expect(instance.map.addSource).toHaveBeenCalledWith(
                "waymark-map-geojson-source",
                {
                    type: "geojson",
                    data: initialGeojson,
                },
            );

            expect(instance.map.addLayer).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: "waymark-map-geojson-layer",
                    source: "waymark-map-geojson-source",
                    type: "line",
                }),
            );
        });

        it("uses instance-scoped source and layer IDs to avoid collisions", () => {
            document.body.innerHTML +=
                '<div id="map-two" style="width: 500px; height: 400px;"></div>';

            const instanceOne = createInstance(
                "map",
                undefined,
                initialGeojson,
            );
            const instanceTwo = createInstance(
                "map-two",
                undefined,
                initialGeojson,
            );

            const [, onLoadOne] = instanceOne.map.on.mock.calls[0];
            const [, onLoadTwo] = instanceTwo.map.on.mock.calls[0];

            onLoadOne();
            onLoadTwo();

            expect(instanceOne.map.addSource).toHaveBeenCalledWith(
                "waymark-map-geojson-source",
                expect.any(Object),
            );
            expect(instanceTwo.map.addSource).toHaveBeenCalledWith(
                "waymark-map-two-geojson-source",
                expect.any(Object),
            );

            expect(instanceOne.map.addLayer).toHaveBeenCalledWith(
                expect.objectContaining({ id: "waymark-map-geojson-layer" }),
            );
            expect(instanceTwo.map.addLayer).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: "waymark-map-two-geojson-layer",
                }),
            );
        });
    });
});
