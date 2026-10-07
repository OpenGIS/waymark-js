import {
  WAYMARK_FEATURE_CLICK_EVENT,
  WAYMARK_FEATURE_HOVER_EVENT,
  WAYMARK_FEATURE_LEAVE_EVENT,
} from "../runtime/createInstanceEvents.js";

/**
 * @typedef {import('../runtime/createInstanceEvents.js').WaymarkFeatureEventDetail} WaymarkFeatureEventDetail
 */

/**
 * Resolve a stable identity for a rendered feature so repeated pointer
 * movement within the same feature can be suppressed.
 *
 * MapLibre returns a fresh feature object per query, so reference equality is
 * unreliable. Prefer the source feature id; otherwise fall back to a
 * geometry + properties signature.
 *
 * This runs on the raw MapLibre feature before any normalisation, so hover
 * suppression is unaffected by what gets emitted.
 *
 * @param {import('geojson').Feature} feature
 * @param {string} layerId
 * @returns {string}
 */
function getFeatureKey(feature, layerId) {
  if (feature?.id !== undefined && feature?.id !== null) {
    return `${layerId}::${String(feature.id)}`;
  }

  const geometry = JSON.stringify(feature?.geometry ?? null);
  const properties = JSON.stringify(feature?.properties ?? null);
  return `${layerId}::${geometry}::${properties}`;
}

/**
 * Observe the rendered Waymark layers and translate pointer events into
 * feature interaction events on the instance container.
 *
 * Waymark keeps its layer/priority/hit-circle knowledge; the consumer owns
 * presentation concerns such as overlays, cursor styling, and property filtering.
 *
 * @param {import('maplibre-gl').Map} map
 * @param {{ id: string, emit: (type: string, detail: WaymarkFeatureEventDetail) => void }} options
 */
