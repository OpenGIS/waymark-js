import { resolveConfig } from "../config/resolveConfig.js";
import { createGeoJSONModule } from "../geojson/createGeoJSONModule.js";
import {
  normaliseDataLayer,
  serialiseInstanceDocument,
} from "../document/instanceDocument.js";
import { isValidTypeKey } from "../utils/typeUtils.js";
import { createInstanceState } from "./state/createInstanceState.js";
import {
  deleteCoreByMap,
  getCoreByMap,
  setCoreByMap,
} from "./runtimeRegistry.js";
import {
  createInstanceEvents,
  WAYMARK_ALL_EVENTS,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_DATA_LAYER_ADDED_EVENT,
  WAYMARK_DATA_LAYER_MOUNTED_EVENT,
  WAYMARK_DATA_LAYER_ERROR_EVENT,
} from "./createInstanceEvents.js";

/**
 * @typedef {import('maplibre-gl').Map} WaymarkMap
 */

/**
 * @typedef {import('../config/resolveConfig.js').WaymarkResolvedConfig} WaymarkResolvedConfig
 */

/**
 * @typedef {import('../document/instanceDocument.js').WaymarkInstanceDocument} WaymarkInstanceDocument
 */

/**
 * @typedef {object} WaymarkInstancePublicApi
 * @property {string} id
 * @property {() => WaymarkInstanceDocument} toJSON
 * @property {{ addLayer: (layer: { type?: 'geojson', data: object }, options?: { fitBounds?: boolean }) => void, fitBounds: (options?: { padding?: number }) => void }} data
 * @property {{ setEnabled: (enabled: boolean) => void }} debug
 * @property {{
 *   setVisibility: (typeKey: string, visible: boolean) => { previous: boolean, next: boolean } | null,
 *   getVisibility: (typeKey: string) => boolean,
 *   getAll: () => Record<string, { title: string, visible: boolean }>,
 *   resetVisibility: () => void
 * }} types
 * @property {() => void} destroy
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void} on
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void} off
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void} once
 */

/**
 * @typedef {object} WaymarkInstanceCore
 * @property {string} id
 * @property {WaymarkMap} map
 * @property {WaymarkResolvedConfig & { paint?: unknown, types?: unknown }} config
 * @property {ReturnType<typeof createInstanceState>} runtimeState
 * @property {{ debug: boolean, types: Record<string, unknown> | null }} baseline
 * @property {WaymarkInstancePublicApi | null} publicApi
 * @property {{ container: HTMLElement, emit: (type: string, detail: object) => void, on: Function, off: Function, once: Function }} events
 * @property {{ toJSON: () => WaymarkInstanceDocument } | null} instanceDocument
 * @property {{ geoJSON: { layers: Array<{ sourceId: string, layerId: string, type: 'geojson', data: object }>, addLayer: Function, setTypeVisibility: Function, fitBoundsToAll: Function, featureInteraction: object, destroy: Function }, debug: { destroy: Function } }} modules
 * @property {{ types: { setVisibility: Function, resetVisibility: Function } }} commands
 * @property {{ phase: 'ready' | 'destroyed', destroy: () => void }} lifecycle
 */

/**
 * Generate a random namespacing token for a Waymark instance.
 *
 * @returns {string}
 */
