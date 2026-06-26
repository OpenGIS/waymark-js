import { normaliseMode } from "../../document/instanceDocument.js";
import {
  WAYMARK_STATE_CHANGED_EVENT,
  WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
  WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT,
  WAYMARK_STATE_UI_MODE_CHANGED_EVENT,
  WAYMARK_STATE_UI_PANEL_CHANGED_EVENT,
} from "../createInstanceEvents.js";

/**
 * @typedef {import('../createInstanceEvents.js').WaymarkStateChangedEventDetail} WaymarkStateChangedEventDetail
 */

/**
 * @typedef {{
 *   map: {
 *     camera: {
 *       center: [number, number],
 *       zoom: number,
 *       bearing: number,
 *       pitch: number,
 *     },
 *     basemaps: {
 *       vector: unknown[],
 *       raster: unknown[],
 *     },
 *   },
 *   ui: {
 *     mode: 'view' | 'debug',
 *     activePanel: string | null,
 *     panelContext: unknown,
 *   },
 * }} WaymarkInstanceRuntimeState
 */

const DEFAULT_STATE = {
  map: {
    camera: {
      center: [0, 0],
      zoom: 2,
      bearing: 0,
      pitch: 0,
    },
    basemaps: {
      vector: [],
      raster: [],
    },
  },
  ui: {
    mode: "view",
    activePanel: null,
    panelContext: null,
  },
};

/**
 * @param {unknown} value
 */
function cloneValue(value) {
  return structuredClone(value);
}

/**
 * @param {unknown} value
 * @param {unknown} otherValue
 */
function isEqualSerializable(value, otherValue) {
  return JSON.stringify(value) === JSON.stringify(otherValue);
}

/**
 * @param {WaymarkInstanceRuntimeState} state
 */
function createStateSnapshot(state) {
  return cloneValue(state);
}

/**
 * @param {{ basemapId?: unknown }} basemap
 */
function hasBasemapId(basemap) {
  return typeof basemap?.basemapId === "string";
}

/**
 * @param {unknown[]} vectorBasemaps
 */
function cloneVectorBasemaps(vectorBasemaps) {
  return vectorBasemaps.map((vectorBasemap) => ({
    ...vectorBasemap,
  }));
}

/**
 * @param {unknown[]} rasterBasemaps
 */
function cloneRasterBasemaps(rasterBasemaps) {
  return rasterBasemaps.map((rasterBasemap) => ({
    ...rasterBasemap,
    tileURLTemplates: Array.isArray(rasterBasemap.tileURLTemplates)
      ? [...rasterBasemap.tileURLTemplates]
      : [],
  }));
}

/**
 * @param {{ vector?: unknown[], raster?: unknown[] }} basemaps
 */
function normaliseBasemaps(basemaps) {
  return {
    vector: Array.isArray(basemaps?.vector)
      ? cloneVectorBasemaps(basemaps.vector)
      : [],
    raster: Array.isArray(basemaps?.raster)
      ? cloneRasterBasemaps(basemaps.raster)
      : [],
  };
}

/**
 * @param {{ center?: [number, number], zoom?: number, bearing?: number, pitch?: number }} payload
 * @param {WaymarkInstanceRuntimeState['map']['camera']} current
 */
function createNextCamera(payload, current) {
  const nextCamera = {
    ...current,
  };

  if (Array.isArray(payload.center) && payload.center.length === 2) {
    nextCamera.center = [payload.center[0], payload.center[1]];
  }

  if (typeof payload.zoom === "number") {
    nextCamera.zoom = payload.zoom;
  }

  if (typeof payload.bearing === "number") {
    nextCamera.bearing = payload.bearing;
  }

  if (typeof payload.pitch === "number") {
    nextCamera.pitch = payload.pitch;
  }

  return nextCamera;
}

/**
 * @param {WaymarkInstanceRuntimeState} state
 * @param {string} command
 * @param {unknown} payload
 */
