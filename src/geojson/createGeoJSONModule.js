import { LngLatBounds } from "maplibre-gl";
import { createFeatureInteractionModule } from "./createFeatureInteractionModule.js";

/**
 * @param {import('maplibre-gl').Map} map
 */
function findFirstSymbolLayerId(map) {
  const layers = map.getStyle()?.layers ?? [];
  const symbolLayer = layers.find((layer) => layer.type === "symbol");
  return symbolLayer?.id;
}

const FAMILY_TYPES = {
  circle: {
    geometryTypes: new Set(["Point", "MultiPoint"]),
    layerType: "circle",
    paint: {
      "circle-radius": 5,
    },
  },
  line: {
    geometryTypes: new Set(["LineString", "MultiLineString"]),
    layerType: "line",
    paint: {
      "line-width": 3,
    },
  },
  fill: {
    geometryTypes: new Set(["Polygon", "MultiPolygon"]),
    layerType: "fill",
    paint: {
      "fill-opacity": 0.35,
    },
  },
};

const FAMILY_INSERT_ORDER = ["circle", "line", "fill"];

const FAMILY_COLOUR_KEYS = {
  circle: "circle-color",
  line: "line-color",
  fill: "fill-color",
};

// MapLibre normalises Multi* geometries to these base types for
// `["geometry-type"]`, so a single equality constrains each family to every
// geometry it owns without listing the Multi* variants.
const FAMILY_GEOMETRY_TYPE = {
  circle: "Point",
  line: "LineString",
  fill: "Polygon",
  symbol: "Point",
};

/**
 * Build the base geometry-type equality for a family. Without this, every
 * family layer draws every geometry — circles at polyline vertices, the fill
 * family closing and washing lines, and so on.
 *
 * @param {'circle' | 'line' | 'fill' | 'symbol'} family
 * @returns {Array}
 */
function geometryTypeFilter(family) {
  return ["==", ["geometry-type"], FAMILY_GEOMETRY_TYPE[family]];
}

/**
 * AND a family's geometry-type constraint with an optional feature filter.
 * Returns the bare geometry equality when there is no additional filter.
 *
 * @param {'circle' | 'line' | 'fill' | 'symbol'} family
 * @param {Array | null} [filter]
 * @returns {Array}
 */
function withGeometryType(family, filter) {
  const geometryFilter = geometryTypeFilter(family);
  return filter ? ["all", geometryFilter, filter] : geometryFilter;
}

const COLOUR_POOL = [
  "#e6194b",
  "#3cb44b",
  "#ffe119",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#42d4f4",
  "#f032e6",
  "#bfef45",
  "#fabed4",
  "#469990",
  "#dcbeff",
  "#9a6324",
  "#fffac8",
  "#800000",
  "#aaffc3",
  "#808000",
  "#ffd8b1",
  "#000075",
  "#a9a9a9",
];

/**
 * @param {string} geometryType
 * @returns {'circle' | 'line' | 'fill' | null}
 */
function geometryTypeToFamily(geometryType) {
  if (FAMILY_TYPES.circle.geometryTypes.has(geometryType)) {
    return "circle";
  }

  if (FAMILY_TYPES.line.geometryTypes.has(geometryType)) {
    return "line";
  }

  if (FAMILY_TYPES.fill.geometryTypes.has(geometryType)) {
    return "fill";
  }

  return null;
}

/**
 * @param {unknown} geometry
 * @param {Set<'circle' | 'line' | 'fill'>} families
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
 * @returns {Set<'circle' | 'line' | 'fill'>}
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
 * @param {unknown} position
 * @returns {[number, number] | null}
 */
function readPosition(position) {
  if (!Array.isArray(position) || position.length < 2) {
    return null;
  }

  const [lng, lat] = position;

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return [lng, lat];
}

/**
 * @param {unknown} geometry
 * @param {(lng: number, lat: number) => void} visitor
 */
