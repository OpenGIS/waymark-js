/**
 * @param {import('maplibre-gl').Map} map
 * @param {string} instanceId
 * @param {object} [geojson]
 */
export function createInstanceGeojson(map, instanceId, geojson = null) {
  const instanceToken = String(instanceId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const sourceId = `waymark-${instanceToken}-geojson-source`;
  const layerId = `waymark-${instanceToken}-geojson-layer`;

  let hasRendered = false;

  function renderInitialGeojson() {
    if (!geojson || hasRendered) {
      return;
    }

    hasRendered = true;

    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
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

  if (geojson) {
    if (typeof map.loaded === "function" && map.loaded()) {
      renderInitialGeojson();
    } else {
      map.on("load", renderInitialGeojson);
    }
  }

  return {
    map,
    sourceId,
    layerId,
    geojson,
  };
}