function resolveMutation(state, command, payload) {
  switch (command) {
    case "ui.mode.set": {
      const previous = state.ui.mode;
      const next = normaliseMode(payload?.mode);

      if (previous === next) {
        return null;
      }

      state.ui.mode = next;

      return {
        scope: "ui.mode",
        eventType: WAYMARK_STATE_UI_MODE_CHANGED_EVENT,
        previous,
        next,
      };
    }
    case "ui.activePanel.set": {
      const previous = state.ui.activePanel;
      const next =
        typeof payload?.activePanel === "string" ? payload.activePanel : null;

      if (previous === next) {
        return null;
      }

      state.ui.activePanel = next;

      return {
        scope: "ui.panel",
        eventType: WAYMARK_STATE_UI_PANEL_CHANGED_EVENT,
        previous,
        next,
      };
    }
    case "ui.panelContext.set": {
      const previous = cloneValue(state.ui.panelContext);
      const next = cloneValue(payload?.panelContext ?? null);

      if (isEqualSerializable(previous, next)) {
        return null;
      }

      state.ui.panelContext = next;

      return {
        scope: "ui.panel",
        eventType: WAYMARK_STATE_UI_PANEL_CHANGED_EVENT,
        previous,
        next,
      };
    }
    case "map.camera.set": {
      const previous = cloneValue(state.map.camera);
      const next = createNextCamera(payload ?? {}, state.map.camera);

      if (isEqualSerializable(previous, next)) {
        return null;
      }

      state.map.camera = next;

      return {
        scope: "map.camera",
        eventType: WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT,
        previous,
        next: cloneValue(next),
      };
    }
    case "map.basemaps.set": {
      const previous = cloneValue(state.map.basemaps);
      const next = normaliseBasemaps(payload);

      if (isEqualSerializable(previous, next)) {
        return null;
      }

      state.map.basemaps = next;

      return {
        scope: "map.basemaps",
        eventType: WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
        previous,
        next: cloneValue(next),
      };
    }
    case "map.basemaps.raster.opacity.set": {
      const basemapId =
        typeof payload?.basemapId === "string" ? payload.basemapId : null;
      const opacity =
        typeof payload?.opacity === "number" ? payload.opacity : null;

      if (!basemapId || opacity === null) {
        return null;
      }

      const basemapIndex = state.map.basemaps.raster.findIndex(
        (rasterBasemap) => rasterBasemap.basemapId === basemapId,
      );

      if (basemapIndex < 0) {
        return null;
      }

      const previous = cloneValue(state.map.basemaps);
      const next = normaliseBasemaps(state.map.basemaps);

      if (next.raster[basemapIndex].opacity === opacity) {
        return null;
      }

      next.raster[basemapIndex] = {
        ...next.raster[basemapIndex],
        opacity,
      };

      state.map.basemaps = next;

      return {
        scope: "map.basemaps",
        eventType: WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
        previous,
        next: cloneValue(next),
        meta: {
          mutation: "opacity_changed",
          changed: {
            basemapIds: [basemapId],
            opacity: {
              [basemapId]: opacity,
            },
          },
        },
      };
    }
    case "map.basemaps.raster.reorder": {
      const currentBasemaps = normaliseBasemaps(state.map.basemaps);
      const currentOrderedIds = currentBasemaps.raster
        .filter((rasterBasemap) => hasBasemapId(rasterBasemap))
        .map((rasterBasemap) => rasterBasemap.basemapId);
      const requestedOrder = Array.isArray(payload?.orderedBasemapIds)
        ? payload.orderedBasemapIds.filter(
            (basemapId) => typeof basemapId === "string",
          )
        : [];

      if (currentOrderedIds.length === 0) {
        return null;
      }

      const basemapLookup = new Map(
        currentBasemaps.raster
          .filter((rasterBasemap) => hasBasemapId(rasterBasemap))
          .map((rasterBasemap) => [rasterBasemap.basemapId, rasterBasemap]),
      );
      const seen = new Set();
      const orderedBasemapIds = requestedOrder
        .filter((basemapId) => {
          if (seen.has(basemapId)) {
            return false;
          }

          seen.add(basemapId);
          return basemapLookup.has(basemapId);
        })
        .concat(currentOrderedIds.filter((basemapId) => !seen.has(basemapId)));

      if (orderedBasemapIds.join("|") === currentOrderedIds.join("|")) {
        return null;
      }

      const previous = cloneValue(state.map.basemaps);
      const next = {
        ...currentBasemaps,
        raster: orderedBasemapIds
          .map((basemapId) => basemapLookup.get(basemapId))
          .filter(Boolean)
          .map((rasterBasemap) => ({
            ...rasterBasemap,
            tileURLTemplates: Array.isArray(rasterBasemap.tileURLTemplates)
              ? [...rasterBasemap.tileURLTemplates]
              : [],
          })),
      };

      state.map.basemaps = next;

      return {
        scope: "map.basemaps",
        eventType: WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
        previous,
        next: cloneValue(next),
        meta: {
          mutation: "reordered",
          changed: {
            basemapIds: [...orderedBasemapIds],
            orderedBasemapIds: [...orderedBasemapIds],
          },
        },
      };
    }
    case "map.basemaps.vector.active.set": {
      const basemapId =
        typeof payload?.basemapId === "string" ? payload.basemapId : null;

      if (!basemapId) {
        return null;
      }

      const currentBasemaps = normaliseBasemaps(state.map.basemaps);

      if (currentBasemaps.vector.length === 0) {
        return null;
      }

      if (currentBasemaps.vector[0]?.basemapId === basemapId) {
        return null;
      }

      const selectedIndex = currentBasemaps.vector.findIndex(
        (vectorBasemap) => vectorBasemap.basemapId === basemapId,
      );

      if (selectedIndex < 0) {
        return null;
      }

      const previous = cloneValue(state.map.basemaps);
      const [selectedBasemap] = currentBasemaps.vector.splice(selectedIndex, 1);
      const next = {
        ...currentBasemaps,
        vector: [selectedBasemap, ...currentBasemaps.vector],
      };

      state.map.basemaps = next;

      return {
        scope: "map.basemaps",
        eventType: WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
        previous,
        next: cloneValue(next),
        meta: {
          mutation: "vector_changed",
          changed: {
            basemapIds: [basemapId],
            orderedBasemapIds: next.vector
              .filter((vectorBasemap) => hasBasemapId(vectorBasemap))
              .map((vectorBasemap) => vectorBasemap.basemapId),
          },
        },
      };
    }
    default:
      return null;
  }
}