function visitGeometryCoordinates(geometry, visitor) {
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
      visitGeometryCoordinates(nestedGeometry, visitor);
    }

    return;
  }

  const positions = geometry.coordinates;

  if (!Array.isArray(positions)) {
    return;
  }

  if (geometryType === "Point") {
    const position = readPosition(positions);

    if (position) {
      visitor(position[0], position[1]);
    }

    return;
  }

  if (geometryType === "MultiPoint" || geometryType === "LineString") {
    for (const candidate of positions) {
      const position = readPosition(candidate);

      if (position) {
        visitor(position[0], position[1]);
      }
    }

    return;
  }

  if (geometryType === "MultiLineString" || geometryType === "Polygon") {
    for (const ring of positions) {
      if (!Array.isArray(ring)) {
        continue;
      }

      for (const candidate of ring) {
        const position = readPosition(candidate);

        if (position) {
          visitor(position[0], position[1]);
        }
      }
    }

    return;
  }

  if (geometryType === "MultiPolygon") {
    for (const polygon of positions) {
      if (!Array.isArray(polygon)) {
        continue;
      }

      for (const ring of polygon) {
        if (!Array.isArray(ring)) {
          continue;
        }

        for (const candidate of ring) {
          const position = readPosition(candidate);

          if (position) {
            visitor(position[0], position[1]);
          }
        }
      }
    }
  }
}

/**
 * @param {unknown} geoJSON
 * @param {(lng: number, lat: number) => void} visitor
 */
function visitGeoJSONCoordinates(geoJSON, visitor) {
  if (!geoJSON || typeof geoJSON !== "object") {
    return;
  }

  const geoJSONType = geoJSON.type;

  if (typeof geoJSONType !== "string") {
    return;
  }

  if (geoJSONType === "Feature") {
    visitGeometryCoordinates(geoJSON.geometry, visitor);
    return;
  }

  if (geoJSONType === "FeatureCollection") {
    const features = Array.isArray(geoJSON.features) ? geoJSON.features : [];

    for (const feature of features) {
      if (!feature || typeof feature !== "object") {
        continue;
      }

      visitGeometryCoordinates(feature.geometry, visitor);
    }

    return;
  }

  visitGeometryCoordinates(geoJSON, visitor);
}

/**
 * @param {unknown} geoJSON
 * @returns {import('maplibre-gl').LngLatBounds | null}
 */
function computeGeoJSONBounds(geoJSON) {
  let sw = null;
  let ne = null;

  visitGeoJSONCoordinates(geoJSON, (lng, lat) => {
    if (sw === null) {
      sw = [lng, lat];
      ne = [lng, lat];
      return;
    }

    sw = [Math.min(sw[0], lng), Math.min(sw[1], lat)];
    ne = [Math.max(ne[0], lng), Math.max(ne[1], lat)];
  });

  if (sw === null || ne === null) {
    return null;
  }

  const bounds = new LngLatBounds(sw, ne);

  // MapLibre fitBounds fails with zero-area bounds (single-point data).
  // Expand the bounds by a small buffer (~0.01°) when sw and ne coincide.
  if (sw[0] === ne[0] && sw[1] === ne[1]) {
    const buffer = 0.01;
    bounds.extend([sw[0] - buffer, sw[1] - buffer]);
    bounds.extend([ne[0] + buffer, ne[1] + buffer]);
  }

  return bounds;
}

/**
 * @param {unknown} data
 * @param {string} baseLayerId
 */
function fitBoundsToGeoJSON(map, geoJSON) {
  const bounds = computeGeoJSONBounds(geoJSON);

  if (bounds) {
    map.fitBounds(bounds, { padding: 20 });
  }
}

/**
 * Resolve paint properties for a single (family, sublayer) pair.
 *
 * @param {'circle'|'line'|'fill'} family
 * @param {number} layerIndex — data layer index for colour pool selection
 * @param {object|null} instancePaint — from config.paint (family-keyed, or null)
 * @param {object|null} layerPaint — from data.layers[].paint (family-keyed, or null)
 * @param {object|null} typePaint — pre-scoped to family by caller (flat paint props, or null)
 * @returns {object} — fully resolved MapLibre paint properties
 */
