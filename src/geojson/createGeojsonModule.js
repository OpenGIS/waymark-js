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
 * @param {string} instanceId
 * @param {{ geoJSON: object | null }[]} [layers]
 */
export function createGeoJSONModule(map, instanceId, layers = []) {
  const instanceToken = String(instanceId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const layerRecords = layers.map((layer, index) => ({
    sourceId: `waymark-${instanceToken}-geojson-source-${index}`,
    layerId: `waymark-${instanceToken}-geojson-layer-${index}`,
    geoJSON: layer.geoJSON,
  }));

  let hasRendered = false;
  let detachLoadListener = null;

  function renderGeoJSONLayers() {
    if (hasRendered) {
      return;
    }

    hasRendered = true;

    let beforeLayerId = findFirstSymbolLayerId(map);

    for (const layerRecord of layerRecords) {
      if (!layerRecord?.geoJSON) {
        continue;
      }

      map.addSource(layerRecord.sourceId, {
        type: "geojson",
        data: layerRecord.geoJSON,
      });

      map.addLayer(
        {
          id: layerRecord.layerId,
          type: "line",
          source: layerRecord.sourceId,
          paint: {
            "line-color": "#2563eb",
            "line-width": 3,
          },
        },
        beforeLayerId,
      );

      beforeLayerId = layerRecord.layerId;
    }
  }

  const hasRenderableLayer = layerRecords.some((layer) =>
    Boolean(layer.geoJSON),
  );

  if (hasRenderableLayer) {
    if (typeof map.loaded === "function" && map.loaded()) {
      renderGeoJSONLayers();
    } else {
      map.on("load", renderGeoJSONLayers);
      detachLoadListener = () => {
        if (typeof map.off === "function") {
          map.off("load", renderGeoJSONLayers);
        }
      };
    }
  }

  return {
    map,
    layers: layerRecords,
    destroy() {
      if (detachLoadListener) {
        detachLoadListener();
        detachLoadListener = null;
      }
    },
  };
}