export function createFeatureInteractionModule(map, options) {
  const { id, emit } = options;

  /** @type {Array<{ layerId: string, priority: number }>} */
  const observedLayers = [];

  /** @type {{ key: string, feature: import('geojson').Feature, layerId: string } | null} */
  let hovered = null;

  let handlersAttached = false;
  let destroyed = false;

  /**
   * @param {string} layerId
   * @returns {number}
   */
  function getLayerPriority(layerId) {
    for (const observed of observedLayers) {
      if (observed.layerId === layerId) {
        return observed.priority;
      }
    }

    return -Infinity;
  }

  /**
   * Query all observed layers at a point and return the highest-priority hit.
   * Ties are broken by MapLibre's render order (first feature wins).
   *
   * @param {import('maplibre-gl').PointLike} point
   * @returns {{ feature: import('geojson').Feature, layerId: string } | null}
   */
  function queryBestFeature(point) {
    if (observedLayers.length === 0) {
      return null;
    }

    if (typeof map.queryRenderedFeatures !== "function") {
      return null;
    }

    const layerIds = observedLayers.map((observed) => observed.layerId);
    const features =
      map.queryRenderedFeatures(point, { layers: layerIds }) ?? [];

    let best = null;
    let bestPriority = -Infinity;

    for (const feature of features) {
      const layerId = feature?.layer?.id;

      if (typeof layerId !== "string") {
        continue;
      }

      const priority = getLayerPriority(layerId);

      if (priority === -Infinity) {
        continue;
      }

      if (priority > bestPriority) {
        bestPriority = priority;
        best = { feature, layerId };
      }
    }

    return best;
  }

  /**
   * Normalise a rendered MapLibre feature into a plain GeoJSON Feature.
   *
   * The raw rendered feature carries presentation internals (`layer`,
   * `source`, `state`, `_vectorTileFeature`, ...) that are not part of the
   * GeoJSON contract. Consumers receive only `{ type, id?, geometry,
   * properties }`, with `id` included only when the rendered feature has one.
   *
   * @param {import('geojson').Feature} feature
   * @returns {import('geojson').Feature}
   */
  function toPlainFeature(feature) {
    /** @type {import('geojson').Feature} */
    const plain = {
      type: "Feature",
      geometry: feature?.geometry ?? null,
      properties: feature?.properties ?? {},
    };

    if (feature?.id !== undefined && feature?.id !== null) {
      plain.id = feature.id;
    }

    return plain;
  }

  /**
   * @param {import('geojson').Feature} feature
   * @param {string} layerId
   * @param {import('maplibre-gl').MapMouseEvent | undefined} event
   * @returns {WaymarkFeatureEventDetail}
   */
  function buildDetail(feature, layerId, event) {
    return {
      id,
      feature: toPlainFeature(feature),
      layerId,
      lngLat: event?.lngLat ?? null,
      originalEvent: event?.originalEvent ?? null,
    };
  }

  /**
   * @param {import('maplibre-gl').MapMouseEvent} event
   */
  function onMapClick(event) {
    if (destroyed) {
      return;
    }

    const hit = queryBestFeature(event.point);

    if (!hit) {
      return;
    }

    emit(
      WAYMARK_FEATURE_CLICK_EVENT,
      buildDetail(hit.feature, hit.layerId, event),
    );
  }

  /**
   * @param {import('maplibre-gl').MapMouseEvent} event
   */
  function onMapMouseMove(event) {
    if (destroyed) {
      return;
    }

    const hit = queryBestFeature(event.point);

    if (!hit) {
      clearHover(event, true);
      return;
    }

    const key = getFeatureKey(hit.feature, hit.layerId);

    if (hovered && hovered.key === key) {
      return;
    }

    if (hovered) {
      emit(
        WAYMARK_FEATURE_LEAVE_EVENT,
        buildDetail(hovered.feature, hovered.layerId, event),
      );
    }

    hovered = { key, feature: hit.feature, layerId: hit.layerId };
    emit(
      WAYMARK_FEATURE_HOVER_EVENT,
      buildDetail(hit.feature, hit.layerId, event),
    );
  }

  /**
   * @param {import('maplibre-gl').MapMouseEvent} event
   */
  function onMapMouseOut(event) {
    if (destroyed) {
      return;
    }

    clearHover(event, true);
  }

  /**
   * Emit a leave event for the currently hovered feature (if any) and clear
   * the hover state.
   *
   * @param {import('maplibre-gl').MapMouseEvent | undefined} event
   * @param {boolean} shouldEmit
   */
  function clearHover(event, shouldEmit) {
    if (!hovered) {
      return;
    }

    if (shouldEmit && !destroyed) {
      emit(
        WAYMARK_FEATURE_LEAVE_EVENT,
        buildDetail(hovered.feature, hovered.layerId, event),
      );
    }

    hovered = null;
  }

  /**
   * Register a layer for interaction with a priority level.
   *
   * When multiple layers overlap at the cursor position, the layer with the
   * highest priority wins. Priority values:
   *   3 — icon symbol layers
   *   2 — invisible hit circles behind icons and points
   *   1 — regular circle layers (tracking points)
   *   0 — line and fill layers
   *
   * @param {string} layerId
   * @param {number} [priority=0]
   */
  function observeLayer(layerId, priority = 0) {
    if (observedLayers.some((observed) => observed.layerId === layerId)) {
      return;
    }

    observedLayers.push({ layerId, priority });
  }

  /**
   * Clear observed layer tracking and hover state (e.g. after a style reload).
   * Map-level handlers registered on the map survive.
   */
  function reset() {
    observedLayers.length = 0;
    hovered = null;
  }

  function ensureHandlers() {
    if (handlersAttached) return;
    handlersAttached = true;
    map.on("click", onMapClick);
    map.on("mousemove", onMapMouseMove);
    map.on("mouseout", onMapMouseOut);
  }

  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;
    hovered = null;
    observedLayers.length = 0;
    handlersAttached = false;
    map.off("click", onMapClick);
    map.off("mousemove", onMapMouseMove);
    map.off("mouseout", onMapMouseOut);
  }

  // Wire up map-level handlers on creation.
  ensureHandlers();

  return {
    observeLayer,
    reset,
    destroy,
  };
}
