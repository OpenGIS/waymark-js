/**
 * @param {import('maplibre-gl').Map} map
 * @param {string} instanceId
 * @param {object} [geoJSON]
 */
export function createGeoJSONModule(map, instanceId, geoJSON = null) {
  const instanceToken = String(instanceId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const sourceId = `waymark-${instanceToken}-geojson-source`;
  const layerId = `waymark-${instanceToken}-geojson-layer`;

  let hasRendered = false;
  let detachLoadListener = null;

  function renderGeoJSONLayer() {
    if (!geoJSON || hasRendered) {
      return;
    }

    hasRendered = true;

    map.addSource(sourceId, {
      type: "geojson",
      data: geoJSON,
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#2563eb",
        "line-width": 3,
      },
    });
  }

  if (geoJSON) {
    if (typeof map.loaded === "function" && map.loaded()) {
      renderGeoJSONLayer();
    } else {
      map.on("load", renderGeoJSONLayer);
      detachLoadListener = () => {
        if (typeof map.off === "function") {
          map.off("load", renderGeoJSONLayer);
        }
      };
    }
  }

  return {
    map,
    sourceId,
    layerId,
    geoJSON,
    destroy() {
      if (detachLoadListener) {
        detachLoadListener();
        detachLoadListener = null;
      }
    },
  };
}
