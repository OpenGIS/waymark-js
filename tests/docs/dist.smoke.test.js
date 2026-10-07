import { describe, expect, it, vi } from "vitest";

const boundsSpy = vi.hoisted(() => ({ construct: 0 }));

vi.mock("maplibre-gl", () => {
  class MockLngLatBounds {
    constructor() {
      boundsSpy.construct += 1;
    }

    extend() {
      return this;
    }
  }

  class MockMap {}

  return { LngLatBounds: MockLngLatBounds, Map: MockMap };
});

// Resolved at transform time. When dist is missing the glob is empty, so the
// spec skips cleanly. test:ci builds before running Vitest, so the smoke runs
// for real in the gate.
const distModules = import.meta.glob("../../dist/waymark.js");
const loadDist = Object.values(distModules)[0];
const hasDist = typeof loadDist === "function";

const LINE_FEATURE_COLLECTION = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
      properties: {},
    },
  ],
};

function createLoadedMockMap() {
  const style = { version: 8, sources: {}, layers: [] };

  return {
    getContainer: () => document.getElementById("map"),
    on: vi.fn(),
    off: vi.fn(),
    addSource: (id, source) => {
      style.sources[id] = source;
    },
    addLayer: (layer) => {
      style.layers.push(layer);
    },
    getStyle: () => style,
    fitBounds: vi.fn(),
    loaded: () => true,
  };
}

describe.skipIf(!hasDist)("Dist smoke", () => {
  it("exports a callable createInstance that accepts an injected map", async () => {
    document.body.innerHTML = '<div id="map"></div>';
    boundsSpy.construct = 0;

    const mod = await loadDist();

    expect(typeof mod.createInstance).toBe("function");

    const instance = mod.createInstance({
      map: createLoadedMockMap(),
      document: { config: { id: "map" } },
    });

    expect(instance.id).toBe("map");
    expect(typeof instance.toJSON).toBe("function");
    expect(instance.toJSON().config.id).toBe("map");

    instance.data.addLayer({ data: LINE_FEATURE_COLLECTION });

    // The mocked LngLatBounds was constructed during bounds fitting, proving
    // the built bundle resolved "maplibre-gl" through the Vitest mock.
    expect(boundsSpy.construct).toBeGreaterThan(0);

    instance.destroy();
  });
});
