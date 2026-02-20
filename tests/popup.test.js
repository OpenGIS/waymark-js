/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";

// Mock maplibre-gl Popup before importing Overlay
const mockSetLngLat = vi.fn().mockReturnThis();
const mockAddTo = vi.fn().mockReturnThis();
const mockSetDOMContent = vi.fn().mockReturnThis();

vi.mock("maplibre-gl", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    LngLatBounds: actual.LngLatBounds,
    Marker: actual.Marker,
    Popup: vi.fn().mockImplementation(function () {
      this.setLngLat = mockSetLngLat;
      this.addTo = mockAddTo;
      this.setDOMContent = mockSetDOMContent;
    }),
  };
});

import WaymarkMarker from "../library/classes/Overlays/Marker.js";

function createMapMock() {
  const layers = new Set();
  return {
    addSource: vi.fn(),
    getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
    addLayer: vi.fn((layer) => layers.add(layer.id)),
    getLayer: vi.fn((id) => (layers.has(id) ? { id } : undefined)),
    removeLayer: vi.fn((id) => layers.delete(id)),
    removeSource: vi.fn(),
    setLayoutProperty: vi.fn(),
    getLayoutProperty: vi.fn(),
    getCanvas: vi.fn().mockReturnValue({ style: {} }),
    on: vi.fn(),
  };
}

describe("Overlay.openPopup", () => {
  it("positions popup at the provided lngLat", () => {
    const marker = new WaymarkMarker({
      geometry: { type: "Point", coordinates: [-122.4, 37.8] },
      properties: { waymark: { title: "Test" } },
    });

    const map = createMapMock();
    marker.addTo(map);

    const clickLngLat = { lng: -122.5, lat: 37.9 };
    marker.openPopup(clickLngLat);

    expect(mockSetLngLat).toHaveBeenCalledWith([-122.5, 37.9]);
    expect(mockAddTo).toHaveBeenCalledWith(map);
  });

  it("falls back to bounds center when no lngLat is provided", () => {
    mockSetLngLat.mockClear();
    mockAddTo.mockClear();

    const marker = new WaymarkMarker({
      geometry: { type: "Point", coordinates: [-122.4, 37.8] },
      properties: { waymark: { title: "Test" } },
    });

    const map = createMapMock();
    marker.addTo(map);

    marker.openPopup();

    // Bounds center of a point marker equals its own coordinates
    expect(mockSetLngLat).toHaveBeenCalledWith([-122.4, 37.8]);
    expect(mockAddTo).toHaveBeenCalledWith(map);
  });

  it("does nothing when overlay has no popup", () => {
    mockSetLngLat.mockClear();

    const marker = new WaymarkMarker({
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    });

    const map = createMapMock();
    marker.addTo(map);

    marker.openPopup({ lng: 1, lat: 2 });

    expect(mockSetLngLat).not.toHaveBeenCalled();
  });
});