/**
 * @param {{
 *   id: string,
 *   events: { emit: (type: string, detail: WaymarkStateChangedEventDetail) => void },
 *   initialState?: Partial<WaymarkInstanceRuntimeState>,
 * }} options
 */
export function createInstanceState(options) {
  const { id, events } = options;
  const state = {
    ...cloneValue(DEFAULT_STATE),
    ...(options.initialState ? cloneValue(options.initialState) : {}),
    map: {
      ...cloneValue(DEFAULT_STATE.map),
      ...(options.initialState?.map
        ? cloneValue(options.initialState.map)
        : {}),
    },
    ui: {
      ...cloneValue(DEFAULT_STATE.ui),
      ...(options.initialState?.ui ? cloneValue(options.initialState.ui) : {}),
    },
  };
  const listeners = new Set();

  return {
    getSnapshot() {
      return createStateSnapshot(state);
    },
    /**
     * @param {string} command
     * @param {unknown} [payload]
     * @param {string} [source='runtime:unknown']
     */
    dispatch(command, payload = {}, source = "runtime:unknown") {
      const mutation = resolveMutation(state, command, payload);

      if (!mutation) {
        return false;
      }

      const detail = {
        id,
        command,
        scope: mutation.scope,
        previous: mutation.previous,
        next: mutation.next,
        ...(mutation.meta ? { meta: mutation.meta } : {}),
        source,
        snapshot: createStateSnapshot(state),
      };

      events.emit(mutation.eventType, detail);
      events.emit(WAYMARK_STATE_CHANGED_EVENT, detail);

      for (const listener of listeners) {
        listener(detail);
      }

      return true;
    },
    /**
     * @param {(detail: WaymarkStateChangedEventDetail) => void} listener
     */
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
