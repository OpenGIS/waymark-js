/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { Marker } from "maplibre-gl";

// Mock maplibre-gl before importing the class under test
vi.mock("maplibre-gl", async () => {
  const actual = await vi.importActual("maplibre-gl");
  return {
    ...actual,
    Marker: vi.fn().mockImplementation(function (options) {
      const element =
        options && options.element
          ? options.element
          : document.createElement("div");
      return {
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        getElement: vi.fn().mockReturnValue(element),
        getMap: vi.fn(),
      };
    }),
  };
});

import WaymarkMarker from "../library/classes/Overlays/Marker.js";

describe("WaymarkMarker Icon Support", () => {
  it("should attempt to add an icon if configured", async () => {
    const iconConfig = {
      svg: '<svg width="10" height="10"><rect width="10" height="10" /></svg>',
      width: 20,
      height: 20,
    };

    const marker = new WaymarkMarker({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {
        waymark: {
          icon: iconConfig,
        },
      },
    });

    const layers = new Set();
    const images = new Set();

    const mapMock = {
      addSource: vi.fn(),
      getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
      addLayer: vi.fn((layer) => {
        layers.add(layer.id);
      }),
      getLayer: vi.fn((id) => (layers.has(id) ? {} : undefined)),
      hasImage: vi.fn((id) => images.has(id)),
      addImage: vi.fn((id) => images.add(id)),
      removeLayer: vi.fn((id) => layers.delete(id)),
      removeImage: vi.fn((id) => images.delete(id)),
      removeSource: vi.fn(),
      on: vi.fn(),
      loadImage: vi.fn(),
      getCanvas: () => ({ style: {} }),
      setLayoutProperty: vi.fn(),
      getLayoutProperty: vi.fn(),
    };

    // Override Image to trigger onload immediately for testing
    const OriginalImage = global.Image;
    global.Image = class {
      constructor(width, height) {
        this.width = width;
        this.height = height;
        this.onload = null;
        this._src = "";
      }
      set src(value) {
        this._src = value;
        if (this.onload) {
          this.onload();
        }
      }
      get src() {
        return this._src;
      }
    };

    marker.addTo(mapMock);

    // Should have added the circle layer (super.addTo)
    expect(mapMock.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "circle",
        id: marker.id,
      })
    );

    // Should have attempted to add the image and icon layer
    // Since we mocked Image to trigger onload synchronously
    expect(mapMock.addImage).toHaveBeenCalledWith(
      `${marker.id}-icon-img`,
      expect.any(Object) // The Image object
    );

    expect(mapMock.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${marker.id}-icon`,
        type: "symbol",
        layout: expect.objectContaining({
          "icon-image": `${marker.id}-icon-img`,
        }),
      })
    );

    // Cleanup
    marker.remove();
    expect(mapMock.removeLayer).toHaveBeenCalledWith(`${marker.id}-icon`);
    expect(mapMock.removeImage).toHaveBeenCalledWith(`${marker.id}-icon-img`);

    // Restore Image
    global.Image = OriginalImage;
  });

  it("should handle URL icons", () => {
    const iconConfig = {
      url: "https://example.com/icon.png",
      width: 20,
      height: 20,
    };

    const marker = new WaymarkMarker({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {
        waymark: {
          icon: iconConfig,
        },
      },
    });

    const mapMock = {
      addSource: vi.fn(),
      getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
      addLayer: vi.fn(),
      getLayer: vi.fn(),
      hasImage: vi.fn().mockReturnValue(false),
      addImage: vi.fn(),
      removeLayer: vi.fn(),
      removeImage: vi.fn(),
      removeSource: vi.fn(),
      on: vi.fn(),
      loadImage: vi.fn((url, cb) => {
        cb(null, { width: 20, height: 20 }); // Simulate success
      }),
      getCanvas: () => ({ style: {} }),
      setLayoutProperty: vi.fn(),
      getLayoutProperty: vi.fn(),
    };

    marker.addTo(mapMock);

    expect(mapMock.loadImage).toHaveBeenCalledWith(
      iconConfig.url,
      expect.any(Function)
    );

    expect(mapMock.addImage).toHaveBeenCalled();
    expect(mapMock.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${marker.id}-icon`,
        type: "symbol",
      })
    );
  });

  it("should handle HTML icons", () => {
    const htmlContent = '<div class="custom-icon"></div>';
    const iconConfig = {
      html: htmlContent,
    };

    const marker = new WaymarkMarker({
      geometry: {
        type: "Point",
        coordinates: [10, 20],
      },
      properties: {
        waymark: {
          icon: iconConfig,
        },
      },
    });

    const mapMock = {
      addSource: vi.fn(),
      getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
      addLayer: vi.fn(),
      getLayer: vi.fn(),
      hasImage: vi.fn(),
      addImage: vi.fn(),
      removeLayer: vi.fn(),
      removeImage: vi.fn(),
      removeSource: vi.fn(),
      on: vi.fn(),
      getCanvas: () => ({ style: {} }),
      setLayoutProperty: vi.fn(),
      getLayoutProperty: vi.fn(),
    };

    marker.addTo(mapMock);

    // Verify Marker was instantiated
    expect(Marker).toHaveBeenCalledWith(
      expect.objectContaining({
        element: expect.any(HTMLElement),
        anchor: "center",
      })
    );

    // Verify element content
    const mockMarkerInstance = Marker.mock.results[0].value;
    const element = mockMarkerInstance.getElement();
    expect(element.innerHTML).toBe(htmlContent);

    // Verify positioning and addition to map
    expect(mockMarkerInstance.setLngLat).toHaveBeenCalledWith([10, 20]);
    expect(mockMarkerInstance.addTo).toHaveBeenCalledWith(mapMock);
    
    // Verify cleanup
    marker.remove();
    expect(mockMarkerInstance.remove).toHaveBeenCalled();
  });
});
