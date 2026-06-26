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
 * @param {Array<{ basemapId: string, tileURLTemplates: string[], attributionHTML?: string, tileSize?: number, minZoom?: number, maxZoom?: number, opacity?: number }>} rasterBasemaps
 */
export function createRasterBasemapModule(map, id, rasterBasemaps) {
  const hasRasterBasemaps = rasterBasemaps.length > 0;

  /**
   * @type {Record<string, { sourceId: string, layerId: string, basemap: { basemapId: string, tileURLTemplates: string[], attributionHTML?: string, tileSize?: number, minZoom?: number, maxZoom?: number, opacity?: number } }>}
   */
  const basemapRecords = {};

  /** @type {string[]} */
  let orderedBasemapIds = [];

  rasterBasemaps.forEach((rasterBasemap, index) => {
    const basemapId = rasterBasemap.basemapId;
    orderedBasemapIds.push(basemapId);
    basemapRecords[basemapId] = {
      sourceId: `waymark-${id}-basemap-raster-source-${index}`,
      layerId: `waymark-${id}-basemap-raster-layer-${index}`,
      basemap: {
        ...rasterBasemap,
      },
    };
  });

  if (!hasRasterBasemaps) {
    return {
      setRasterOpacity() {},
      reorderRasterBasemaps() {},
      destroy() {},
    };
  }

  let attachedLoadHandler = null;
  let attachedStyleLoadHandler = null;
  let hasMountedLayers = false;

  const addRasterBasemaps = () => {
    if (hasMountedLayers) {
      return;
    }

    let beforeLayerId = findFirstSymbolLayerId(map);

    for (const basemapId of orderedBasemapIds) {
      const record = basemapRecords[basemapId];

      if (!record) {
        continue;
      }

      const { sourceId, layerId, basemap: rasterBasemap } = record;

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

      beforeLayerId = layerId;
    }

    hasMountedLayers = true;
  };

  /**
   * @param {number} opacity
   * @param {string} layerId
   */
  const applyRasterOpacity = (opacity, layerId) => {
    map.setPaintProperty(layerId, "raster-opacity", opacity);
  };

  /**
   * @param {string[]} nextOrderedBasemapIds
   */
  const applyRasterReorder = (nextOrderedBasemapIds) => {
    if (nextOrderedBasemapIds.length === 0) {
      return;
    }

    let beforeLayerId = findFirstSymbolLayerId(map);

    for (const basemapId of nextOrderedBasemapIds) {
      const record = basemapRecords[basemapId];

      if (!record) {
        continue;
      }

      map.moveLayer(record.layerId, beforeLayerId);
      beforeLayerId = record.layerId;
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

  attachedStyleLoadHandler = () => {
    hasMountedLayers = false;
    addRasterBasemaps();
  };
  map.on("style.load", attachedStyleLoadHandler);

  return {
    /**
     * @param {string} basemapId
     * @param {number} opacity
     */
    setRasterOpacity(basemapId, opacity) {
      const record = basemapRecords[basemapId];

      if (!record) {
        return;
      }

      record.basemap.opacity = opacity;

      if (hasMountedLayers) {
        applyRasterOpacity(opacity, record.layerId);
      }
    },
    /**
     * @param {string[]} nextOrderedBasemapIds
     */
    reorderRasterBasemaps(nextOrderedBasemapIds) {
      const requestedOrder = Array.isArray(nextOrderedBasemapIds)
        ? nextOrderedBasemapIds
        : [];

      const remainingBasemapIds = orderedBasemapIds.filter(
        (basemapId) => !requestedOrder.includes(basemapId),
      );

      orderedBasemapIds = [
        ...requestedOrder.filter((basemapId) => basemapRecords[basemapId]),
        ...remainingBasemapIds,
      ];

      if (hasMountedLayers) {
        applyRasterReorder(orderedBasemapIds);
      }
    },
    destroy() {
      if (attachedLoadHandler) {
        map.off("load", attachedLoadHandler);
        attachedLoadHandler = null;
      }

      if (attachedStyleLoadHandler) {
        map.off("style.load", attachedStyleLoadHandler);
        attachedStyleLoadHandler = null;
      }
    },
  };
}
