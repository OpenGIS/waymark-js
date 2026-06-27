import { resolveConfig } from "../config/resolveConfig.js";
import { defaultCameraOptions } from "../config/defaults.js";
import { createGeoJSONModule } from "../geojson/createGeoJSONModule.js";
import { ensureContainer } from "../map/ensureContainer.js";
import { createMap } from "../map/createMap.js";
import { createRasterBasemapModule } from "../map/createRasterBasemapModule.js";
import { createAppShell } from "../ui/createAppShell.js";
import { PANEL_IDS } from "../ui/controls/internalControls.js";
import {
  normaliseDataLayer,
  normaliseMode,
  serialiseInstanceDocument,
} from "../document/instanceDocument.js";
import { createInstanceState } from "./state/createInstanceState.js";
import { deleteCoreById, getCoreById, setCoreById } from "./runtimeRegistry.js";
import {
  createInstanceEvents,
  forwardMapEventsToInstanceContainer,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_DATA_LAYER_ADDED_EVENT,
  WAYMARK_DATA_LAYER_MOUNTED_EVENT,
  WAYMARK_DATA_LAYER_ERROR_EVENT,
  WAYMARK_MAP_BASEMAPS_CHANGED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
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
 * @typedef {object} WaymarkMapCameraOptions
 * @property {[number, number]} center
 * @property {number} zoom
 * @property {number} bearing
 * @property {number} pitch
 */

/**
 * @typedef {object} WaymarkRuntimeVectorBasemap
 * @property {string} basemapId
 * @property {string | object} styleURL
 * @property {string} [title]
 * @property {string} [attributionHTML]
 * @property {number} [maxZoom]
 * @property {number} [opacity]
 */

/**
 * @typedef {object} WaymarkRuntimeRasterBasemap
 * @property {string} basemapId
 * @property {string[]} tileURLTemplates
 * @property {string} [title]
 * @property {string} [attributionHTML]
 * @property {number} [tileSize]
 * @property {number} [minZoom]
 * @property {number} [maxZoom]
 * @property {number} [opacity]
 */

/**
 * @typedef {object} WaymarkInstancePublicApi
 * @property {string} id
 * @property {() => WaymarkInstanceDocument} toJSON
 * @property {{ addLayer: (layer: { type?: 'geojson', data: object }) => void }} data
 * @property {{ setMode: (mode: 'view' | 'debug') => void }} ui
 * @property {() => void} destroy
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void} on
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void} off
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void} once
 */

/**
 * @typedef {object} WaymarkInstanceCore
 * @property {string} id
 * @property {WaymarkMap} map
 * @property {WaymarkResolvedConfig} config
 * @property {ReturnType<typeof createInstanceState>} runtimeState
 * @property {{ map: { options: WaymarkMapCameraOptions, basemaps: { vector: import('../document/instanceDocument.js').WaymarkVectorBasemap[], raster: import('../document/instanceDocument.js').WaymarkRasterBasemap[] } }, ui: { mode: 'view' | 'debug' } }} baseline
 * @property {WaymarkInstancePublicApi} publicApi
 * @property {{ container: HTMLElement, emit: (type: string, detail: import('./createInstanceEvents.js').WaymarkInstanceLifecycleEventDetail | import('./createInstanceEvents.js').WaymarkInstanceMapEventDetail | import('./createInstanceEvents.js').WaymarkInstanceModuleEventDetail | import('./createInstanceEvents.js').WaymarkBasemapsChangedEventDetail | import('./createInstanceEvents.js').WaymarkStateChangedEventDetail | import('./createInstanceEvents.js').WaymarkDataLayerAddedEventDetail | import('./createInstanceEvents.js').WaymarkDataLayerMountedEventDetail | import('./createInstanceEvents.js').WaymarkDataLayerErrorEventDetail) => void, on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void, once: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void }} events
 * @property {{ toJSON: () => WaymarkInstanceDocument }} instanceDocument
 * @property {{ appShell: { app: import('vue').App, mountElement: HTMLElement, refresh: () => void, destroy: () => void } | null, geoJSON: { map: WaymarkMap, layers: { sourceId: string, layerId: string, type: 'geojson', data: object }[], addLayer: (layer: { type: 'geojson', data: object }) => { sourceId: string, layerId: string, type: 'geojson', data: object }, destroy: () => void }, rasterBasemaps: { setRasterOpacity: (basemapId: string, opacity: number) => void, reorderRasterBasemaps: (orderedBasemapIds: string[]) => void, destroy: () => void }, mapEvents: { destroy: () => void }, stateSync: { destroy: () => void }, basemapStateSync: { destroy: () => void } }} modules
 * @property {{ basemaps: { setRasterOpacity: (basemapId: string, opacity: number) => void, reorderRasterBasemaps: (orderedBasemapIds: string[]) => void, setActiveVectorBasemap: (basemapId: string) => void }, ui: { toggleDebugOutputPanel: () => void, toggleBasemapsPanel: () => void } }} commands
 * @property {{ phase: 'ready' | 'destroyed', destroy: () => void }} lifecycle
 */

const MAP_END_EVENTS = ["load", "moveend", "zoomend", "rotateend", "pitchend"];
const CAMERA_OPTION_KEYS = ["center", "zoom", "bearing", "pitch"];

/**
 * @param {WaymarkMap} map
 * @returns {WaymarkMapCameraOptions}
 */
function readMapCameraState(map) {
  const center = map.getCenter();

  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

/**
 * @param {WaymarkMapCameraOptions['center']} center
 */
function cloneCenter(center) {
  return [center[0], center[1]];
}

/**
 * @param {import('../document/instanceDocument.js').WaymarkRasterBasemap[]} rasterBasemaps
 */
function cloneRasterBasemaps(rasterBasemaps) {
  return rasterBasemaps.map((rasterBasemap) => ({
    ...rasterBasemap,
    tileURLTemplates: [...rasterBasemap.tileURLTemplates],
  }));
}

/**
 * @param {import('../document/instanceDocument.js').WaymarkVectorBasemap[]} vectorBasemaps
 */
function cloneVectorBasemaps(vectorBasemaps) {
  return vectorBasemaps.map((vectorBasemap) => ({
    ...vectorBasemap,
  }));
}

/**
 * @param {{ raster: import('../document/instanceDocument.js').WaymarkRasterBasemap[], vector: import('../document/instanceDocument.js').WaymarkVectorBasemap[] }} basemaps
 */
function cloneBasemapConfig(basemaps) {
  return {
    raster: cloneRasterBasemaps(basemaps.raster),
    vector: cloneVectorBasemaps(basemaps.vector),
  };
}

/**
 * @param {string} id
 */
function createLifecycleDetail(id) {
  return { id };
}

/**
 * @param {string} id
 * @param {string} module
 * @param {string} event
 * @param {unknown} previous
 * @param {unknown} next
 * @param {string} source
 */
function createModuleEventDetail(id, module, event, previous, next, source) {
  return {
    id,
    module,
    event,
    previous,
    next,
    source,
  };
}

/**
 * @param {number} index
 */
function createRuntimeRasterBasemapId(index) {
  return `raster-${index}`;
}

/**
 * @param {number} index
 */
function createRuntimeVectorBasemapId(index) {
  return `vector-${index}`;
}

/**
 * @param {import('../document/instanceDocument.js').WaymarkVectorBasemap[]} vectorBasemaps
 * @returns {WaymarkRuntimeVectorBasemap[]}
 */
function createRuntimeVectorBasemaps(vectorBasemaps) {
  return vectorBasemaps.map((vectorBasemap, index) => ({
    basemapId: createRuntimeVectorBasemapId(index),
    ...vectorBasemap,
  }));
}

/**
 * @param {import('../document/instanceDocument.js').WaymarkRasterBasemap[]} rasterBasemaps
 * @returns {WaymarkRuntimeRasterBasemap[]}
 */
function createRuntimeRasterBasemaps(rasterBasemaps) {
  return rasterBasemaps.map((rasterBasemap, index) => ({
    basemapId: createRuntimeRasterBasemapId(index),
    ...rasterBasemap,
  }));
}

/**
 * @param {WaymarkRuntimeRasterBasemap[]} rasterBasemaps
 */
function serialiseRuntimeRasterBasemaps(rasterBasemaps) {
  return rasterBasemaps.map(({ basemapId: _basemapId, ...rasterBasemap }) => {
    return {
      ...rasterBasemap,
      tileURLTemplates: [...rasterBasemap.tileURLTemplates],
    };
  });
}

/**
 * @param {WaymarkRuntimeVectorBasemap[]} vectorBasemaps
 */
function serialiseRuntimeVectorBasemaps(vectorBasemaps) {
  return vectorBasemaps.map(({ basemapId: _basemapId, ...vectorBasemap }) => ({
    ...vectorBasemap,
  }));
}

/**
 * @param {WaymarkRuntimeVectorBasemap[]} vectorBasemaps
 */
function snapshotRuntimeVectorBasemaps(vectorBasemaps) {
  return vectorBasemaps.map((vectorBasemap) => ({
    ...vectorBasemap,
  }));
}

/**
 * @param {WaymarkRuntimeRasterBasemap[]} rasterBasemaps
 */
function snapshotRuntimeRasterBasemaps(rasterBasemaps) {
  return rasterBasemaps.map((rasterBasemap) => ({
    ...rasterBasemap,
    tileURLTemplates: [...rasterBasemap.tileURLTemplates],
  }));
}

/**
 * @param {WaymarkInstanceCore} core
 */
function createBasemapSnapshot(core) {
  const basemaps = core.runtimeState.getSnapshot().map.basemaps;

  return {
    vector: snapshotRuntimeVectorBasemaps(basemaps.vector),
    raster: snapshotRuntimeRasterBasemaps(basemaps.raster),
  };
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {import('./createInstanceEvents.js').WaymarkBasemapsMutationType} mutation
 * @param {{ basemapIds: string[], opacity?: Record<string, number>, orderedBasemapIds?: string[] }} changed
 */
function emitCoreBasemapsChanged(core, mutation, changed) {
  core.events.emit(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, {
    id: core.id,
    mutation,
    changed,
    basemaps: createBasemapSnapshot(core),
  });
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {string | null} panelId
 * @param {unknown} panelContext
 * @param {string} source
 */
function setCorePanelState(core, panelId, panelContext, source) {
  core.runtimeState.dispatch(
    "ui.activePanel.set",
    {
      activePanel: panelId,
    },
    source,
  );

  core.runtimeState.dispatch(
    "ui.panelContext.set",
    {
      panelContext,
    },
    source,
  );
}

/**
 * @param {WaymarkInstanceCore} core
 */
function openCoreBasemapsPanel(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  setCorePanelState(
    core,
    PANEL_IDS.basemaps,
    {
      source: "internal:basemaps-control",
    },
    "runtime:ui.openBasemapsPanel",
  );
}

/**
 * @param {WaymarkInstanceCore} core
 */
function closeCoreBasemapsPanel(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  if (core.runtimeState.getSnapshot().ui.activePanel !== PANEL_IDS.basemaps) {
    return;
  }

  setCorePanelState(core, null, null, "runtime:ui.closeBasemapsPanel");
}

/**
 * @param {WaymarkInstanceCore} core
 */
function toggleCoreBasemapsPanel(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  if (core.runtimeState.getSnapshot().ui.activePanel === PANEL_IDS.basemaps) {
    closeCoreBasemapsPanel(core);
    return;
  }

  openCoreBasemapsPanel(core);
}

/**
 * @param {WaymarkInstanceCore} core
 */
function toggleCoreDebugOutputPanel(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  if (core.runtimeState.getSnapshot().ui.mode !== "debug") {
    return;
  }

  if (
    core.runtimeState.getSnapshot().ui.activePanel === PANEL_IDS.debugOutput
  ) {
    setCorePanelState(core, null, null, "runtime:ui.toggleDebugOutputPanel");
    return;
  }

  setCorePanelState(
    core,
    PANEL_IDS.debugOutput,
    {
      source: "internal:debug-control",
    },
    "runtime:ui.toggleDebugOutputPanel",
  );
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {'view' | 'debug'} mode
 * @param {string} [source='core:lifecycle']
 */
function setCoreMode(core, mode, source = "core:lifecycle") {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  const nextMode = normaliseMode(mode);
  const previousMode = core.runtimeState.getSnapshot().ui.mode;

  if (previousMode === nextMode) {
    return;
  }

  core.runtimeState.dispatch(
    "ui.mode.set",
    {
      mode: nextMode,
    },
    source,
  );

  const runtimeSnapshot = core.runtimeState.getSnapshot();

  if (
    nextMode !== "debug" &&
    runtimeSnapshot.ui.activePanel === PANEL_IDS.debugOutput
  ) {
    setCorePanelState(core, null, null, `${source}:mode-exit-debug`);
  }

  if (
    previousMode !== "debug" &&
    nextMode === "debug" &&
    runtimeSnapshot.ui.activePanel === null
  ) {
    setCorePanelState(
      core,
      PANEL_IDS.debugOutput,
      {
        source: "internal:mode-default",
      },
      `${source}:mode-default-panel`,
    );
  }

  core.events.emit(
    WAYMARK_UI_MODE_CHANGED_EVENT,
    createModuleEventDetail(
      core.id,
      "ui",
      "mode.changed",
      previousMode,
      nextMode,
      source,
    ),
  );
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {unknown} layer
 */
function addCoreDataLayer(core, layer) {
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
    core.modules.geoJSON.addLayer(normalisedLayer);

    if (core.modules.appShell) {
      core.modules.appShell.refresh();
    }

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
 * @param {string} command
 * @param {unknown} payload
 * @param {string} source
 */
function dispatchBasemapCommand(core, command, payload, source) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  core.runtimeState.dispatch(command, payload, source);
}

/**
 * @param {{
 *   core: WaymarkInstanceCore,
 *   map: WaymarkMap,
 * }} options
 */
function createBasemapStateSyncModule(options) {
  const { core, map } = options;
  const unsubscribe = core.runtimeState.subscribe((detail) => {
    if (detail.scope !== "map.basemaps") {
      return;
    }

    if (core.lifecycle.phase === "destroyed") {
      return;
    }

    const basemaps = detail.snapshot?.map?.basemaps;

    if (!basemaps || typeof basemaps !== "object") {
      return;
    }

    if (detail.command === "map.basemaps.raster.opacity.set") {
      const basemapId = detail.meta?.changed?.basemapIds?.[0];
      const opacity = detail.meta?.changed?.opacity?.[basemapId];

      if (typeof basemapId === "string" && typeof opacity === "number") {
        core.modules.rasterBasemaps.setRasterOpacity(basemapId, opacity);
      }
    }

    if (detail.command === "map.basemaps.raster.reorder") {
      const orderedBasemapIds = detail.meta?.changed?.orderedBasemapIds;

      if (Array.isArray(orderedBasemapIds)) {
        core.modules.rasterBasemaps.reorderRasterBasemaps(orderedBasemapIds);
      }
    }

    if (
      detail.command === "map.basemaps.vector.active.set" &&
      typeof map.setStyle === "function"
    ) {
      const activeVectorBasemap = basemaps.vector[0];

      if (activeVectorBasemap?.styleURL !== undefined) {
        map.setStyle(activeVectorBasemap.styleURL);
      }
    }

    if (detail.meta?.mutation && detail.meta?.changed) {
      emitCoreBasemapsChanged(core, detail.meta.mutation, detail.meta.changed);
    }
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}

/**
 * @param {{
 *   core: WaymarkInstanceCore,
 *   map: WaymarkMap,
 * }} options
 */
function createStateSyncModule(options) {
  const { core, map } = options;
  const listeners = [];

  for (const mapEvent of MAP_END_EVENTS) {
    const handler = () => {
      core.runtimeState.dispatch(
        "map.camera.set",
        readMapCameraState(map),
        `runtime:map.${mapEvent}`,
      );
    };
    map.on(mapEvent, handler);
    listeners.push([mapEvent, handler]);
  }

  return {
    destroy() {
      for (const [mapEvent, handler] of listeners) {
        map.off(mapEvent, handler);
      }
    },
  };
}

/**
 * @param {import('../document/instanceDocument.js').WaymarkInstanceDocumentStateMapOptions | undefined} mapOptions
 */
function toMapCameraOverrides(mapOptions) {
  const overrides = {};

  const source = mapOptions ?? {};

  for (const key of CAMERA_OPTION_KEYS) {
    if (Object.hasOwn(source, key)) {
      overrides[key] = source[key];
    }
  }

  return overrides;
}

/**
 * @param {{ vector: import('../document/instanceDocument.js').WaymarkVectorBasemap[], raster: import('../document/instanceDocument.js').WaymarkRasterBasemap[] }} basemaps
 */
function serialiseBasemapsForConfig(basemaps) {
  const serialised = {};

  if (basemaps.raster.length > 0) {
    serialised.raster = cloneRasterBasemaps(basemaps.raster);
  }

  if (basemaps.vector.length > 0) {
    serialised.vector = cloneVectorBasemaps(basemaps.vector);
  }

  return serialised;
}

/**
 * @param {unknown} value
 */
function isEqualSerializable(value, otherValue) {
  return JSON.stringify(value) === JSON.stringify(otherValue);
}

/**
 * @param {WaymarkMapCameraOptions} baseline
 * @param {WaymarkMapCameraOptions} current
 */
function createMapOptionsDelta(baseline, current) {
  const delta = {};

  for (const key of CAMERA_OPTION_KEYS) {
    if (!isEqualSerializable(current[key], baseline[key])) {
      delta[key] = key === "center" ? cloneCenter(current[key]) : current[key];
    }
  }

  return delta;
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {{ map: { basemaps: { vector: WaymarkRuntimeVectorBasemap[], raster: WaymarkRuntimeRasterBasemap[] } } }} runtimeStateSnapshot
 */
function createMapBasemapStateDelta(core, runtimeStateSnapshot) {
  const runtimeBasemaps = runtimeStateSnapshot.map.basemaps;
  const current = {
    raster: serialiseRuntimeRasterBasemaps(runtimeBasemaps.raster),
    vector: serialiseRuntimeVectorBasemaps(runtimeBasemaps.vector),
  };

  const baseline = core.baseline.map.basemaps;
  const delta = {};

  if (!isEqualSerializable(current.raster, baseline.raster)) {
    delta.raster = current.raster;
  }

  if (!isEqualSerializable(current.vector, baseline.vector)) {
    delta.vector = current.vector;
  }

  return delta;
}

/**
 * @param {WaymarkResolvedConfig} resolvedConfig
 */
function createBaselineMapOptions(resolvedConfig) {
  const overrides = toMapCameraOverrides(resolvedConfig.map.options);

  return {
    ...defaultCameraOptions,
    ...overrides,
    center: Array.isArray(overrides.center)
      ? [overrides.center[0], overrides.center[1]]
      : cloneCenter(defaultCameraOptions.center),
  };
}

/**
 * @param {WaymarkResolvedConfig} resolvedConfig
 * @param {WaymarkInstanceDocument} instanceDocument
 */
function createInitialBasemapConfig(resolvedConfig, instanceDocument) {
  const stateBasemaps = instanceDocument.state.map?.basemaps;

  return {
    raster: Array.isArray(stateBasemaps?.raster)
      ? cloneRasterBasemaps(stateBasemaps.raster)
      : cloneRasterBasemaps(resolvedConfig.map.basemaps.raster),
    vector: Array.isArray(stateBasemaps?.vector)
      ? cloneVectorBasemaps(stateBasemaps.vector)
      : cloneVectorBasemaps(resolvedConfig.map.basemaps.vector),
  };
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
  core.modules.rasterBasemaps.destroy();
  core.modules.mapEvents.destroy();
  core.modules.stateSync.destroy();
  core.modules.basemapStateSync.destroy();

  if (core.modules.appShell) {
    core.modules.appShell.destroy();
    core.modules.appShell.app.unmount();
    core.modules.appShell.mountElement.remove();
  }

  core.map.remove();
  deleteCoreById(core.id);
}

/**
 * @param {WaymarkInstanceDocument} instanceDocument
 * @returns {{ publicApi: WaymarkInstancePublicApi, core: WaymarkInstanceCore }}
 */
export function createInstanceCore(instanceDocument) {
  const containerId = ensureContainer(instanceDocument.config.id);
  const existingCore = getCoreById(containerId);

  if (existingCore) {
    existingCore.events.emit(WAYMARK_INSTANCE_RECREATED_EVENT, {
      id: existingCore.id,
    });
    existingCore.lifecycle.destroy();
  }

  const { id: _containerIdFromConfig, ...configOverrides } =
    instanceDocument.config;
  const resolvedConfig = resolveConfig(configOverrides);
  const baselineMapOptions = createBaselineMapOptions(resolvedConfig);
  const initialMapOptions = {
    ...resolvedConfig.map.options,
    ...toMapCameraOverrides(instanceDocument.state.map?.options),
  };
  const initialBasemapConfig = createInitialBasemapConfig(
    resolvedConfig,
    instanceDocument,
  );
  const initialRuntimeBasemaps = {
    vector: createRuntimeVectorBasemaps(initialBasemapConfig.vector),
    raster: createRuntimeRasterBasemaps(initialBasemapConfig.raster),
  };
  const initialMode = normaliseMode(
    instanceDocument.state.ui?.mode ?? resolvedConfig.ui.mode,
  );

  const events = createInstanceEvents(containerId);
  const map = createMap(containerId, {
    ...resolvedConfig,
    map: {
      ...resolvedConfig.map,
      options: initialMapOptions,
      basemaps: initialBasemapConfig,
    },
    ui: {
      ...resolvedConfig.ui,
      mode: initialMode,
    },
  });
  /** @type {WaymarkInstanceCore | null} */
  let core = null;
  const rasterBasemapModule = createRasterBasemapModule(
    map,
    containerId,
    initialRuntimeBasemaps.raster,
  );
  const geoJSONModule = createGeoJSONModule(
    map,
    containerId,
    instanceDocument.data.layers,
    {
      onLayerMounted: ({ layerIndex, mountedFamilies, mountedLayerIds }) => {
        events.emit(WAYMARK_DATA_LAYER_MOUNTED_EVENT, {
          id: containerId,
          layerIndex,
          mountedFamilies,
          mountedLayerIds,
        });
      },
    },
  );
  const initialMapCameraState = readMapCameraState(map);
  const runtimeState = createInstanceState({
    id: containerId,
    events,
    initialState: {
      map: {
        camera: initialMapCameraState,
        basemaps: {
          vector: snapshotRuntimeVectorBasemaps(initialRuntimeBasemaps.vector),
          raster: snapshotRuntimeRasterBasemaps(initialRuntimeBasemaps.raster),
        },
      },
      ui: {
        mode: initialMode,
        activePanel: initialMode === "debug" ? PANEL_IDS.debugOutput : null,
        panelContext:
          initialMode === "debug"
            ? {
                source: "internal:mode-default",
              }
            : null,
      },
    },
  });
  const appShell = createAppShell(containerId, {
    events,
    getInstanceDocument: () => core?.instanceDocument?.toJSON() ?? null,
    getRuntimeStateSnapshot: () => runtimeState.getSnapshot(),
    subscribeRuntimeState: (listener) => runtimeState.subscribe(listener),
    onSetRasterOpacity: (basemapId, opacity) => {
      core?.commands.basemaps.setRasterOpacity(basemapId, opacity);
    },
    onReorderRasterBasemaps: (orderedBasemapIds) => {
      core?.commands.basemaps.reorderRasterBasemaps(orderedBasemapIds);
    },
    onSetActiveVectorBasemap: (basemapId) => {
      core?.commands.basemaps.setActiveVectorBasemap(basemapId);
    },
    onToggleDebugOutputPanel: () => {
      core?.commands.ui.toggleDebugOutputPanel();
    },
    onToggleBasemapsPanel: () => {
      core?.commands.ui.toggleBasemapsPanel();
    },
  });

  core = {
    id: containerId,
    map,
    config: resolvedConfig,
    runtimeState,
    baseline: {
      map: {
        options: baselineMapOptions,
        basemaps: cloneBasemapConfig(resolvedConfig.map.basemaps),
      },
      ui: {
        mode: resolvedConfig.ui.mode,
      },
    },
    publicApi: null,
    events,
    instanceDocument: null,
    modules: {
      appShell,
      geoJSON: geoJSONModule,
      rasterBasemaps: rasterBasemapModule,
      mapEvents: {
        destroy() {},
      },
      stateSync: {
        destroy() {},
      },
      basemapStateSync: {
        destroy() {},
      },
    },
    commands: {
      basemaps: {
        setRasterOpacity: () => {},
        reorderRasterBasemaps: () => {},
        setActiveVectorBasemap: () => {},
      },
      ui: {
        toggleDebugOutputPanel: () => {},
        toggleBasemapsPanel: () => {},
      },
    },
    lifecycle: {
      phase: "ready",
      destroy: () => destroyCore(core),
    },
  };

  core.modules.stateSync = createStateSyncModule({
    core,
    map: core.map,
  });
  core.modules.basemapStateSync = createBasemapStateSyncModule({
    core,
    map: core.map,
  });
  core.modules.mapEvents = forwardMapEventsToInstanceContainer({
    id: containerId,
    map: core.map,
    events: core.events,
  });
  core.commands.basemaps.setRasterOpacity = (basemapId, opacity) => {
    dispatchBasemapCommand(
      core,
      "map.basemaps.raster.opacity.set",
      {
        basemapId,
        opacity,
      },
      "runtime:basemaps.setRasterOpacity",
    );
  };
  core.commands.basemaps.reorderRasterBasemaps = (orderedBasemapIds) => {
    dispatchBasemapCommand(
      core,
      "map.basemaps.raster.reorder",
      {
        orderedBasemapIds,
      },
      "runtime:basemaps.reorderRasterBasemaps",
    );
  };
  core.commands.basemaps.setActiveVectorBasemap = (basemapId) => {
    dispatchBasemapCommand(
      core,
      "map.basemaps.vector.active.set",
      {
        basemapId,
      },
      "runtime:basemaps.setActiveVectorBasemap",
    );
  };
  core.commands.ui.toggleDebugOutputPanel = () => {
    toggleCoreDebugOutputPanel(core);
  };
  core.commands.ui.toggleBasemapsPanel = () => {
    toggleCoreBasemapsPanel(core);
  };

  core.instanceDocument = {
    toJSON: () => {
      const runtimeStateSnapshot = core.runtimeState.getSnapshot();
      const mapOptionsDelta = createMapOptionsDelta(
        core.baseline.map.options,
        runtimeStateSnapshot.map.camera,
      );
      const basemapDelta = createMapBasemapStateDelta(
        core,
        runtimeStateSnapshot,
      );

      return serialiseInstanceDocument({
        config: {
          id: core.id,
          map: {
            options: {
              ...core.config.map.options,
            },
            ...(() => {
              const serialisedBasemaps = serialiseBasemapsForConfig(
                core.baseline.map.basemaps,
              );

              return Object.keys(serialisedBasemaps).length > 0
                ? { basemaps: serialisedBasemaps }
                : {};
            })(),
          },
          ui: {
            mode: core.baseline.ui.mode,
          },
        },
        state: {
          ...(() => {
            const mapState = {
              ...(Object.keys(mapOptionsDelta).length > 0
                ? { options: mapOptionsDelta }
                : {}),
              ...(Object.keys(basemapDelta).length > 0
                ? { basemaps: basemapDelta }
                : {}),
            };

            return Object.keys(mapState).length > 0 ? { map: mapState } : {};
          })(),
          ...(runtimeStateSnapshot.ui.mode !== core.baseline.ui.mode
            ? {
                ui: {
                  mode: runtimeStateSnapshot.ui.mode,
                },
              }
            : {}),
        },
        data: {
          layers: core.modules.geoJSON.layers.map((layer) => ({
            type: layer.type,
            data: layer.data,
          })),
        },
      });
    },
  };

  if (core.modules.appShell) {
    core.modules.appShell.refresh();
  }

  core.publicApi = {
    id: containerId,
    toJSON: () => core.instanceDocument.toJSON(),
    data: {
      addLayer: (layer) => addCoreDataLayer(core, layer),
    },
    ui: {
      setMode: (mode) => setCoreMode(core, mode, "public:ui.setMode"),
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

  setCoreById(containerId, core);
  core.events.emit(
    WAYMARK_INSTANCE_CREATED_EVENT,
    createLifecycleDetail(core.id),
  );

  return {
    publicApi: core.publicApi,
    core,
  };
}