function resolvePaint(
  family,
  layerIndex,
  instancePaint,
  layerPaint,
  typePaint,
) {
  const paint = {
    // 1. Start with FAMILY_TYPES non-colour defaults (width, radius, opacity)
    ...FAMILY_TYPES[family].paint,
    // 2. Assign colour from pool by layer index
    [FAMILY_COLOUR_KEYS[family]]: COLOUR_POOL[layerIndex % COLOUR_POOL.length],
    // 3. Merge in config.paint (instance-wide overrides, scoped to family)
    ...(instancePaint?.[family] || {}),
  };

  if (typePaint) {
    // 4a. Typed sublayer: typePaint is already family-scoped by caller
    Object.assign(paint, typePaint);
  } else {
    // 4b. Untyped sublayer: layerPaint is family-keyed — scope to current family
    Object.assign(paint, layerPaint?.[family] || {});
  }

  return paint;
}

/**
 * Check if any features matching the given filter have waymarkPaint.
 *
 * @param {object} geoJSON
 * @param {Array | null} filter — MapLibre filter expression or null
 * @returns {boolean}
 */
function hasFeaturesWithWaymarkPaint(geoJSON, filter) {
  if (!geoJSON || typeof geoJSON !== "object") {
    return false;
  }

  let features = [];

  if (geoJSON.type === "FeatureCollection" && Array.isArray(geoJSON.features)) {
    features = geoJSON.features;
  } else if (geoJSON.type === "Feature") {
    features = [geoJSON];
  }

  for (const feature of features) {
    if (!feature || typeof feature !== "object") {
      continue;
    }

    const waymarkPaint = feature.properties?.waymarkPaint;

    if (waymarkPaint === undefined || waymarkPaint === null) {
      continue;
    }

    // If there's no filter, this feature matches
    if (!filter) {
      return true;
    }

    // Simple filter evaluation: ["!", ["has", "waymarkType"]]
    // and ["==", ["get", "waymarkType"], typeKey]
    if (Array.isArray(filter) && filter.length >= 2) {
      const operator = filter[0];

      if (operator === "!") {
        // ["!", ["has", "waymarkType"]]
        const innerExpr = filter[1];
        if (
          Array.isArray(innerExpr) &&
          innerExpr[0] === "has" &&
          innerExpr[1] === "waymarkType"
        ) {
          // Match features that do NOT have waymarkType
          if (
            feature.properties?.waymarkType === undefined ||
            feature.properties?.waymarkType === null
          ) {
            return true;
          }
        }
      } else if (operator === "==") {
        // ["==", ["get", "waymarkType"], typeKey]
        const getExpr = filter[1];
        const expectedValue = filter[2];

        if (
          Array.isArray(getExpr) &&
          getExpr[0] === "get" &&
          getExpr[1] === "waymarkType"
        ) {
          if (feature.properties?.waymarkType === expectedValue) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Wrap paint properties in coalesce expressions for waymarkPaint support.
 *
 * @param {object} paint — resolved paint properties
 * @returns {object} — paint properties wrapped in expressions
 */
function wrapPaintWithExpressions(paint) {
  const wrapped = {};

  for (const [key, value] of Object.entries(paint)) {
    wrapped[key] = [
      "coalesce",
      ["get", key, ["get", "waymarkPaint", ["properties"]]],
      value,
    ];
  }

  return wrapped;
}

/**
 * @param {object} data — GeoJSON data for a single layer
 * @param {string} baseLayerId
 * @param {number} layerIndex
 * @param {Record<string, { paint: object }> | null} [types]
 * @param {object | null} [instancePaint]
 * @param {object | null} [layerPaint]
 * @returns {Array<{
 *   family: 'circle' | 'line' | 'fill' | 'symbol',
 *   layerId: string,
 *   type: string,
 *   typeKey?: string | null,
 *   paint: object,
 *   layout?: object,
 *   filter: Array | null,
 *   hasWaymarkPaint: boolean,
 *   priority?: number,
 *   _skipObserve?: boolean,
 * }>}
 */
function createRenderPlan(
  data,
  baseLayerId,
  layerIndex,
  types,
  instancePaint,
  layerPaint,
) {
  const discoveredFamilies = collectGeometryFamilies(data);
  const renderFamilies =
    discoveredFamilies.size > 0
      ? FAMILY_INSERT_ORDER.filter((family) => discoveredFamilies.has(family))
      : ["line"];

  const hasTypes = types && Object.keys(types).length > 0;

  let entries;

  if (!hasTypes) {
    // Original behaviour — no type awareness needed
    entries = renderFamilies.map((family) => ({
      family,
      layerId: `${baseLayerId}-${family}`,
      type: FAMILY_TYPES[family].layerType,
      paint: resolvePaint(family, layerIndex, instancePaint, layerPaint, null),
      filter: geometryTypeFilter(family),
      hasWaymarkPaint: hasFeaturesWithWaymarkPaint(data, null),
      priority: family === "circle" ? 1 : 0,
    }));
  } else {
    // Types defined — untyped fallback + per-type sublayers
    entries = [];

    for (const family of renderFamilies) {
      // Untyped fallback
      entries.push({
        family,
        layerId: `${baseLayerId}-${family}`,
        type: FAMILY_TYPES[family].layerType,
        paint: resolvePaint(
          family,
          layerIndex,
          instancePaint,
          layerPaint,
          null,
        ),
        filter: withGeometryType(family, ["!", ["has", "waymarkType"]]),
        hasWaymarkPaint: hasFeaturesWithWaymarkPaint(data, [
          "!",
          ["has", "waymarkType"],
        ]),
        priority: family === "circle" ? 1 : 0,
      });

      // Per-type sublayers (in config.types key order)
      for (const [typeKey, typeDef] of Object.entries(types)) {
        // If this is a circle family and the type has an icon defined,
        // create an invisible circle layer for click detection plus
        // a symbol layer for the visual icon. The icon is a name hook:
        // `icon-image` is the authored icon name, which the consumer must
        // register via map.addImage(name, ...).
        if (family === "circle" && typeDef.icon) {
          const fillColor = typeDef.paint?.circle?.["circle-color"];
          if (fillColor) {
            // Invisible hit circle for reliable click detection
            // (MapLibre symbol hit areas are only the icon's non-transparent pixels)
            entries.push({
              family: "circle",
              layerId: `${baseLayerId}-circle-hit-${typeKey}`,
              type: "circle",
              typeKey,
              paint: {
                "circle-color": fillColor,
                "circle-radius": 14,
                "circle-opacity": 0,
              },
              filter: withGeometryType("circle", [
                "==",
                ["get", "waymarkType"],
                typeKey,
              ]),
              hasWaymarkPaint: false,
              priority: 2,
            });

            entries.push({
              family: "symbol",
              layerId: `${baseLayerId}-symbol-type-${typeKey}`,
              type: "symbol",
              typeKey,
              paint: { "icon-opacity": 1 },
              layout: {
                "icon-image": typeDef.icon,
                "icon-size": typeDef.iconSize ?? 1.5,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              },
              filter: withGeometryType("symbol", [
                "==",
                ["get", "waymarkType"],
                typeKey,
              ]),
              hasWaymarkPaint: false,
              _skipObserve: true,
              priority: 3,
            });
            continue;
          }
        }

        const typePaint = typeDef.paint?.[family];
        if (!typePaint) continue; // type doesn't cover this family

        entries.push({
          family,
          layerId: `${baseLayerId}-${family}-type-${typeKey}`,
          type: FAMILY_TYPES[family].layerType,
          typeKey,
          paint: resolvePaint(
            family,
            layerIndex,
            instancePaint,
            null,
            typePaint,
          ),
          filter: withGeometryType(family, [
            "==",
            ["get", "waymarkType"],
            typeKey,
          ]),
          hasWaymarkPaint: hasFeaturesWithWaymarkPaint(data, [
            "==",
            ["get", "waymarkType"],
            typeKey,
          ]),
          priority: family === "circle" ? 1 : 0,
        });
      }
    }
  }

  // Post-process: add invisible hit circles for all circle layers
  // to improve click targeting. Extends the existing hit-circle
  // pattern (already used for icon types) to regular circle layers
  // so all point features have a consistent large click target.
  const hitEntries = [];

  for (const entry of entries) {
    if (
      entry.family === "circle" &&
      !entry._skipObserve &&
      entry.paint["circle-opacity"] !== 0
    ) {
      entry._skipObserve = true;

      hitEntries.push({
        family: "circle",
        layerId: `${entry.layerId}-hit`,
        type: "circle",
        typeKey: entry.typeKey ?? null,
        paint: {
          "circle-color": entry.paint["circle-color"] ?? "#000000",
          "circle-radius": 14,
          "circle-opacity": 0,
        },
        filter: entry.filter,
        hasWaymarkPaint: false,
        priority: 2,
      });
    }
  }

  entries.push(...hitEntries);

  return entries;
}

/**
 * @param {import('maplibre-gl').Map} map
 * @param {string} instanceId
 * @param {{ type: 'geojson', data: object, paint?: object }[]} [layers]
 * @param {{
 *   onLayerMounted?: (event: {
 *     layerIndex: number,
 *     mountedFamilies: Array<'circle' | 'line' | 'fill' | 'symbol'>,
 *     mountedLayerIds: string[],
 *     mountedTypes: string[],
 *   }) => void,
 *   types?: Record<string, { title?: string, icon?: string, iconSize?: number, paint: object }>,
 *   instancePaint?: { circle?: object, line?: object, fill?: object } | null,
 *   onFeatureEvent?: (type: string, detail: object) => void,
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
  const types = options.types ?? null;
  const instancePaint = options.instancePaint ?? null;
  const onFeatureEvent =
    typeof options.onFeatureEvent === "function"
      ? options.onFeatureEvent
      : null;
  const instanceToken = String(instanceId).replace(/[^a-zA-Z0-9_-]/g, "-");
  const layerRecords = layers.map((layer, index) => ({
    index,
    sourceId: `waymark-${instanceToken}-geojson-source-${index}`,
    layerId: `waymark-${instanceToken}-geojson-layer-${index}`,
    type: layer.type,
    data: layer.data,
    paint: layer.paint ?? null,
    fitBounds: false,
    hasFitBounds: false,
    renderPlan: null,
  }));

  // Build render plans for all records after assignment
  for (const layerRecord of layerRecords) {
    layerRecord.renderPlan = createRenderPlan(
      layerRecord.data,
      layerRecord.layerId,
      layerRecord.index,
      types,
      instancePaint,
      layerRecord.paint,
    );
  }

  const featureInteraction = createFeatureInteractionModule(map, {
    id: instanceId,
    emit: (type, detail) => {
      if (onFeatureEvent) {
        onFeatureEvent(type, detail);
      }
    },
  });

  let hasMountedLayers = false;
  let isMapLoaded = false;
  let attachedLoadHandler = null;
  let attachedStyleLoadHandler = null;

  function ensureMountHandlers() {
    const hasRenderableLayer = layerRecords.some(
      (layer) => layer.type === "geojson",
    );

    if (!hasRenderableLayer) {
      return;
    }

    // `map.loaded()` can return false even after the `load` event has fired
    // — adding a GeoJSON source starts async worker processing, which keeps
    // `style.loaded()` false until the worker finishes. If we gate mounting
    // on `map.loaded()`, subsequent addLayer calls hit a false negative and
    // try to register a `load` handler that will never fire again.
    //
    // Solution: once the map has ever reported loaded (or the `load` event
    // fires), remember that fact via `isMapLoaded` and skip the `map.loaded()`
    // check on subsequent calls.
    if (isMapLoaded || (typeof map.loaded === "function" && map.loaded())) {
      isMapLoaded = true;

      // Mount synchronously so errors propagate to the caller (e.g. the
      // try-catch in addCoreDataLayer).
      mountLayersSync();
    } else if (!attachedLoadHandler) {
      attachedLoadHandler = () => {
        isMapLoaded = true;
        mountLayersSync();
        attachedLoadHandler = null;
      };
      map.on("load", attachedLoadHandler);
    }

    if (!attachedStyleLoadHandler) {
      attachedStyleLoadHandler = () => {
        hasMountedLayers = false;
        featureInteraction.reset();
        mountLayersSync();
      };
      map.on("style.load", attachedStyleLoadHandler);
    }
  }

  /**
   * Synchronously mount GeoJSON sources and layers for all layer records.
   * Throws on error from map.addSource / map.addLayer, propagating to the
   * try-catch in addCoreDataLayer.
   */
  function mountLayersSync() {
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
      const mountedTypes = [];

      let logicalLayerBottomId = beforeLayerId;

      for (const renderLayer of layerRecord.renderPlan) {
        const hasLayer =
          typeof map.getLayer === "function"
            ? Boolean(map.getLayer(renderLayer.layerId))
            : false;

        if (!hasLayer) {
          const paint = renderLayer.hasWaymarkPaint
            ? wrapPaintWithExpressions(renderLayer.paint)
            : renderLayer.paint;

          /** @type {import('maplibre-gl').LayerSpecification} */
          const layerSpec = {
            id: renderLayer.layerId,
            type: renderLayer.type,
            paint,
            source: layerRecord.sourceId,
          };

          if (renderLayer.filter) {
            layerSpec.filter = renderLayer.filter;
          }

          if (renderLayer.layout) {
            layerSpec.layout = renderLayer.layout;
          }

          map.addLayer(layerSpec, logicalLayerBottomId);

          if (!renderLayer._skipObserve) {
            featureInteraction.observeLayer(
              renderLayer.layerId,
              renderLayer.priority ?? 0,
            );
          }

          mountedFamilies.push(renderLayer.family);
          mountedLayerIds.push(renderLayer.layerId);

          // Record the type key once per type present in this layer.
          if (
            renderLayer.typeKey &&
            !mountedTypes.includes(renderLayer.typeKey)
          ) {
            mountedTypes.push(renderLayer.typeKey);
          }
        }

        logicalLayerBottomId = renderLayer.layerId;
      }

      beforeLayerId = logicalLayerBottomId;

      if (onLayerMounted && mountedLayerIds.length > 0) {
        onLayerMounted({
          layerIndex: layerRecord.index,
          mountedFamilies,
          mountedLayerIds,
          mountedTypes,
        });
      }

      if (layerRecord.fitBounds && !layerRecord.hasFitBounds) {
        fitBoundsToGeoJSON(map, layerRecord.data);
        layerRecord.hasFitBounds = true;
      }
    }

    hasMountedLayers = true;
  }

  /**
   * Remove a single Waymark-owned layer if it is still present.
   *
   * @param {string} layerId
   */
  function safeRemoveLayer(layerId) {
    if (typeof map.getLayer !== "function" || !map.getLayer(layerId)) {
      return;
    }

    try {
      map.removeLayer(layerId);
    } catch {
      // The style may have been swapped underneath us; ignore.
    }
  }

  /**
   * Remove a single Waymark-owned source if it is still present.
   *
   * @param {string} sourceId
   */
  function safeRemoveSource(sourceId) {
    if (typeof map.getSource !== "function" || !map.getSource(sourceId)) {
      return;
    }

    try {
      map.removeSource(sourceId);
    } catch {
      // Sources may still be in use or already gone; ignore.
    }
  }

  ensureMountHandlers();

  /**
   * Collect every render-plan layer owned by a type (typed family sublayers,
   * icon symbol layers, and hit circles for both). Deriving from the render
   * plan's `typeKey` avoids suffix guessing, which missed icon hit circles
   * (`…-circle-hit-<key>`) because they carry no `-type-` segment.
   *
   * @param {string} [typeKey] — when omitted, collects all typed layers
   * @returns {string[]}
   */
  function collectTypeLayerIds(typeKey) {
    const ids = [];

    for (const layerRecord of layerRecords) {
      for (const renderLayer of layerRecord.renderPlan) {
        if (!renderLayer.typeKey) {
          continue;
        }

        if (typeKey === undefined || renderLayer.typeKey === typeKey) {
          ids.push(renderLayer.layerId);
        }
      }
    }

    return ids;
  }

  return {
    map,
    layers: layerRecords,
    featureInteraction,
    /**
     * Set visibility for every layer owned by a type key — typed family
     * sublayers, icon symbol layers, and their hit circles.
     *
     * @param {string} typeKey
     * @param {boolean} visible
     */
    setTypeVisibility(typeKey, visible) {
      const visibility = visible ? "visible" : "none";

      for (const layerId of collectTypeLayerIds(typeKey)) {
        if (typeof map.getLayer !== "function" || !map.getLayer(layerId)) {
          continue;
        }

        try {
          map.setLayoutProperty(layerId, "visibility", visibility);
        } catch {
          // Layer may not exist yet; ignore
        }
      }
    },
    /**
     * Get all typed layer IDs.
     * @returns {string[]}
     */
    getTypeLayerIds() {
      return collectTypeLayerIds();
    },
    /**
     * Fit the map to encompass all currently loaded data layers.
     * @param {{ padding?: number }} [options]
     */
    fitBoundsToAll(options = {}) {
      const padding = options.padding ?? 20;
      let combinedBounds = null;

      for (const layerRecord of layerRecords) {
        if (!layerRecord.data) continue;
        const bounds = computeGeoJSONBounds(layerRecord.data);
        if (!bounds) continue;

        if (combinedBounds === null) {
          combinedBounds = bounds;
        } else {
          combinedBounds.extend(bounds);
        }
      }

      if (combinedBounds) {
        map.fitBounds(combinedBounds, { padding });
      }
    },
    addLayer(layer, options = {}) {
      const nextIndex = layerRecords.length;
      const baseLayerId = `waymark-${instanceToken}-geojson-layer-${nextIndex}`;
      const layerRecord = {
        index: nextIndex,
        sourceId: `waymark-${instanceToken}-geojson-source-${nextIndex}`,
        layerId: baseLayerId,
        type: layer.type,
        data: layer.data,
        paint: layer.paint ?? null,
        fitBounds: options.fitBounds !== false,
        hasFitBounds: false,
        renderPlan: createRenderPlan(
          layer.data,
          baseLayerId,
          nextIndex,
          types,
          instancePaint,
          layer.paint ?? null,
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
      featureInteraction.destroy();

      if (attachedLoadHandler) {
        map.off("load", attachedLoadHandler);
        attachedLoadHandler = null;
      }

      if (attachedStyleLoadHandler) {
        map.off("style.load", attachedStyleLoadHandler);
        attachedStyleLoadHandler = null;
      }

      // Remove Waymark-owned layers (top-first) then sources.
      for (const layerRecord of layerRecords) {
        for (const renderLayer of [...layerRecord.renderPlan].reverse()) {
          safeRemoveLayer(renderLayer.layerId);
        }
      }

      for (const layerRecord of layerRecords) {
        safeRemoveSource(layerRecord.sourceId);
      }
    },
  };
}
