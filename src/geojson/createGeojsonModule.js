/**
 * @param {import('maplibre-gl').Map} map
 */
function findFirstSymbolLayerId(map) {
  const layers = map.getStyle()?.layers ?? [];
  const symbolLayer = layers.find((layer) => layer.type === "symbol");
  return symbolLayer?.id;
}

const FAMILY_TYPES = {
  point: {
    geometryTypes: new Set(["Point", "MultiPoint"]),
    layerType: "circle",
    paint: {
      "circle-color": "#2563eb",
      "circle-radius": 5,
    },
  },
  line: {
    geometryTypes: new Set(["LineString", "MultiLineString"]),
    layerType: "line",
    paint: {
      "line-color": "#2563eb",
      "line-width": 3,
    },
  },
  polygon: {
    geometryTypes: new Set(["Polygon", "MultiPolygon"]),
    layerType: "fill",
    paint: {
      "fill-color": "#2563eb",
      "fill-opacity": 0.35,
    },
  },
};

const FAMILY_INSERT_ORDER = ["point", "line", "polygon"];

/**
 * @param {string} geometryType
 * @returns {'point' | 'line' | 'polygon' | null}
 */
function geometryTypeToFamily(geometryType) {
  if (FAMILY_TYPES.point.geometryTypes.has(geometryType)) {
    return "point";
  }

  if (FAMILY_TYPES.line.geometryTypes.has(geometryType)) {
    return "line";
  }

  if (FAMILY_TYPES.polygon.geometryTypes.has(geometryType)) {
    return "polygon";
  }

  return null;
}

/**
 * @param {unknown} geometry
 * @param {Set<'point' | 'line' | 'polygon'>} families
 */
function collectGeometryFamiliesFromGeometry(geometry, families) {
  if (!geometry || typeof geometry !== "object") {
    return;
  }

  const geometryType = geometry.type;

  if (typeof geometryType !== "string") {
    return;
  }

  if (geometryType === "GeometryCollection") {
    const geometries = Array.isArray(geometry.geometries)
      ? geometry.geometries
      : [];

    for (const nestedGeometry of geometries) {
      collectGeometryFamiliesFromGeometry(nestedGeometry, families);
    }

    return;
  }

  const family = geometryTypeToFamily(geometryType);

  if (family) {
    families.add(family);
  }
}

/**
 * @param {unknown} geoJSON
 * @returns {Set<'point' | 'line' | 'polygon'>}
 */
function collectGeometryFamilies(geoJSON) {
  const families = new Set();

  if (!geoJSON || typeof geoJSON !== "object") {
    return families;
  }

  const geoJSONType = geoJSON.type;

  if (typeof geoJSONType !== "string") {
    return families;
  }

  if (geoJSONType === "Feature") {
    collectGeometryFamiliesFromGeometry(geoJSON.geometry, families);
    return families;
  }

  if (geoJSONType === "FeatureCollection") {
    const features = Array.isArray(geoJSON.features) ? geoJSON.features : [];

    for (const feature of features) {
      if (!feature || typeof feature !== "object") {
        continue;
      }

      collectGeometryFamiliesFromGeometry(feature.geometry, families);
    }

    return families;
  }

  collectGeometryFamiliesFromGeometry(geoJSON, families);

  return families;
}

/**
 * @param {unknown} data
 * @param {string} baseLayerId
 */
