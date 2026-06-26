/**
 * @param {import('maplibre-gl').Map} map
 */
function findFirstSymbolLayerId(map) {
  const layers = map.getStyle()?.layers ?? [];
  const symbolLayer = layers.find((layer) => layer.type === "symbol");
  return symbolLayer?.id;
}

const pointGeometryTypes = new Set(["Point", "MultiPoint"]);
const lineGeometryTypes = new Set(["LineString", "MultiLineString"]);
const polygonGeometryTypes = new Set(["Polygon", "MultiPolygon"]);

/**
 * @param {unknown} geometry
 * @returns {string | null}
 */
function findGeometryTypeFromGeometry(geometry) {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  const geometryType = geometry.type;

  if (typeof geometryType !== "string") {
    return null;
  }

  if (geometryType === "GeometryCollection") {
    const geometries = Array.isArray(geometry.geometries)
      ? geometry.geometries
      : [];

    for (const nestedGeometry of geometries) {
      const nestedGeometryType = findGeometryTypeFromGeometry(nestedGeometry);

      if (nestedGeometryType) {
        return nestedGeometryType;
      }
    }

    return null;
  }

  return geometryType;
}

/**
 * @param {unknown} geoJSON
 * @returns {string | null}
 */
function findGeometryType(geoJSON) {
  if (!geoJSON || typeof geoJSON !== "object") {
    return null;
  }

  const geoJSONType = geoJSON.type;

  if (typeof geoJSONType !== "string") {
    return null;
  }

  if (geoJSONType === "Feature") {
    return findGeometryTypeFromGeometry(geoJSON.geometry);
  }

  if (geoJSONType === "FeatureCollection") {
    const features = Array.isArray(geoJSON.features) ? geoJSON.features : [];

    for (const feature of features) {
      if (!feature || typeof feature !== "object") {
        continue;
      }

      const featureGeometryType = findGeometryTypeFromGeometry(
        feature.geometry,
      );

      if (featureGeometryType) {
        return featureGeometryType;
      }
    }

    return null;
  }

  return findGeometryTypeFromGeometry(geoJSON);
}

/**
 * @param {unknown} geoJSON
 */
function resolveLayerStyle(geoJSON) {
  const geometryType = findGeometryType(geoJSON);

  if (pointGeometryTypes.has(geometryType)) {
    return {
      type: "circle",
      paint: {
        "circle-color": "#2563eb",
        "circle-radius": 5,
      },
    };
  }

  if (polygonGeometryTypes.has(geometryType)) {
    return {
      type: "fill",
      paint: {
        "fill-color": "#2563eb",
        "fill-opacity": 0.35,
      },
    };
  }

  if (lineGeometryTypes.has(geometryType)) {
    return {
      type: "line",
      paint: {
        "line-color": "#2563eb",
        "line-width": 3,
      },
    };
  }

  return {
    type: "line",
    paint: {
      "line-color": "#2563eb",
      "line-width": 3,
    },
  };
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
          ...resolveLayerStyle(layerRecord.geoJSON),
          source: layerRecord.sourceId,
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
