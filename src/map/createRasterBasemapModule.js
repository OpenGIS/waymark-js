/**
 * @param {import('maplibre-gl').Map} map
 */
function findFirstSymbolLayerId(map) {
  const layers = map.getStyle()?.layers ?? [];
  const symbolLayer = layers.find((layer) => layer.type === "symbol");
  return symbolLayer?.id;
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {string} id
 * @param {Array<{ tileURLTemplates: string[], attributionHTML?: string, tileSize?: number, minZoom?: number, maxZoom?: number, opacity?: number }>} rasterBasemaps
 */
export function createRasterBasemapModule(map, id, rasterBasemaps) {
  const hasRasterBasemaps = rasterBasemaps.length > 0;

  if (!hasRasterBasemaps) {
    return {
      destroy() {},
    };
  }

  let attachedLoadHandler = null;

  const addRasterBasemaps = () => {
    const beforeLayerId = findFirstSymbolLayerId(map);

    for (const [index, rasterBasemap] of rasterBasemaps.entries()) {
      const sourceId = `waymark-${id}-basemap-raster-source-${index}`;
      const layerId = `waymark-${id}-basemap-raster-layer-${index}`;

      map.addSource(sourceId, {
        type: "raster",
        tiles: rasterBasemap.tileURLTemplates,
        ...(rasterBasemap.attributionHTML !== undefined
          ? { attribution: rasterBasemap.attributionHTML }
          : {}),
        ...(rasterBasemap.tileSize !== undefined
          ? { tileSize: rasterBasemap.tileSize }
          : {}),
        ...(rasterBasemap.minZoom !== undefined
          ? { minzoom: rasterBasemap.minZoom }
          : {}),
        ...(rasterBasemap.maxZoom !== undefined
          ? { maxzoom: rasterBasemap.maxZoom }
          : {}),
      });

      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": rasterBasemap.opacity ?? 1,
          },
        },
        beforeLayerId,
      );
    }
  };

  if (map.loaded()) {
    addRasterBasemaps();
  } else {
    attachedLoadHandler = () => {
      addRasterBasemaps();
      attachedLoadHandler = null;
    };
    map.on("load", attachedLoadHandler);
  }

  return {
    destroy() {
      if (attachedLoadHandler) {
        map.off("load", attachedLoadHandler);
        attachedLoadHandler = null;
      }
    },
  };
}
