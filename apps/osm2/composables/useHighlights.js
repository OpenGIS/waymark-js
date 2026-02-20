import { watch, shallowRef } from "https://esm.sh/vue@3";

const LAYER_PREFIX = "osm2-hl-";
const ICON_PREFIX = "osm2-icon-";
const ICON_SIZE = 32;

/** Render an emoji string to a canvas ImageData and register it with the map. */
function ensureEmojiImage(map, queryId, emoji) {
  const imgId = `${ICON_PREFIX}${queryId}`;
  if (map.hasImage(imgId)) return imgId;

  const ratio = window.devicePixelRatio || 1;
  const size = ICON_SIZE * ratio;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.font = `${size * 0.8}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2);

  const data = ctx.getImageData(0, 0, size, size);
  map.addImage(imgId, data, { pixelRatio: ratio });
  return imgId;
}

/** Remove a previously registered emoji image. */
function removeEmojiImage(map, queryId) {
  const imgId = `${ICON_PREFIX}${queryId}`;
  if (map.hasImage(imgId)) map.removeImage(imgId);
}

// Geometry types present in common OpenMapTiles source layers
const LINE_LAYERS = new Set([
  "transportation", "waterway", "boundary", "aeroway", "transportation_name",
]);
const POINT_LAYERS = new Set([
  "poi", "place", "aerodrome_label", "water_name",
]);
const POLYGON_LAYERS = new Set([
  "building", "landuse", "landcover", "water", "park",
]);

function conditionToExpression(cond) {
  const { key, operator, value } = cond;
  switch (operator) {
    case "equals":
      return ["==", ["get", key], value];
    case "not-equals":
      return ["!=", ["get", key], value];
    case "contains":
      // MapLibre "in" checks if a value is in a string
      return ["in", value, ["coalesce", ["get", key], ""]];
    case "regex":
      // No native regex in MapLibre expressions — use "has" as broad filter,
      // results composable will post-filter with JS regex
      return ["has", key];
    case "exists":
      return ["has", key];
    case "in-list":
      // MapLibre "match" expression requires an exact match from a list of strings
      // usage: ["match", input, [values], true, false]
      return ["match", ["get", key], value.split(",").map(s => s.trim()), true, false];
    default:
      return null;
  }
}

function buildFilter(query) {
  const exprs = query.conditions
    .filter((c) => c.key)
    .map(conditionToExpression)
    .filter(Boolean);

  if (exprs.length === 0) return null;
  if (exprs.length === 1) return exprs[0];
  return query.combinator === "OR" ? ["any", ...exprs] : ["all", ...exprs];
}

// Map from source layers to their name-bearing counterparts
const NAME_SOURCE_MAP = {};

function layerTypesForSource(sourceLayer) {
  const types = [];
  if (LINE_LAYERS.has(sourceLayer)) {
    types.push("line");
    // Always add label capability for lines (for names on trails)
    types.push("label");
  }
  if (POINT_LAYERS.has(sourceLayer)) types.push("circle", "symbol");
  if (POLYGON_LAYERS.has(sourceLayer)) types.push("fill", "line");
  // Add label layer for source layers that have a name counterpart
  if (NAME_SOURCE_MAP[sourceLayer]) types.push("label");
  // Fallback: add line + circle if unknown
  if (types.length === 0) types.push("line", "circle");
  return [...new Set(types)];
}

function layerId(queryId, type) {
  return `${LAYER_PREFIX}${queryId}-${type}`;
}

function paintForType(type, colour, lineWidth = 3, lineDash = null) {
  switch (type) {
    case "line":
      const paint = {
        "line-color": colour,
        "line-width": lineWidth,
        "line-opacity": 0.85,
      };
      if (lineDash) {
        paint["line-dasharray"] = lineDash;
      }
      return paint;
    case "fill":
      return { "fill-color": colour, "fill-opacity": 0.25 };
    case "circle":
      return {
        "circle-radius": 7,
        "circle-color": colour,
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9,
      };
    case "label":
    case "symbol":
      return {
        "text-color": colour,
        "text-halo-color": "#fff",
        "text-halo-width": 1.5,
      };
    default:
      return {};
  }
}

function layoutForType(type, icon, iconImageId) {
  if (type === "label") {
    return {
      "symbol-placement": "line",
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-offset": [0, 1.2], // Push text slightly further away from the line
      "text-anchor": "top", // Anchor top of text to the line offset (appears "under" or "next to")
      "text-optional": true,
      "text-keep-upright": true,
    };
  }
  if (type === "symbol") {
    if (iconImageId) {
      return {
        "icon-image": iconImageId,
        "icon-size": 1,
        "icon-allow-overlap": true,
        "icon-anchor": "center",
        // Show feature name below the icon
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
      };
    }
    return {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-allow-overlap": false,
      "text-offset": [0, 1.4],
      "text-anchor": "top",
    };
  }
  return {};
}

export function useHighlights(mapRef, queries) {
  // Track which layer IDs we've added (internal bookkeeping, not reactive)
  const activeLayers = new Set();
  // Expose layer IDs for results composable
  const highlightLayerIds = shallowRef([]);

  function syncLayers() {
    const map = mapRef.value;
    if (!map) return;

    const desiredLayers = new Map();

    for (const query of queries.value) {
      if (!query.enabled) continue;
      const filter = buildFilter(query);
      if (!filter) continue;

      const types = layerTypesForSource(query.sourceLayer);

      for (const type of types) {
        // Always show circles for point layers (emoji fonts are unreliable)
        // Only add symbol layer if an icon label is wanted
        if (type === "symbol" && !query.icon) continue;

        const id = layerId(query.id, type);
        desiredLayers.set(id, { query, type, filter });
      }
    }

    // Remove layers no longer needed
    for (const id of [...activeLayers]) {
      if (!desiredLayers.has(id)) {
        if (map.getLayer(id)) map.removeLayer(id);
        activeLayers.delete(id);
      }
    }

    // Add or update desired layers
    for (const [id, { query, type, filter }] of desiredLayers) {
      // Register emoji image for symbol layers
      let iconImageId = null;
      if (type === "symbol" && query.icon) {
        iconImageId = ensureEmojiImage(map, query.id, query.icon);
      }

      if (map.getLayer(id)) {
        // Update filter
        map.setFilter(id, filter);
        // Update paint
        const paint = paintForType(type, query.colour, query.lineWidth, query.lineDash);
        for (const [prop, val] of Object.entries(paint)) {
          map.setPaintProperty(id, prop, val);
        }
        // Update layout for symbol or label
        if (type === "symbol" || type === "label") {
          const layout = layoutForType(type, query.icon, iconImageId);
          for (const [prop, val] of Object.entries(layout)) {
            map.setLayoutProperty(id, prop, val);
          }
          // Also apply paint properties for text (color, halo)
          map.setPaintProperty(id, "text-color", query.colour);
          map.setPaintProperty(id, "text-halo-color", "#fff");
          map.setPaintProperty(id, "text-halo-width", 1.5);
        }
      } else {
        // Label layers are symbol type on the name source layer
        const mlType = type === "label" ? "symbol" : type;
        const sourceLayer = type === "label"
          ? NAME_SOURCE_MAP[query.sourceLayer] || query.sourceLayer
          : query.sourceLayer;

        // Add new layer
        const layerDef = {
          id,
          type: mlType,
          source: "openmaptiles",
          "source-layer": sourceLayer,
          filter,
          paint: paintForType(type, query.colour, query.lineWidth, query.lineDash),
          layout: layoutForType(type, query.icon, iconImageId),
        };
        // POI data only available at zoom ≥ 11
        if (POINT_LAYERS.has(query.sourceLayer)) {
          layerDef.minzoom = 11;
        }
        // Symbol and label layers use text-color with halo
        if (type === "symbol" || type === "label") {
          layerDef.paint = {
            "text-color": query.colour,
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
          };
          // If this is a label layer (names on lines), ensure we have a fallback if transportation_name fails
          // For now, we rely on the filter working on the name layer. 
        }
        
        // Special Case: If user wants "name labels" on trails, we might need to force a symbol layer 
        // on the SAME source layer if the tags are there.
        // OMT often puts names on 'transportation' layer too.
        if (type === "label" && query.sourceLayer === "transportation") {
             // Let's try to add a label layer targeting 'transportation' directly as well if the first one fails?
             // Actually, simplest change: Just force the source-layer to remain 'transportation' for labels 
             // IF the user is querying transportation. OMT v3.14+ often has names on transportation features.
             // But let's check NAME_SOURCE_MAP usage.
             // If we remove the NAME_SOURCE_MAP redirection, we might get labels working for lines that have names.
             
             // EXPERIMENT: Check if we can just use the original layer for labels if it has a name property.
             // But existing code redirects to transportation_name.
        }

        map.addLayer(layerDef);
        activeLayers.add(id);
      }
    }


    highlightLayerIds.value = [...desiredLayers.keys()];
  }

  // Watch queries deeply and re-sync
  watch(queries, syncLayers, { deep: true });

  // Also sync when map ref becomes available
  watch(mapRef, (map) => {
    if (map) syncLayers();
  });

  // Public: force refresh (e.g. after map style reload)
  function refresh() {
    const map = mapRef.value;
    if (map) {
      for (const id of activeLayers) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
    }
    activeLayers.clear();
    syncLayers();
  }

  return { highlightLayerIds, syncLayers, refresh };
}

export { buildFilter, conditionToExpression };