function createRandomToken() {
  return `waymark-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {string} id
 */
function createLifecycleDetail(id) {
  return { id };
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {unknown} layer
 * @param {{ fitBounds?: boolean }} [options]
 */
function addCoreDataLayer(core, layer, options) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  const nextLayerIndex = core.modules.geoJSON.layers.length;
  let normalisedLayer;

  try {
    normalisedLayer = normaliseDataLayer(layer, nextLayerIndex);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to validate data layer.";

    core.events.emit(WAYMARK_DATA_LAYER_ERROR_EVENT, {
      id: core.id,
      stage: "validation",
      message,
    });

    throw error;
  }

  try {
    core.modules.geoJSON.addLayer(normalisedLayer, options);

    core.events.emit(WAYMARK_DATA_LAYER_ADDED_EVENT, {
      id: core.id,
      layer: normalisedLayer,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to add data layer at runtime.";

    core.events.emit(WAYMARK_DATA_LAYER_ERROR_EVENT, {
      id: core.id,
      stage: "runtime",
      message,
    });

    throw error;
  }
}

/**
 * @param {WaymarkInstanceCore} core
 */
function destroyCore(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  core.lifecycle.phase = "destroyed";
  core.events.emit(
    WAYMARK_INSTANCE_DESTROYED_EVENT,
    createLifecycleDetail(core.id),
  );

  core.modules.geoJSON.destroy();
  core.modules.debug.destroy();

  // The consumer owns the map: never call map.remove() and never touch the
  // container. We only release Waymark-owned registry state.
  deleteCoreByMap(core.map);
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {boolean} initialEnabled
 */
function createDebugModule(core, initialEnabled) {
  /** @type {Array<{ eventType: string, handler: (event: CustomEvent) => void }>} */
  const handlers = [];

  function enable() {
    if (handlers.length > 0) {
      return;
    }

    for (const eventType of WAYMARK_ALL_EVENTS) {
      const handler = (/** @type {CustomEvent} */ event) => {
        console.log(`[waymark:debug] ${core.id} ${event.type}`);
      };

      core.events.on(eventType, handler);
      handlers.push({ eventType, handler });
    }
  }

  function disable() {
    for (const { eventType, handler } of handlers) {
      core.events.off(eventType, handler);
    }

    handlers.length = 0;
  }

  if (initialEnabled) {
    enable();
  }

  const unsubscribe = core.runtimeState.subscribe((detail) => {
    if (detail.scope !== "debug") {
      return;
    }

    if (detail.next) {
      enable();
    } else {
      disable();
    }
  });

  return {
    destroy() {
      disable();
      unsubscribe();
    },
  };
}

/**
 * @param {WaymarkMap} map
 * @param {WaymarkInstanceDocument} instanceDocument
 * @returns {{ publicApi: WaymarkInstancePublicApi, core: WaymarkInstanceCore }}
 */
export function createInstanceCore(map, instanceDocument) {
  if (getCoreByMap(map)) {
    throw new Error(
      "This map already has a Waymark instance. Call destroy() on the existing instance before creating another.",
    );
  }

  const token = instanceDocument.config.id ?? createRandomToken();
  const resolvedConfig = resolveConfig(instanceDocument.config);
  const configTypes = instanceDocument.config.types ?? null;
  const configPaint = instanceDocument.config.paint ?? null;
  const stateTypes = instanceDocument.state.types ?? null;
  const initialDebug = instanceDocument.state.debug ?? resolvedConfig.debug;

  const events = createInstanceEvents(map.getContainer());

  /** @type {WaymarkInstanceCore | null} */
  let core = null;

  const geoJSONModule = createGeoJSONModule(
    map,
    token,
    instanceDocument.data.layers,
    {
      onLayerMounted: ({
        layerIndex,
        mountedFamilies,
        mountedLayerIds,
        mountedTypes,
      }) => {
        events.emit(WAYMARK_DATA_LAYER_MOUNTED_EVENT, {
          id: token,
          layerIndex,
          mountedFamilies,
          mountedLayerIds,
          mountedTypes,
        });

        // Replay type visibility after mount (handles style reload)
        if (mountedTypes.length > 0 && stateTypes) {
          for (const typeKey of mountedTypes) {
            const typeState = stateTypes[typeKey];
            if (typeState && typeState.visible === false) {
              geoJSONModule.setTypeVisibility(typeKey, false);
            }
          }
        }
      },
      types: configTypes ?? undefined,
      instancePaint: configPaint ?? undefined,
      onFeatureEvent: (type, detail) => {
        events.emit(type, detail);
      },
    },
  );

  const runtimeState = createInstanceState({
    id: token,
    events,
    initialState: {
      debug: initialDebug,
      ...(stateTypes && Object.keys(stateTypes).length > 0
        ? { types: structuredClone(stateTypes) }
        : {}),
    },
  });

  core = {
    id: token,
    map,
    config: {
      ...resolvedConfig,
      ...(configPaint ? { paint: configPaint } : {}),
      ...(configTypes ? { types: configTypes } : {}),
    },
    runtimeState,
    baseline: {
      debug: resolvedConfig.debug,
      types: configTypes ? structuredClone(configTypes) : null,
    },
    publicApi: null,
    events,
    instanceDocument: null,
    modules: {
      geoJSON: geoJSONModule,
      debug: {
        destroy() {},
      },
    },
    commands: {
      types: {
        setVisibility(typeKey, visible) {
          if (core.lifecycle.phase === "destroyed") {
            return null;
          }

          if (!configTypes || !configTypes[typeKey]) {
            return null;
          }

          const before =
            core.runtimeState.getSnapshot().types[typeKey]?.visible ?? true;

          const changed = core.runtimeState.dispatch(
            "types.visibility.set",
            { typeKey, visible },
            "runtime:types.setVisibility",
          );

          if (changed) {
            // Apply to map sublayers
            core.modules.geoJSON.setTypeVisibility(typeKey, visible);
          }

          return { previous: before, next: visible };
        },
        resetVisibility() {
          if (core.lifecycle.phase === "destroyed") {
            return;
          }

          const snapshot = core.runtimeState.getSnapshot();
          const hiddenTypes = Object.keys(snapshot.types);

          if (hiddenTypes.length === 0) {
            return;
          }

          core.runtimeState.dispatch(
            "types.visibility.reset",
            {},
            "runtime:types.resetVisibility",
          );

          // Show all hidden types
          for (const typeKey of hiddenTypes) {
            core.modules.geoJSON.setTypeVisibility(typeKey, true);
          }
        },
      },
    },
    lifecycle: {
      phase: "ready",
      destroy: () => destroyCore(core),
    },
  };

  core.modules.debug = createDebugModule(core, initialDebug);

  // Subscribe to type visibility state changes to apply to map
  runtimeState.subscribe((detail) => {
    if (detail.scope !== "types.visibility") {
      return;
    }

    if (core.lifecycle.phase === "destroyed") {
      return;
    }

    if (detail.command === "types.visibility.set") {
      const typeKey = detail.meta?.typeKey;
      if (typeof typeKey === "string") {
        core.modules.geoJSON.setTypeVisibility(typeKey, detail.next);
      }
    } else if (detail.command === "types.visibility.reset") {
      // All types are now visible — handled in the command above
    }
  });

  core.instanceDocument = {
    toJSON: () => {
      const runtimeStateSnapshot = core.runtimeState.getSnapshot();

      const serialisedConfig = {
        id: core.id,
        debug: core.baseline.debug,
      };

      // Include config.paint if defined
      if (core.config.paint) {
        serialisedConfig.paint = core.config.paint;
      }

      // Include config.types if defined
      if (core.config.types) {
        serialisedConfig.types = core.config.types;
      }

      /** @type {Record<string, unknown>} */
      const serialisedState = {};

      if (runtimeStateSnapshot.debug !== core.baseline.debug) {
        serialisedState.debug = runtimeStateSnapshot.debug;
      }

      // Include state.types delta (only non-visible types)
      const typesDelta = runtimeStateSnapshot.types;
      if (typesDelta && Object.keys(typesDelta).length > 0) {
        serialisedState.types = structuredClone(typesDelta);
      }

      return serialiseInstanceDocument({
        config: serialisedConfig,
        state: serialisedState,
        data: {
          layers: core.modules.geoJSON.layers.map((layer) => {
            const serialisedLayer = {
              type: layer.type,
              data: layer.data,
            };

            if (layer.paint) {
              serialisedLayer.paint = structuredClone(layer.paint);
            }

            return serialisedLayer;
          }),
        },
      });
    },
  };

  core.publicApi = {
    id: token,
    toJSON: () => core.instanceDocument.toJSON(),
    data: {
      addLayer: (layer, options) => addCoreDataLayer(core, layer, options),
      fitBounds: (options) => core.modules.geoJSON.fitBoundsToAll(options),
    },
    debug: {
      setEnabled: (enabled) => {
        core.runtimeState.dispatch(
          "debug.set",
          { enabled },
          "public:debug.setEnabled",
        );
      },
    },
    types: {
      setVisibility: (typeKey, visible) => {
        return core.commands.types.setVisibility(typeKey, visible);
      },
      getVisibility: (typeKey) => {
        if (!isValidTypeKey(typeKey)) {
          return true;
        }

        const snapshot = core.runtimeState.getSnapshot();
        const typeState = snapshot.types[typeKey];
        return typeState ? typeState.visible !== false : true;
      },
      getAll: () => {
        const snapshot = core.runtimeState.getSnapshot();
        const result = {};

        if (core.baseline.types) {
          for (const [typeKey, typeDef] of Object.entries(
            core.baseline.types,
          )) {
            const typeState = snapshot.types[typeKey];
            result[typeKey] = {
              title: typeDef.title || typeKey,
              visible: typeState ? typeState.visible !== false : true,
            };
          }
        }

        return result;
      },
      resetVisibility: () => {
        core.commands.types.resetVisibility();
      },
    },
    destroy: () => core.lifecycle.destroy(),
    on: (type, handler, options) => {
      core.events.on(type, handler, options);
    },
    off: (type, handler, options) => {
      core.events.off(type, handler, options);
    },
    once: (type, handler, options) => {
      core.events.once(type, handler, options);
    },
  };

  setCoreByMap(map, core);
  core.events.emit(
    WAYMARK_INSTANCE_CREATED_EVENT,
    createLifecycleDetail(core.id),
  );

  return {
    publicApi: core.publicApi,
    core,
  };
}