function createRenderPlan(data, baseLayerId) {
  const discoveredFamilies = collectGeometryFamilies(data);
  const renderFamilies =
    discoveredFamilies.size > 0
      ? FAMILY_INSERT_ORDER.filter((family) => discoveredFamilies.has(family))
      : ["line"];

  return renderFamilies.map((family) => ({
    family,
    layerId: `${baseLayerId}-${family}`,
    type: FAMILY_TYPES[family].layerType,
    paint: {
      ...FAMILY_TYPES[family].paint,
    },
  }));
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {string} instanceId
 * @param {{ type: 'geojson', data: object }[]} [layers]
 * @param {{
 *   onLayerMounted?: (event: {
 *     layerIndex: number,
 *     mountedFamilies: Array<'point' | 'line' | 'polygon'>,
 *     mountedLayerIds: string[],
 *   }) => void,
 * }} [options]
 */
export function createGeoJSONModule(
  map,
  instanceId,
  layers = [],
  options = {},
) {
  const onLayerMounted =
    typeof options.onLayerMounted === "function"
      ? options.onLayerMounted
      : null;
  const instanceToken = String(instanceId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const layerRecords = layers.map((layer, index) => ({
    index,
    sourceId: `waymark-${instanceToken}-geojson-source-${index}`,
    layerId: `waymark-${instanceToken}-geojson-layer-${index}`,
    type: layer.type,
    data: layer.data,
    renderPlan: createRenderPlan(
      layer.data,
      `waymark-${instanceToken}-geojson-layer-${index}`,
    ),
  }));

  let hasMountedLayers = false;
  let attachedLoadHandler = null;
  let attachedStyleLoadHandler = null;

  function ensureMountHandlers() {
    const hasRenderableLayer = layerRecords.some(
      (layer) => layer.type === "geojson",
    );

    if (!hasRenderableLayer) {
      return;
    }

    if (typeof map.loaded === "function" && map.loaded()) {
      mountGeoJSONLayers();
    } else if (!attachedLoadHandler) {
      attachedLoadHandler = () => {
        mountGeoJSONLayers();
        attachedLoadHandler = null;
      };
      map.on("load", attachedLoadHandler);
    }

    if (!attachedStyleLoadHandler) {
      attachedStyleLoadHandler = () => {
        hasMountedLayers = false;
        mountGeoJSONLayers();
      };
      map.on("style.load", attachedStyleLoadHandler);
    }
  }

  function mountGeoJSONLayers() {
    if (hasMountedLayers) {
      return;
    }

    let beforeLayerId = findFirstSymbolLayerId(map);

    for (const layerRecord of layerRecords) {
      if (layerRecord.type !== "geojson") {
        continue;
      }

      const hasSource =
        typeof map.getSource === "function"
          ? Boolean(map.getSource(layerRecord.sourceId))
          : false;

      if (!hasSource) {
        map.addSource(layerRecord.sourceId, {
          type: "geojson",
          data: layerRecord.data,
        });
      }

      const mountedFamilies = [];
      const mountedLayerIds = [];

      let logicalLayerBottomId = beforeLayerId;

      for (const renderLayer of layerRecord.renderPlan) {
        const hasLayer =
          typeof map.getLayer === "function"
            ? Boolean(map.getLayer(renderLayer.layerId))
            : false;

        if (!hasLayer) {
          map.addLayer(
            {
              id: renderLayer.layerId,
              type: renderLayer.type,
              paint: renderLayer.paint,
              source: layerRecord.sourceId,
            },
            logicalLayerBottomId,
          );

          mountedFamilies.push(renderLayer.family);
          mountedLayerIds.push(renderLayer.layerId);
        }

        logicalLayerBottomId = renderLayer.layerId;
      }

      beforeLayerId = logicalLayerBottomId;

      if (onLayerMounted && mountedLayerIds.length > 0) {
        onLayerMounted({
          layerIndex: layerRecord.index,
          mountedFamilies,
          mountedLayerIds,
        });
      }
    }

    hasMountedLayers = true;
  }

  ensureMountHandlers();

  return {
    map,
    layers: layerRecords,
    addLayer(layer) {
      const nextIndex = layerRecords.length;
      const layerRecord = {
        index: nextIndex,
        sourceId: `waymark-${instanceToken}-geojson-source-${nextIndex}`,
        layerId: `waymark-${instanceToken}-geojson-layer-${nextIndex}`,
        type: layer.type,
        data: layer.data,
        renderPlan: createRenderPlan(
          layer.data,
          `waymark-${instanceToken}-geojson-layer-${nextIndex}`,
        ),
      };

      layerRecords.push(layerRecord);

      if (layerRecord.type === "geojson") {
        hasMountedLayers = false;
        ensureMountHandlers();
      }

      return layerRecord;
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
